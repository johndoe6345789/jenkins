"""The `doctor` subcommand: diagnose why the stack will not start."""

from __future__ import annotations

import argparse
import os
from pathlib import Path

from . import REPO_ROOT
from .compose import compose_capture


def cmd_doctor(a: argparse.Namespace) -> int:
    ok = True

    def check(label: str, good: bool, detail: str = "") -> None:
        nonlocal ok
        ok = ok and good
        print(f"  [{'OK ' if good else 'FAIL'}] {label}"
              + (f" — {detail}" if detail else ""))

    print("secrets/")
    sd = REPO_ROOT / "secrets"
    for f in ("jenkins.env", "nexus.env", "credentials.yaml"):
        check(f"secrets/{f}", (sd / f).is_file())

    print("docker compose")
    cfg = compose_capture("config")
    check("compose config renders", cfg.returncode == 0,
          cfg.stderr.strip().splitlines()[-1] if cfg.returncode else "")

    sock = Path("/var/run/docker.sock")
    if sock.exists():
        gid = sock.stat().st_gid
        want = os.environ.get("DOCKER_GID", "984")
        check("docker.sock GID matches DOCKER_GID",
              str(gid) == str(want), f"socket={gid} DOCKER_GID={want}")

    ps = compose_capture("ps", "--services", "--status", "running")
    running = set(ps.stdout.split()) if ps.returncode == 0 else set()
    allsvc = compose_capture("config", "--services")
    defined = set(allsvc.stdout.split()) if allsvc.returncode == 0 else set()
    for svc in ("jenkins", "nginx", "nexus"):
        if svc in defined:
            check(f"service '{svc}' running", svc in running)
    down = sorted(defined - running)
    if down:
        print(f"  not running: {', '.join(down)}")

    print("OK" if ok else "PROBLEMS FOUND")
    return 0 if ok else 1
