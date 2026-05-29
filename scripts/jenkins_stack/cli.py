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
from .agent_recover import cmd_recover_agents
from .bootstrap import cmd_bootstrap, cmd_install_host_deps
from .compose import cmd_lifecycle
from .doctor import cmd_doctor
from .host import cmd_inventory_host
from .jobs import cmd_register_jobs
from .recover import cmd_recover_key
from .repos import cmd_clone_repos
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

    ra = sub.add_parser("recover-agents",
                         help="prune Docker disk + reconnect offline agents")
    ra.add_argument("--verbose", action="store_true",
                    help="print docker prune output")
    ra.add_argument("--install-timer", action="store_true",
                    help="install a systemd timer to run this every 30 min "
                         "(requires sudo)")
    ra.set_defaults(func=cmd_recover_agents)

    cr = sub.add_parser("clone-repos",
                        help="git clone sibling app repos listed in sibling_repos.json")
    cr.add_argument("--only", nargs="+", metavar="NAME",
                    help="limit to specific repo names")
    cr.add_argument("--update", action="store_true",
                    help="git pull existing checkouts instead of leaving them alone")
    cr.set_defaults(func=cmd_clone_repos)

    rj = sub.add_parser("register-jobs",
                        help="POST every jobs/*.xml into the running Jenkins")
    rj.add_argument("--only", nargs="+", metavar="NAME",
                    help="limit to specific job names (filename stems)")
    rj.add_argument("--update", action="store_true",
                    help="overwrite config.xml for jobs that already exist")
    rj.add_argument("--wait-timeout", type=int, default=180,
                    help="seconds to poll Jenkins for readiness before failing (default 180)")
    rj.set_defaults(func=cmd_register_jobs)

    bs = sub.add_parser("bootstrap",
                        help="fresh-server-to-running-stack: host check -> clone repos -> "
                             "verify secrets -> up -> register-jobs")
    bs.add_argument("--skip-clone", action="store_true",
                    help="skip the clone-repos step (sibling repos already present)")
    bs.add_argument("--update-jobs", action="store_true",
                    help="pass --update to register-jobs (overwrite existing)")
    bs.add_argument("--continue-on-error", action="store_true",
                    help="proceed past clone-repos failures")
    bs.set_defaults(func=cmd_bootstrap)

    ih = sub.add_parser("inventory-host",
                        help="refresh docs/host-baseline.{json,md} + host-apt-manual.txt "
                             "from the live host state")
    ih.add_argument("--print", action="store_true",
                    help="print to stdout instead of writing files")
    ih.add_argument("--format", choices=("md", "json"), default="md",
                    help="when --print is set, which format (default md)")
    ih.set_defaults(func=cmd_inventory_host)

    ihd = sub.add_parser("install-host-deps",
                         help="(stub) install the apt + non-apt prerequisites listed "
                              "in docs/host-baseline.md")
    ihd.set_defaults(func=cmd_install_host_deps)

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
