"""install-host-deps: bring a fresh host to parity with docs/host-baseline.json.

Reads the JSON capture and applies each phase idempotently:

    1. Third-party apt sources    keys to /etc/apt/keyrings/, sources files
                                   to /etc/apt/sources.list.d/
    2. apt packages               apt-get install every missing entry from
                                   apt.manual_packages
    3. nvm + node versions        curl install nvm if missing, then
                                   `nvm install` each version in the JSON
    4. claude cli                 curl-pipe install if the binary isn't
                                   present in the captured path
    5. essential pip packages     bcrypt, cryptography, beautifulsoup4 —
                                   the rest of the 278-pkg capture is
                                   stdlib companions
    6. dpkg -i installs           if scrape_url + deb_pattern are present
                                   in the JSON entry (e.g. NoMachine),
                                   bs4-scrape the download page for the
                                   actual .deb URL, fetch it, and run
                                   dpkg -i + apt-get install -f under
                                   DEBIAN_FRONTEND=noninteractive. Entries
                                   without scrape config print manual
                                   instructions.
    7. docker group + verify      usermod -aG docker $USER, then
                                   `sudo docker run --rm hello-world` to
                                   confirm the daemon is reachable

Default is dry-run. Use --apply to execute. sudo prompts will appear for
steps 1, 2, 6, and 7. Re-runs are safe: every phase checks current state
and only acts on missing items. After --apply finishes, log out + back in
(or `newgrp docker`) so the new group membership takes effect for plain
`docker` commands.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

from . import REPO_ROOT

BASELINE_JSON = REPO_ROOT / "docs" / "host-baseline.json"
APT_LIST = REPO_ROOT / "docs" / "host-apt-manual.txt"
ESSENTIAL_PIP = {"bcrypt", "cryptography", "beautifulsoup4"}


# ---------- helpers ----------

def _sudo() -> list[str]:
    return [] if os.geteuid() == 0 else ["sudo"]


def _have_pkg(name: str) -> bool:
    return subprocess.run(
        ["dpkg-query", "-W", "-f", "${Status}", name],
        capture_output=True, text=True,
    ).stdout.strip() == "install ok installed"


def _have_pip(name: str) -> bool:
    return subprocess.run(
        ["python3", "-m", "pip", "show", name],
        capture_output=True,
    ).returncode == 0


def _have_node(version: str) -> bool:
    return (Path.home() / ".nvm" / "versions" / "node" / version / "bin" / "node").exists()


def _nvm_dir() -> Path:
    return Path.home() / ".nvm"


def _exec(cmd: list[str], dry_run: bool) -> int:
    print(f"  $ {' '.join(cmd)}")
    if dry_run:
        return 0
    return subprocess.run(cmd).returncode


def _exec_sh(script: str, dry_run: bool) -> int:
    print(f"  $ bash -c '{script[:80]}{'...' if len(script) > 80 else ''}'")
    if dry_run:
        return 0
    return subprocess.run(["bash", "-c", script]).returncode


# ---------- phases ----------

def phase_apt_sources(data: dict, dry_run: bool) -> int:
    """Each missing third-party source gets its key fetched + sources file
    written. Stock Debian sources are assumed to exist after the installer."""
    sources = [s for s in data["apt"]["sources"] if s["is_third_party"]]
    todo = []
    for s in sources:
        key_path = Path(s["key_path"]) if s["key_path"] else None
        src_file = Path("/etc/apt/sources.list.d") / s["file"]
        if src_file.exists() and (not key_path or key_path.exists()):
            continue
        todo.append(s)

    if not todo:
        print("apt sources: all present")
        return 0

    print(f"apt sources: need to add {len(todo)}")
    failures = 0
    for s in todo:
        key_path = Path(s["key_path"]) if s["key_path"] else None
        src_file = Path("/etc/apt/sources.list.d") / s["file"]

        # 1. fetch key if URL known + key file missing
        if key_path and not key_path.exists():
            if not s["key_url"]:
                print(f"  WARN  {s['file']}: key path {key_path} missing but no key URL "
                      "(bundled with first package install?). Skipping key fetch.")
            else:
                try:
                    print(f"  fetch {s['key_url']} -> {key_path}")
                    if not dry_run:
                        data_bytes = urllib.request.urlopen(s["key_url"], timeout=30).read()
                        if _exec(_sudo() + ["install", "-d", "-m", "0755", str(key_path.parent)], dry_run=False):
                            failures += 1; continue
                        tmp = Path("/tmp") / key_path.name
                        tmp.write_bytes(data_bytes)
                        if _exec(_sudo() + ["install", "-m", "0644", str(tmp), str(key_path)], dry_run=False):
                            failures += 1; continue
                        tmp.unlink(missing_ok=True)
                except (urllib.request.URLError, OSError) as e:
                    print(f"  FAIL  key fetch {s['key_url']}: {e}")
                    failures += 1
                    continue

        # 2. write sources file
        if not src_file.exists():
            if s["file"].endswith(".sources"):
                lines = ["Types: deb",
                         f"URIs: {s['uri']}",
                         f"Suites: {s['suite']}",
                         f"Components: {' '.join(s['components'])}"]
                if s["arch"]:
                    lines.append(f"Architectures: {s['arch']}")
                if s["key_path"]:
                    lines.append(f"Signed-By: {s['key_path']}")
                body = "\n".join(lines) + "\n"
            else:
                opts = []
                if s["arch"]:
                    opts.append(f"arch={s['arch']}")
                if s["key_path"]:
                    opts.append(f"signed-by={s['key_path']}")
                prefix = f"[{' '.join(opts)}] " if opts else ""
                body = f"deb {prefix}{s['uri']} {s['suite']} {' '.join(s['components'])}\n"

            print(f"  write {src_file}")
            if not dry_run:
                tmp = Path("/tmp") / src_file.name
                tmp.write_text(body)
                if _exec(_sudo() + ["install", "-m", "0644", str(tmp), str(src_file)], dry_run=False):
                    failures += 1
                tmp.unlink(missing_ok=True)

    return failures


def phase_apt_packages(data: dict, dry_run: bool, skip_desktop: bool) -> int:
    """Install every missing entry from apt.manual_packages. Optionally drop
    the desktop subset for a headless rebuild."""
    DESKTOP_PREFIXES = ("xfce4", "gnome-")
    DESKTOP_NAMES = {"google-chrome-stable", "terminator", "nomachine", "gparted"}
    pkgs = data["apt"]["manual_packages"]
    if skip_desktop:
        pkgs = [p for p in pkgs
                if not p.startswith(DESKTOP_PREFIXES) and p not in DESKTOP_NAMES]

    missing = [p for p in pkgs if not _have_pkg(p)]
    if not missing:
        print(f"apt packages: all {len(pkgs)} present")
        return 0

    print(f"apt packages: {len(missing)} missing of {len(pkgs)}")
    if _exec(_sudo() + ["apt-get", "update"], dry_run):
        return 1
    return _exec(_sudo() + ["apt-get", "install", "-y", "--no-install-recommends", *missing], dry_run)


def phase_nvm(data: dict, dry_run: bool) -> int:
    nvm = data["non_apt"].get("nvm")
    if not nvm:
        print("nvm: not in baseline, skipping")
        return 0

    failures = 0
    if not _nvm_dir().exists():
        print(f"nvm: installing from {nvm['install_url_hint']}")
        # nvm's install.sh writes to ~/.nvm and edits ~/.bashrc
        script = f"curl -fsSL {nvm['install_url_hint']} | bash"
        if _exec_sh(script, dry_run):
            failures += 1

    missing_versions = [v for v in nvm["node_versions"] if not _have_node(v)]
    if missing_versions:
        print(f"nvm: installing node versions {missing_versions}")
        # Each `nvm install` needs nvm sourced. Source then run sequentially.
        cmds = " && ".join([
            f'export NVM_DIR="$HOME/.nvm"',
            f'. "$NVM_DIR/nvm.sh"',
            *[f'nvm install {v}' for v in missing_versions],
        ])
        if nvm["default_version"]:
            cmds += f' && nvm alias default {nvm["default_version"]}'
        if _exec_sh(cmds, dry_run):
            failures += 1
    else:
        print(f"nvm: all node versions present ({nvm['node_versions']})")

    return failures


def phase_pip(data: dict, dry_run: bool) -> int:
    available = {p["name"] for p in data["non_apt"]["pip_packages"]}
    wanted = ESSENTIAL_PIP & available
    missing = sorted(name for name in wanted if not _have_pip(name))
    if not missing:
        print(f"pip: essentials present ({sorted(wanted)})")
        return 0
    print(f"pip: installing {missing}")
    return _exec(["python3", "-m", "pip", "install", "--break-system-packages", *missing], dry_run)


def phase_claude_cli(data: dict, dry_run: bool) -> int:
    cli = data["non_apt"].get("claude_cli")
    if not cli:
        print("claude cli: not in baseline, skipping")
        return 0
    bin_path = Path(cli["bin_path"])
    if bin_path.exists():
        print(f"claude cli: present at {bin_path}")
        return 0
    print(f"claude cli: installing via `{cli['install_method']}`")
    return _exec_sh(f"curl -fsSL {cli['install_url']} | bash", dry_run)


def phase_docker_setup(data: dict, dry_run: bool) -> int:
    """Two things compose needs to actually work:
        1. the current user is in the `docker` group (avoids sudo for every
           docker command)
        2. the daemon is reachable — verified with `hello-world`

    Group changes don't take effect in the current session, so the verify
    step uses `sudo docker` which works regardless. After --apply, the user
    needs to log out + back in (or `newgrp docker`) before plain `docker ps`
    works as them.
    """
    if not _have_pkg("docker-ce"):
        print("docker: docker-ce not installed — run the apt-packages phase first")
        return 1

    user = os.environ.get("USER") or os.environ.get("LOGNAME") or ""
    if not user or user == "root":
        print("docker: running as root or unknown user — skipping group setup")
    else:
        current_groups = subprocess.run(
            ["id", "-nG", user], capture_output=True, text=True,
        ).stdout.split()
        if "docker" in current_groups:
            print(f"docker: {user} already in docker group")
        else:
            print(f"docker: adding {user} to docker group (log out + back in to apply)")
            if _exec(_sudo() + ["usermod", "-aG", "docker", user], dry_run):
                return 1

    print("docker: hello-world verification (uses sudo so group state doesn't matter)")
    rc = _exec(_sudo() + ["docker", "run", "--rm", "hello-world"], dry_run)
    if rc:
        print("docker: hello-world failed — daemon may not be running")
        print("       try: sudo systemctl enable --now docker")
    return rc


def _scrape_deb_url(scrape_url: str, pattern: str) -> str:
    """Fetch a download page, parse with bs4, return the first <a href> URL
    whose path matches `pattern` (regex against the URL string itself).
    Raises if nothing matches — caller decides whether that's fatal."""
    import re
    from bs4 import BeautifulSoup

    page = urllib.request.urlopen(scrape_url, timeout=30).read()
    soup = BeautifulSoup(page, "html.parser")
    rx = re.compile(pattern)
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if rx.search(href):
            return href
    raise RuntimeError(f"no link matching {pattern!r} on {scrape_url}")


def phase_deb_installs(data: dict, dry_run: bool) -> int:
    """For each dpkg -i entry in the baseline: if it has a scrape_url +
    deb_pattern, fetch the download page, parse with bs4, download the .deb,
    and run dpkg -i + apt-get install -f. Entries without scrape config
    are printed as manual instructions."""
    debs = data["non_apt"]["deb_installs"]
    pending = [d for d in debs if not _have_pkg(d["package"])]
    if not pending:
        print(f"dpkg -i installs: all {len(debs)} present")
        return 0

    failures = 0
    for d in pending:
        name = d["package"]
        scrape_url = d.get("scrape_url")
        deb_pattern = d.get("deb_pattern")

        if not scrape_url or not deb_pattern:
            print(f"  - {name} {d.get('version', '?')}  (manual)")
            if d.get("deb_url_hint"):
                print(f"    download from: {d['deb_url_hint']}")
            print(f"    then: sudo dpkg -i <file>.deb")
            continue

        try:
            url = _scrape_deb_url(scrape_url, deb_pattern)
            print(f"  {name}: scraped {url}")
        except Exception as e:
            print(f"  {name}: scrape FAIL ({e}) — see {d.get('deb_url_hint', scrape_url)}")
            failures += 1
            continue

        tmp = Path("/tmp") / Path(urllib.parse.urlparse(url).path).name
        print(f"  download -> {tmp}")
        if not dry_run:
            try:
                urllib.request.urlretrieve(url, tmp)
            except OSError as e:
                print(f"    FAIL: {e}")
                failures += 1
                continue

        # dpkg -i can leave the system half-installed if deps are missing;
        # apt-get install -f fixes that. Both run with noninteractive
        # frontend so debconf doesn't prompt.
        env_prefix = ["env", "DEBIAN_FRONTEND=noninteractive"]
        if _exec(_sudo() + env_prefix + ["dpkg", "-i", str(tmp)], dry_run):
            if _exec(_sudo() + env_prefix + ["apt-get", "install", "-f", "-y"], dry_run):
                failures += 1

        if not dry_run:
            tmp.unlink(missing_ok=True)

    return failures


# ---------- entrypoint ----------

def cmd_install_host_deps(args: argparse.Namespace) -> int:
    if not BASELINE_JSON.exists():
        print(f"missing {BASELINE_JSON} — run `setup.py inventory-host` first "
              "(typically on the source host, then check the json into git)")
        return 1
    data = json.loads(BASELINE_JSON.read_text())

    if not shutil.which("dpkg-query"):
        print("dpkg-query not found — this script targets Debian/Ubuntu hosts only")
        return 1

    print(f"baseline: schema_version={data['schema_version']} captured_at={data['captured_at']}")
    print(f"mode: {'APPLY' if args.apply else 'DRY-RUN (pass --apply to execute)'}")
    if args.skip_desktop:
        print("filter: skipping desktop packages (xfce4-*, gnome-*, chrome, nomachine, gparted, terminator)")
    print()

    dry = not args.apply
    phases = [
        ("apt sources",      lambda: phase_apt_sources(data, dry)),
        ("apt packages",     lambda: phase_apt_packages(data, dry, args.skip_desktop)),
        ("nvm + node",       lambda: phase_nvm(data, dry)),
        ("claude cli",       lambda: phase_claude_cli(data, dry)),
        ("pip essentials",   lambda: phase_pip(data, dry)),
        ("dpkg -i installs", lambda: phase_deb_installs(data, dry)),
        ("docker group + verify", lambda: phase_docker_setup(data, dry)),
    ]
    failures = 0
    for name, fn in phases:
        print(f"--- {name} ---")
        try:
            rc = fn()
        except Exception as e:
            print(f"  FAIL: {e}")
            rc = 1
        if rc:
            failures += rc
        print()

    if dry:
        print("dry run complete. re-run with --apply to execute.")
    else:
        print(f"install-host-deps: {'OK' if failures == 0 else f'{failures} failure(s)'}")
    return 1 if failures else 0
