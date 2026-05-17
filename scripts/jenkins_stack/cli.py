"""argparse wiring and dispatch for the Jenkins CI stack management CLI.

One entrypoint for the things you actually do to this Compose stack:
generating the gitignored secrets/, recovering the agent SSH key and Nexus
password out of the persisted volumes after a server wipe, diagnosing why
the controller will not start, and the docker compose lifecycle.

Common flows
------------
Diagnose what a server rearchitecture broke:

    scripts/setup.py doctor

Restore after a wipe, reusing the existing agent key (no agent rebuild):

    scripts/setup.py recover-key --out secrets/agent_key
    scripts/setup.py secrets --import-ssh-key secrets/agent_key \\
        --nexus-password "$(scripts/setup.py recover-key --print-nexus-only)"
    scripts/setup.py up

Lifecycle:

    scripts/setup.py status
    scripts/setup.py up [SERVICE ...] [--build]
    scripts/setup.py restart jenkins nginx
    scripts/setup.py logs jenkins --tail 100 -f
    scripts/setup.py stop | start | down
"""

from __future__ import annotations

import argparse
from pathlib import Path

from . import REPO_ROOT
from .compose import cmd_lifecycle
from .doctor import cmd_doctor
from .recover import cmd_recover_key
from .secretgen import cmd_secrets


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="setup.py",
        description="Management CLI for the Jenkins CI stack.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    sub = p.add_subparsers(dest="command", required=True)

    s = sub.add_parser("secrets", help="generate the gitignored secrets/ set")
    s.add_argument("--secrets-dir", type=Path, default=REPO_ROOT / "secrets")
    g = s.add_mutually_exclusive_group(required=True)
    g.add_argument("--import-ssh-key", metavar="FILE", type=Path,
                   help="reuse an existing private key (no agent rebuild)")
    g.add_argument("--rotate-ssh-key", dest="import_ssh_key",
                   action="store_const", const=None,
                   help="mint a NEW keypair (then update compose + rebuild agents)")
    s.add_argument("--uksodev-password", help="default: generate a strong one")
    s.add_argument("--nexus-user", default="admin")
    s.add_argument("--nexus-password", required=True,
                   help="must match the running Nexus admin password")
    s.add_argument("--nexus-registry", default="localhost:5001")
    s.add_argument("--force", action="store_true", help="overwrite existing files")
    s.add_argument("--show", action="store_true", help="print the Jenkins password")
    s.set_defaults(func=cmd_secrets)

    r = sub.add_parser("recover-key",
                        help="decrypt the agent SSH key + Nexus password "
                             "from the persisted jenkins_home volume")
    r.add_argument("--out", type=Path, default=REPO_ROOT / "secrets" / "agent_key")
    r.add_argument("--print-nexus-only", action="store_true",
                   help="print only the recovered Nexus password and exit")
    r.set_defaults(func=cmd_recover_key)

    d = sub.add_parser("doctor", help="diagnose why the stack will not start")
    d.set_defaults(func=cmd_doctor)

    for name, help_ in (
        ("up", "create/start services (controller + nginx) without rebuilding agents"),
        ("down", "remove containers (keeps named volumes)"),
        ("start", "start existing services"),
        ("stop", "stop services"),
        ("restart", "restart services"),
        ("status", "docker compose ps -a"),
        ("logs", "tail service logs"),
    ):
        c = sub.add_parser(name, help=help_)
        if name in ("up", "start", "stop", "restart", "logs"):
            c.add_argument("services", nargs="*", help="limit to these services")
        if name == "up":
            c.add_argument("--build", action="store_true")
            c.add_argument("--no-deps", action="store_true")
        if name == "logs":
            c.add_argument("--tail", type=int, default=120)
            c.add_argument("-f", "--follow", action="store_true")
        c.set_defaults(func=cmd_lifecycle)

    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)
