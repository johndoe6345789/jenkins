"""Reactive agent recovery: prune Docker disk, reconnect offline agents.

Disk-space evictions are the dominant failure mode on the wardcrew.com host.
All 8 agents share the host Docker daemon via /var/run/docker.sock, so one
prune pass on the host clears space for every agent simultaneously.

Typical flow
------------
Manual run (diagnose + recover):

    scripts/setup.py recover-agents

Install a systemd timer so recovery happens automatically every 30 min:

    sudo scripts/setup.py recover-agents --install-timer
"""

from __future__ import annotations

import argparse
import base64
import json
import subprocess
import textwrap
import time
import urllib.error
import urllib.request
from pathlib import Path

from . import REPO_ROOT

JENKINS_URL = "http://localhost:8081"
TIMER_UNIT = "jenkins-agent-recover"


# ── Jenkins helpers ────────────────────────────────────────────────────────


def _jenkins_creds() -> tuple[str, str]:
    for line in (REPO_ROOT / "secrets" / "jenkins.env").read_text().splitlines():
        if line.startswith("JENKINS_UKSODEV_PASSWORD="):
            return "uksodev", line.split("=", 1)[1].strip()
    raise RuntimeError("JENKINS_UKSODEV_PASSWORD not in secrets/jenkins.env")


def _auth_header(user: str, pw: str) -> str:
    return "Basic " + base64.b64encode(f"{user}:{pw}".encode()).decode()


def _get_crumb(user: str, pw: str) -> tuple[str, str, str]:
    """Return (field, value, session_cookie)."""
    req = urllib.request.Request(f"{JENKINS_URL}/crumbIssuer/api/json")
    req.add_header("Authorization", _auth_header(user, pw))
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
        cookie = resp.headers.get("Set-Cookie", "").split(";")[0]
    return data["crumbRequestField"], data["crumb"], cookie


def _offline_agents(user: str, pw: str) -> dict[str, str]:
    """Return {agent_name: offline_cause_description} for offline agents."""
    url = (f"{JENKINS_URL}/computer/api/json"
           f"?tree=computer[displayName,offline,offlineCause[description]]")
    req = urllib.request.Request(url)
    req.add_header("Authorization", _auth_header(user, pw))
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
    return {
        c["displayName"]: (c.get("offlineCause") or {}).get("description", "")
        for c in data["computer"]
        if c["offline"] and c["displayName"] != "Built-In Node"
    }


def _reconnect(agent: str, user: str, pw: str,
               crumb_field: str, crumb_val: str, cookie: str) -> bool:
    url = f"{JENKINS_URL}/computer/{agent}/launchSlaveAgent"
    req = urllib.request.Request(url, data=b"", method="POST")
    req.add_header("Authorization", _auth_header(user, pw))
    req.add_header(crumb_field, crumb_val)
    if cookie:
        req.add_header("Cookie", cookie)
    try:
        with urllib.request.urlopen(req):
            return True
    except urllib.error.HTTPError as exc:
        print(f"  HTTP {exc.code}", flush=True)
        return False


# ── Disk cleanup ───────────────────────────────────────────────────────────


def _prune_host_docker(verbose: bool) -> None:
    """Prune build cache (>24 h old) and dangling images on the host daemon."""
    for cmd in (
        ["docker", "buildx", "prune", "-f", "--filter", "until=24h"],
        ["docker", "image", "prune", "-f"],
    ):
        r = subprocess.run(cmd, capture_output=not verbose)
        if verbose and r.stdout:
            print(r.stdout.decode(), end="")


# ── Systemd timer install ──────────────────────────────────────────────────


def _install_timer() -> int:
    setup = (REPO_ROOT / "scripts" / "setup.py").resolve()
    service = textwrap.dedent(f"""\
        [Unit]
        Description=Jenkins agent auto-recovery (disk + reconnect)
        After=docker.service

        [Service]
        Type=oneshot
        ExecStart={setup} recover-agents
        WorkingDirectory={REPO_ROOT}
    """)
    timer = textwrap.dedent(f"""\
        [Unit]
        Description=Run Jenkins agent recovery every 30 minutes

        [Timer]
        OnCalendar=*:0/30
        Persistent=true

        [Install]
        WantedBy=timers.target
    """)
    base = Path("/etc/systemd/system")
    (base / f"{TIMER_UNIT}.service").write_text(service)
    (base / f"{TIMER_UNIT}.timer").write_text(timer)
    subprocess.run(["systemctl", "daemon-reload"], check=True)
    subprocess.run(["systemctl", "enable", "--now", f"{TIMER_UNIT}.timer"],
                   check=True)
    print(f"Timer {TIMER_UNIT}.timer installed and started (every 30 min).")
    return 0


# ── Subcommand ─────────────────────────────────────────────────────────────


def cmd_recover_agents(a: argparse.Namespace) -> int:
    if a.install_timer:
        return _install_timer()

    try:
        user, pw = _jenkins_creds()
    except Exception as exc:
        print(f"Credentials error: {exc}")
        return 1

    try:
        offline = _offline_agents(user, pw)
    except Exception as exc:
        print(f"Cannot reach Jenkins: {exc}")
        return 1

    if not offline:
        print("All agents online — nothing to do.")
        return 0

    print(f"{len(offline)} offline: {', '.join(offline)}")
    disk_agents = {k: v for k, v in offline.items()
                   if "disk" in v.lower() or "space" in v.lower() or v == ""}

    if disk_agents:
        print("Pruning build cache and dangling images on host …")
        _prune_host_docker(verbose=a.verbose)
        time.sleep(3)

    crumb_field, crumb_val, cookie = _get_crumb(user, pw)
    failed = 0
    for agent in sorted(offline):
        print(f"  reconnecting {agent} … ", end="", flush=True)
        ok = _reconnect(agent, user, pw, crumb_field, crumb_val, cookie)
        print("OK" if ok else "FAIL")
        failed += not ok

    return failed
