"""The `reset-passwords` subcommand: rotate Jenkins UI or nexus-admin passwords
in secrets/ without touching the SSH key or other settings.

Targets map to env-file keys:
  uksodev      -> secrets/jenkins.env  JENKINS_UKSODEV_PASSWORD
  admin        -> secrets/jenkins.env  JENKINS_ADMIN_PASSWORD
  nexus-admin  -> secrets/nexus.env    NEXUS_ADMIN_PASSWORD (legacy; registry has no auth)

JCasC re-applies casc.yaml + credentials.yaml on every Jenkins boot, so a
`docker compose restart jenkins` is sufficient to pick up new passwords.
"""

from __future__ import annotations

import argparse
import secrets as pysecrets
import string
import sys
from pathlib import Path

from . import REPO_ROOT, write_secret
from .compose import compose

TARGETS = ("uksodev", "admin", "nexus-admin")

_KEY_MAP: dict[str, tuple[str, str]] = {
    "uksodev":     ("jenkins.env", "JENKINS_UKSODEV_PASSWORD"),
    "admin":       ("jenkins.env", "JENKINS_ADMIN_PASSWORD"),
    "nexus-admin": ("nexus.env",   "NEXUS_ADMIN_PASSWORD"),
}


def _gen() -> str:
    alpha = string.ascii_letters + string.digits
    return "".join(pysecrets.choice(alpha) for _ in range(32))


def _read_env(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not path.exists():
        return out
    for line in path.read_text().splitlines():
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        k, v = s.split("=", 1)
        out[k] = v
    return out


def _write_env(path: Path, values: dict[str, str]) -> None:
    write_secret(path, "".join(f"{k}={v}\n" for k, v in values.items()))


def cmd_reset_passwords(a: argparse.Namespace) -> int:
    targets: list[str] = a.targets or list(TARGETS)
    if a.password and len(targets) != 1:
        sys.exit("error: --password requires exactly one --targets entry")

    secrets_dir: Path = a.secrets_dir
    needed_files = {_KEY_MAP[t][0] for t in targets}
    for filename in needed_files:
        if not (secrets_dir / filename).exists():
            sys.exit(
                f"error: {secrets_dir / filename} not found — run `secrets` first"
            )

    new_pws: dict[str, str] = {t: (a.password or _gen()) for t in targets}

    updates_by_file: dict[str, dict[str, str]] = {}
    for target, pw in new_pws.items():
        filename, key = _KEY_MAP[target]
        updates_by_file.setdefault(filename, {})[key] = pw

    for filename, updates in updates_by_file.items():
        path = secrets_dir / filename
        env = _read_env(path)
        env.update(updates)
        _write_env(path, env)
        print(f"updated {path}")

    if a.show or not a.password:
        for target, pw in new_pws.items():
            print(f"  {target}: {pw}")

    if a.restart:
        print("restarting jenkins...")
        rc = compose("restart", "jenkins", check=False).returncode
        if rc != 0:
            sys.exit("error: docker compose restart jenkins failed")
        print("restarted — JCasC will re-apply the new password(s) on boot")

    return 0
