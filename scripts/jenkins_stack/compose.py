"""docker compose helpers and the lifecycle subcommands."""

from __future__ import annotations

import argparse
import subprocess

from . import REPO_ROOT


def compose(*args: str, check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(["docker", "compose", *args], cwd=REPO_ROOT, check=check)


def compose_capture(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["docker", "compose", *args],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )


def cmd_lifecycle(a: argparse.Namespace) -> int:
    if a.command == "up":
        extra = (["--build"] if a.build else []) + (
            ["--no-deps"] if a.no_deps else []
        )
        return compose("up", "-d", *extra, *a.services, check=False).returncode
    if a.command == "down":
        return compose("down", check=False).returncode  # never -v: keep volumes
    if a.command == "status":
        return compose("ps", "-a", check=False).returncode
    if a.command == "logs":
        extra = (["-f"] if a.follow else []) + ["--tail", str(a.tail)]
        return compose("logs", *extra, *a.services, check=False).returncode
    # start | stop | restart
    return compose(a.command, *a.services, check=False).returncode
