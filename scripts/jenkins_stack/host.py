"""inventory-host: capture the host's program-and-dependency state so a
fresh Debian box can be brought back to parity. Authoritative output is
JSON; markdown is rendered from it.

    docs/host-baseline.json   — machine-readable source of truth
    docs/host-baseline.md     — rendered from the JSON for humans
    docs/host-apt-manual.txt  — raw `apt-mark showmanual` list

Re-run after every host change. `install-host-deps` (TODO) reads the JSON
and applies it to a fresh host.

The script is read-only: it never modifies installed packages, sources, or
keys. It does *infer* a key download URL for the third-party apt sources we
know about (docker, github-cli) so the install step can fetch them. Unknown
sources land in the JSON as `key_url: null` with a hint.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import subprocess
from pathlib import Path

from . import REPO_ROOT

DOCS = REPO_ROOT / "docs"
BASELINE_JSON = DOCS / "host-baseline.json"
BASELINE_MD = DOCS / "host-baseline.md"
APT_LIST = DOCS / "host-apt-manual.txt"

# Where to fetch each third-party apt key from on a fresh host. None means
# the key arrives bundled with its first package install (e.g. chrome) and
# no separate fetch is needed.
KEY_URLS: dict[str, str | None] = {
    "docker.asc": "https://download.docker.com/linux/debian/gpg",
    "githubcli-archive-keyring.gpg": "https://cli.github.com/packages/githubcli-archive-keyring.gpg",
    "google-chrome.gpg": None,
}


def _run(cmd: list[str]) -> str:
    proc = subprocess.run(cmd, capture_output=True, text=True)
    return proc.stdout.strip()


# ---------- capture ----------

def _os() -> dict:
    return {
        "distro": _run(["lsb_release", "-i", "-s"]) or "unknown",
        "version": _run(["lsb_release", "-r", "-s"]) or "unknown",
        "codename": _run(["lsb_release", "-c", "-s"]) or "unknown",
        "arch": _run(["dpkg", "--print-architecture"]) or "unknown",
        "kernel_package_version": _run(["dpkg-query", "-W", "-f", "${Version}", "linux-image-amd64"]) or "unknown",
    }


def _apt_sources() -> list[dict]:
    """All entries in /etc/apt/sources.list.d/, with our best inference
    about each entry. Stock Debian sources are kept too — recreating them
    is trivial but they're part of the state."""
    out: list[dict] = []
    src_dir = Path("/etc/apt/sources.list.d")
    if not src_dir.exists():
        return out

    for p in sorted(src_dir.iterdir()):
        if not p.is_file():
            continue
        text = p.read_text(errors="replace")
        if not text.strip():
            continue

        uri = ""
        suite = ""
        components: list[str] = []
        arch = ""
        key_path = ""

        if p.suffix == ".sources":
            for line in text.splitlines():
                m = re.match(r"\s*URIs?:\s*(.+)", line)
                if m: uri = m.group(1).strip()
                m = re.match(r"\s*Suites:\s*(.+)", line)
                if m: suite = m.group(1).strip()
                m = re.match(r"\s*Components:\s*(.+)", line)
                if m: components = m.group(1).split()
                m = re.match(r"\s*Architectures:\s*(.+)", line)
                if m: arch = m.group(1).strip()
                m = re.match(r"\s*Signed-By:\s*(.+)", line)
                if m: key_path = m.group(1).strip()
        else:  # .list
            m = re.search(r"^deb\s+(?:\[([^\]]+)\]\s+)?(\S+)\s+(\S+)\s+(.+)$", text, re.MULTILINE)
            if m:
                opts, uri, suite, comp_str = m.groups()
                components = comp_str.split()
                if opts:
                    for kv in opts.split():
                        if "=" not in kv: continue
                        k, v = kv.split("=", 1)
                        if k == "arch": arch = v
                        if k == "signed-by": key_path = v

        is_third_party = "debian.org" not in uri and "debian.mirror" not in uri and uri
        key_url = KEY_URLS.get(Path(key_path).name) if key_path else None

        out.append({
            "file": p.name,
            "uri": uri,
            "suite": suite,
            "components": components,
            "arch": arch or None,
            "key_path": key_path or None,
            "key_url": key_url,
            "is_third_party": bool(is_third_party),
        })
    return out


def _apt_packages() -> list[str]:
    return sorted(_run(["apt-mark", "showmanual"]).splitlines())


def _claude_cli() -> dict | None:
    bin_path = Path.home() / ".local" / "bin" / "claude"
    versions_dir = Path.home() / ".local" / "share" / "claude" / "versions"
    if not bin_path.exists() and not versions_dir.exists():
        return None
    versions = []
    if versions_dir.exists():
        versions = sorted(p.name for p in versions_dir.iterdir())
    return {
        "install_url": "https://claude.ai/install.sh",
        "install_method": "curl -fsSL <install_url> | bash",
        "bin_path": str(bin_path),
        "versions_dir": str(versions_dir),
        "versions": versions,
    }


def _nvm() -> dict | None:
    nvm_dir = Path.home() / ".nvm"
    if not nvm_dir.exists():
        return None
    versions_dir = nvm_dir / "versions" / "node"
    versions = sorted(p.name for p in versions_dir.iterdir() if p.is_dir()) if versions_dir.exists() else []
    default = ""
    alias = nvm_dir / "alias" / "default"
    if alias.exists():
        default = alias.read_text().strip()

    npm_global: list[str] = []
    if versions:
        latest_node = versions_dir / versions[-1] / "bin" / "node"
        if latest_node.exists():
            env = os.environ.copy()
            env["PATH"] = f"{latest_node.parent}:{env.get('PATH', '')}"
            out = subprocess.run(
                ["npm", "-g", "ls", "--depth=0", "--json"],
                env=env, capture_output=True, text=True,
            ).stdout
            try:
                deps = json.loads(out).get("dependencies", {})
                npm_global = sorted(f"{k}@{v.get('version','?')}" for k, v in deps.items())
            except (json.JSONDecodeError, AttributeError):
                npm_global = []

    return {
        "install_url_hint": "https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh",
        "node_versions": versions,
        "default_version": default,
        "global_npm_packages": npm_global,
    }


def _pip_packages() -> list[dict]:
    out = _run(["python3", "-m", "pip", "list", "--format=json", "--disable-pip-version-check"])
    try:
        return [{"name": p["name"], "version": p["version"]} for p in json.loads(out)]
    except (json.JSONDecodeError, KeyError):
        return []


def _deb_installs() -> list[dict]:
    """Packages installed via `dpkg -i` of a stand-alone .deb (not in any
    apt source). Detected by checking dpkg origin against the apt cache."""
    installed = _run(["dpkg-query", "-W", "-f", "${Package}\t${Version}\t${Status}\n"])
    out: list[dict] = []
    # The only well-known one on this stack is nomachine. Generalising to
    # "package not found in any apt source" is doable with apt-cache policy
    # per-package, but slow for 5k packages. Hardcoding the known one keeps
    # this fast and is easy to extend.
    for known in ("nomachine",):
        for line in installed.splitlines():
            parts = line.split("\t")
            if len(parts) >= 2 and parts[0] == known:
                out.append({
                    "package": known,
                    "version": parts[1],
                    "install_method": "dpkg -i <.deb>",
                    "deb_url_hint": "https://www.nomachine.com/download" if known == "nomachine" else None,
                })
                break
    return out


def _user_groups() -> list[str]:
    out = _run(["id", "-nG"])
    return sorted(out.split()) if out else []


def capture() -> dict:
    return {
        "captured_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "captured_on": _run(["hostname"]) or "unknown",
        "schema_version": 1,
        "os": _os(),
        "apt": {
            "sources": _apt_sources(),
            "manual_packages": _apt_packages(),
        },
        "non_apt": {
            "nvm": _nvm(),
            "claude_cli": _claude_cli(),
            "pip_packages": _pip_packages(),
            "deb_installs": _deb_installs(),
        },
        "user_groups": _user_groups(),
    }


# ---------- render ----------

def render_md(data: dict) -> str:
    os_ = data["os"]
    third_party = [s for s in data["apt"]["sources"] if s["is_third_party"]]
    debian = [s for s in data["apt"]["sources"] if not s["is_third_party"]]

    tp_rows = "\n".join(
        f"| `{s['file']}` | `{s['uri']}` | `{s['suite']}` | `{s['key_path'] or '—'}` | "
        f"{('`' + s['key_url'] + '`') if s['key_url'] else '_bundled / manual_'} |"
        for s in third_party
    ) or "| _none_ | | | | |"

    nvm = data["non_apt"]["nvm"]
    if nvm:
        nvm_section = (
            f"- Install via: `{nvm['install_url_hint']}`\n"
            f"- Node versions installed: {', '.join('`' + v + '`' for v in nvm['node_versions']) or '_none_'}\n"
            f"- Default alias: `{nvm['default_version'] or '—'}`\n"
            f"- Global npm packages: "
            + (", ".join('`' + p + '`' for p in nvm['global_npm_packages']) or '_none_')
        )
    else:
        nvm_section = "_nvm not detected._"

    claude = data["non_apt"].get("claude_cli")
    if claude:
        claude_section = (
            f"- Install via: `{claude['install_method']}` (URL: `{claude['install_url']}`)\n"
            f"- Versions present: {', '.join('`' + v + '`' for v in claude['versions']) or '_none_'}\n"
            f"- Binary symlink: `{claude['bin_path']}`"
        )
    else:
        claude_section = "_Claude CLI not detected._"

    pip_lines = "\n".join(
        f"- `{p['name']}=={p['version']}`"
        for p in data["non_apt"]["pip_packages"]
        if p["name"] in {"bcrypt", "cryptography", "jinja2", "requests", "drogon", "PyYAML"}
    ) or "_(none of the tracked packages were found)_"

    deb_lines = "\n".join(
        f"- `{d['package']} {d['version']}` — {d['install_method']}"
        + (f" — download from {d['deb_url_hint']}" if d.get("deb_url_hint") else "")
        for d in data["non_apt"]["deb_installs"]
    ) or "_none detected_"

    groups = ", ".join(f"`{g}`" for g in data["user_groups"]) or "_unknown_"

    return f"""# Host baseline

Auto-generated by `setup.py inventory-host` on {data['captured_at']}
from `{data['captured_on']}`. **Do not hand-edit** — changes here will be
overwritten on the next run. Update `docs/host-baseline.json` instead, then
regenerate this file.

If the box gets nuked, this file plus `docs/host-baseline.json` and
`docs/host-apt-manual.txt` is the data needed to bring a fresh {os_['distro']}
{os_['version']} ({os_['codename']}) host back to parity. The
`install-host-deps` subcommand consumes the JSON directly.

## OS

- **Distribution**: {os_['distro']} {os_['version']} ({os_['codename']})
- **Architecture**: {os_['arch']}
- **Kernel** (`linux-image-amd64`): {os_['kernel_package_version']}
- **User groups**: {groups}

## Third-party apt sources

| File | URI | Suite | Key path | Key URL |
| --- | --- | --- | --- | --- |
{tp_rows}

Stock Debian sources also present: {", ".join('`' + s['file'] + '`' for s in debian) or '_none_'}.

## Manually-installed apt packages

`apt-mark showmanual` returned **{len(data['apt']['manual_packages'])}** entries.
Full list lives in `docs/host-apt-manual.txt` so this file stays readable.
The JSON capture has the same list under `apt.manual_packages`.

## Non-apt installs

### Node.js — nvm

{nvm_section}

### Claude CLI

{claude_section}

### Python pip packages (tracked)

{pip_lines}

The full pip inventory is in the JSON under `non_apt.pip_packages`. This
section only highlights packages the rotator / IaC scripts actually depend
on; the rest are stdlib companions.

### `dpkg -i` installs (no apt source)

{deb_lines}

## Reproduce on a fresh Debian host

```sh
git clone https://github.com/johndoe6345789/jenkins.git && cd jenkins
python3 scripts/setup.py install-host-deps                    # dry-run
python3 scripts/setup.py install-host-deps --apply            # do it (sudo prompts)
# add --skip-desktop for a headless box
sudo usermod -aG docker $USER  # log out + back in
python3 scripts/setup.py bootstrap                            # runs the rest
```

`install-host-deps` applies every section of the JSON: third-party apt
sources + their keys, the full manual apt list, nvm + node versions, the
essential pip packages, and prints the manual `dpkg -i` instructions for
NoMachine (it needs license confirmation, can't automate).
"""


# ---------- argparse entrypoints ----------

def _write_apt_list(manual: list[str]) -> None:
    APT_LIST.write_text("\n".join(manual) + "\n")


def cmd_inventory_host(args: argparse.Namespace) -> int:
    DOCS.mkdir(parents=True, exist_ok=True)
    data = capture()
    md = render_md(data)
    if args.print:
        if args.format == "json":
            print(json.dumps(data, indent=2))
        else:
            print(md)
        return 0

    BASELINE_JSON.write_text(json.dumps(data, indent=2) + "\n")
    BASELINE_MD.write_text(md)
    _write_apt_list(data["apt"]["manual_packages"])
    print(f"wrote {BASELINE_JSON.relative_to(REPO_ROOT)}")
    print(f"wrote {BASELINE_MD.relative_to(REPO_ROOT)}")
    print(f"wrote {APT_LIST.relative_to(REPO_ROOT)} ({len(data['apt']['manual_packages'])} packages)")
    return 0
