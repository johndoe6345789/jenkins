#!/usr/bin/env python3
"""Vault — Flask API for the credential manager UI.

Passwords are stored AES-256-GCM encrypted in secrets/vault.db.
The AES key is derived from the master password (PBKDF2-SHA256,
600k iterations) and kept only in memory, keyed by session token.

Manifest-driven credentials come from scripts/rotator/manifest.json.
Custom user-managed credentials have metadata in secrets/custom.json
and encrypted passwords in vault.db (same credentials table).
"""
from __future__ import annotations

import json
import os
import sqlite3
import stat
import subprocess
import sys
from contextlib import contextmanager
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path
import secrets as pysecrets

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from flask import Flask, g, jsonify, request
from flask_cors import CORS

HERE      = Path(__file__).resolve().parent
REPO_ROOT = Path(os.environ["VAULT_REPO_ROOT"]) \
    if "VAULT_REPO_ROOT" in os.environ \
    else HERE.parents[3]
SCRIPTS     = REPO_ROOT / "scripts"
SECRETS     = REPO_ROOT / "secrets"
MANIFEST    = SCRIPTS / "rotator" / "manifest.json"
CUSTOM_JSON = SECRETS / "custom.json"
ROTATED     = SECRETS / "rotated.env"
VAULT_ENV   = SECRETS / "vault.env"
VAULT_DB    = SECRETS / "vault.db"

app = Flask(__name__)
app.secret_key = pysecrets.token_hex(32)
CORS(app, origins=["http://localhost:3000"])

_token_keys: dict[str, bytes] = {}


# ── database ──────────────────────────────────────────────────────────────────

@contextmanager
def _db():
    con = sqlite3.connect(str(VAULT_DB))
    con.row_factory = sqlite3.Row
    try:
        yield con
    finally:
        con.close()


def _init_db(fresh_salt_hex: str) -> None:
    with _db() as con:
        con.executescript("""
            CREATE TABLE IF NOT EXISTS vault_meta (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS credentials (
                name       TEXT PRIMARY KEY,
                badge      TEXT,
                rotate_url TEXT,
                ciphertext BLOB NOT NULL,
                nonce      BLOB NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)
        con.execute(
            "INSERT OR IGNORE INTO vault_meta VALUES ('kdf_salt', ?)",
            [fresh_salt_hex],
        )
        con.execute(
            "INSERT OR IGNORE INTO vault_meta VALUES ('schema_version', '1')",
        )
        con.commit()


def _meta(key: str) -> str | None:
    with _db() as con:
        row = con.execute(
            "SELECT value FROM vault_meta WHERE key = ?", [key]
        ).fetchone()
        return row["value"] if row else None


# ── crypto ────────────────────────────────────────────────────────────────────

def _derive_key(password: str, salt: bytes) -> bytes:
    return PBKDF2HMAC(
        algorithm=hashes.SHA256(), length=32, salt=salt, iterations=600_000,
    ).derive(password.encode())


def _encrypt(key: bytes, plaintext: str) -> tuple[bytes, bytes]:
    nonce = os.urandom(12)
    return AESGCM(key).encrypt(nonce, plaintext.encode(), None), nonce


def _decrypt(key: bytes, ciphertext: bytes, nonce: bytes) -> str:
    return AESGCM(key).decrypt(nonce, ciphertext, None).decode()


# ── helpers ───────────────────────────────────────────────────────────────────

def _read_env(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    out: dict[str, str] = {}
    for line in path.read_text().splitlines():
        if not line.strip() or line.startswith('#') or '=' not in line:
            continue
        k, v = line.split('=', 1)
        out[k.strip()] = v
    return out


def _read_custom_json() -> list[dict]:
    if not CUSTOM_JSON.exists():
        return []
    return json.loads(CUSTOM_JSON.read_text())


def _write_custom_json(entries: list[dict]) -> None:
    CUSTOM_JSON.write_text(json.dumps(entries, indent=2) + "\n")
    CUSTOM_JSON.chmod(stat.S_IRUSR | stat.S_IWUSR)


# ── bootstrap ─────────────────────────────────────────────────────────────────

def _bootstrap() -> str:
    SECRETS.mkdir(mode=0o700, exist_ok=True)
    env = _read_env(VAULT_ENV)
    if "VAULT_MASTER_PASSWORD" not in env:
        pw = pysecrets.token_urlsafe(24)
        VAULT_ENV.write_text(f"VAULT_MASTER_PASSWORD={pw}\n")
        VAULT_ENV.chmod(stat.S_IRUSR | stat.S_IWUSR)
        print(f"\n[vault] Generated master password: {pw}")
        print(f"[vault] Saved to {VAULT_ENV}\n")
        env["VAULT_MASTER_PASSWORD"] = pw
    _init_db(pysecrets.token_hex(16))
    VAULT_DB.chmod(stat.S_IRUSR | stat.S_IWUSR)
    return env["VAULT_MASTER_PASSWORD"]


VAULT_PW = _bootstrap()


# ── auth ──────────────────────────────────────────────────────────────────────

def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = request.headers.get("X-Vault-Token", "")
        if token not in _token_keys:
            return jsonify({"error": "not authenticated"}), 401
        g.aes_key = _token_keys[token]
        return f(*args, **kwargs)
    return wrapper


@app.post("/api/login")
def login():
    pw = (request.get_json() or {}).get("password", "")
    if pw != VAULT_PW:
        return jsonify({"error": "Invalid password"}), 401
    salt_hex = _meta("kdf_salt")
    if not salt_hex:
        return jsonify({"error": "vault not initialized"}), 500
    aes_key = _derive_key(pw, bytes.fromhex(salt_hex))
    token = pysecrets.token_urlsafe(32)
    _token_keys[token] = aes_key
    return jsonify({"ok": True, "token": token})


@app.post("/api/logout")
@require_auth
def logout():
    _token_keys.pop(request.headers.get("X-Vault-Token", ""), None)
    return jsonify({"ok": True})


# ── credential helpers ────────────────────────────────────────────────────────

def _manifest() -> list[dict]:
    return json.loads(MANIFEST.read_text())["targets"] if MANIFEST.exists() else []


def _read_stored(
    aes_key: bytes,
    name: str,
    fallback_env_key: str = "",
    fallback_env_file: str = "",
) -> str:
    with _db() as con:
        row = con.execute(
            "SELECT ciphertext, nonce FROM credentials WHERE name = ?", [name]
        ).fetchone()
    if row:
        try:
            return _decrypt(aes_key, row["ciphertext"], row["nonce"])
        except Exception:
            pass
    if fallback_env_key:
        pw = _read_env(ROTATED).get(fallback_env_key, "")
        if pw:
            return pw
    if fallback_env_key and fallback_env_file:
        return _read_env(SECRETS / fallback_env_file).get(fallback_env_key, "")
    return ""


def _store(aes_key: bytes, name: str, badge: str, rotate_url: str, pw: str) -> None:
    ct, nonce = _encrypt(aes_key, pw)
    ts = datetime.now(timezone.utc).isoformat()
    with _db() as con:
        con.execute(
            "INSERT OR REPLACE INTO credentials"
            " (name, badge, rotate_url, ciphertext, nonce, updated_at)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            [name, badge, rotate_url, ct, nonce, ts],
        )
        con.commit()


def _credential_from_target(aes_key: bytes, t: dict) -> dict:
    params  = t.get("params", {})
    fb_key  = params.get("env_key") or t["secret_env_key"]
    fb_file = Path(params.get("env_file", "")).name
    badge   = t.get("badge", t["adapter"])
    return {
        "name":         t["name"],
        "service_name": t.get("service_name", t["name"]),
        "username":     t.get("username", ""),
        "badge":        badge,
        "password":     _read_stored(aes_key, t["name"], fb_key, fb_file),
        "rotate_url":   f"/api/rotate/{t['name']}",
        "app_url":      t.get("app_url", ""),
        "repo_path":    t.get("repo_path", ""),
        "group":        t.get("group", ""),
        "source":       "manifest",
    }


def _credential_from_custom(aes_key: bytes, entry: dict) -> dict:
    name = entry["name"]
    return {
        "name":         name,
        "service_name": entry["service_name"],
        "username":     entry["username"],
        "badge":        entry.get("badge", "manual"),
        "password":     _read_stored(aes_key, name),
        "rotate_url":   f"/api/rotate/{name}",
        "app_url":      entry.get("app_url", ""),
        "repo_path":    entry.get("repo_path", ""),
        "group":        entry.get("group", ""),
        "source":       "custom",
    }


def _unique_name(service_name: str, username: str) -> str:
    taken = {t["name"] for t in _manifest()} | {e["name"] for e in _read_custom_json()}
    base  = f"{service_name}-{username}".lower().replace(" ", "-")
    name, n = base, 2
    while name in taken:
        name = f"{base}-{n}"
        n += 1
    return name


# ── API — targets ─────────────────────────────────────────────────────────────

@app.get("/api/targets")
@require_auth
def targets():
    aes_key  = g.aes_key
    sections: dict[str, list] = {}
    for t in _manifest():
        sec = t.get("section", "frontends")
        sections.setdefault(sec, []).append(_credential_from_target(aes_key, t))
    for entry in _read_custom_json():
        sec = entry.get("section", "custom")
        sections.setdefault(sec, []).append(_credential_from_custom(aes_key, entry))
    return jsonify(sections)


# ── API — rotate ──────────────────────────────────────────────────────────────

@app.post("/api/rotate/<target>")
@require_auth
def rotate_target(target: str):
    custom = next((e for e in _read_custom_json() if e["name"] == target), None)
    if custom:
        pw = pysecrets.token_urlsafe(24)
        _store(g.aes_key, target, custom.get("badge", "manual"), f"/api/rotate/{target}", pw)
        return jsonify({"ok": True, "target": target, "password": pw})

    manifest = _manifest()
    entry = next((t for t in manifest if t["name"] == target), None)
    if not entry:
        return jsonify({"error": f"unknown target {target!r}"}), 400
    result = subprocess.run(
        [sys.executable, str(SCRIPTS / "rotator" / "rotate.py"), "rotate", "--only", target],
        capture_output=True, text=True, cwd=REPO_ROOT,
    )
    if result.returncode != 0:
        return jsonify({"error": result.stderr.strip() or result.stdout.strip()}), 500
    params  = entry.get("params", {})
    fb_key  = params.get("env_key") or entry["secret_env_key"]
    fb_file = Path(params.get("env_file", "")).name
    pw = _read_env(ROTATED).get(entry["secret_env_key"], "")
    if not pw and fb_file:
        pw = _read_env(SECRETS / fb_file).get(fb_key, "")
    _store(g.aes_key, target, entry.get("badge", entry["adapter"]), f"/api/rotate/{target}", pw)
    return jsonify({"ok": True, "target": target, "password": pw})


# ── API — custom CRUD ─────────────────────────────────────────────────────────

@app.post("/api/custom")
@require_auth
def create_custom():
    body         = request.get_json() or {}
    service_name = (body.get("service_name") or "").strip()
    username     = (body.get("username") or "").strip()
    if not service_name or not username:
        return jsonify({"error": "service_name and username are required"}), 400

    name    = _unique_name(service_name, username)
    entries = _read_custom_json()
    entries.append({
        "name":         name,
        "section":      body.get("section", "custom"),
        "service_name": service_name,
        "username":     username,
        "badge":        body.get("badge", "manual"),
        "app_url":      body.get("app_url", ""),
        "repo_path":    body.get("repo_path", ""),
        "group":        body.get("group", ""),
    })
    _write_custom_json(entries)

    pw = (body.get("password") or "").strip()
    if pw:
        _store(g.aes_key, name, body.get("badge", "manual"), f"/api/rotate/{name}", pw)
    return jsonify({"ok": True, "name": name}), 201


@app.patch("/api/custom/<name>")
@require_auth
def update_custom(name: str):
    entries = _read_custom_json()
    idx     = next((i for i, e in enumerate(entries) if e["name"] == name), None)
    if idx is None:
        return jsonify({"error": "not found"}), 404
    body = request.get_json() or {}
    e    = entries[idx]
    for field in ("section", "service_name", "username", "badge", "app_url", "repo_path", "group"):
        if field in body:
            e[field] = body[field]
    entries[idx] = e
    _write_custom_json(entries)
    return jsonify({"ok": True})


@app.delete("/api/custom/<name>")
@require_auth
def delete_custom(name: str):
    entries = _read_custom_json()
    before  = len(entries)
    entries = [e for e in entries if e["name"] != name]
    if len(entries) == before:
        return jsonify({"error": "not found"}), 404
    _write_custom_json(entries)
    with _db() as con:
        con.execute("DELETE FROM credentials WHERE name = ?", [name])
        con.commit()
    return jsonify({"ok": True})


@app.put("/api/custom/<name>/password")
@require_auth
def set_custom_password(name: str):
    entry = next((e for e in _read_custom_json() if e["name"] == name), None)
    if not entry:
        return jsonify({"error": "not found"}), 404
    pw = (request.get_json() or {}).get("password", "").strip()
    if not pw:
        return jsonify({"error": "password required"}), 400
    _store(g.aes_key, name, entry.get("badge", "manual"), f"/api/rotate/{name}", pw)
    return jsonify({"ok": True})


# ── API — history ─────────────────────────────────────────────────────────────

@app.get("/api/history")
@require_auth
def history():
    with _db() as con:
        rows = con.execute(
            "SELECT name, badge, updated_at FROM credentials"
            " ORDER BY updated_at DESC LIMIT 50"
        ).fetchall()
    return jsonify([dict(r) for r in rows])


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=True)
