"""bootstrap: stitch the existing setup.py subcommands into a single
fresh-server-to-running-stack flow.

Order:
    1. doctor                — confirm docker + python + git on the host
    2. clone-repos           — pull sibling app repos (so deploy jobs can
                                check them out later via their git steps,
                                and so local dev keeps working)
    3. assert secrets present (don't auto-generate — that needs human input
       like the Nexus password; print clear next-step otherwise)
    4. up                    — bring the Jenkins controller + nginx +
                                registry + agents up
    5. register-jobs         — populate every jobs/*.xml into the fresh
                                Jenkins
    6. print next steps      — manual triggers for base-image and apps
                                builds; we don't auto-trigger because a
                                bad bootstrap shouldn't burn cycles
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

from . import REPO_ROOT
from .compose import cmd_lifecycle
from .doctor import cmd_doctor
from .jobs import cmd_register_jobs
from .repos import cmd_clone_repos


def _have(cmd: str) -> bool:
    return shutil.which(cmd) is not None


def _check_host() -> int:
    missing = [c for c in ("docker", "git", "python3") if not _have(c)]
    if missing:
        print(f"missing on host: {', '.join(missing)}")
        print("see docs/host-baseline.md for install steps")
        return 1
    rc = subprocess.run(["docker", "info"], capture_output=True).returncode
    if rc != 0:
        print("docker daemon not reachable for this user")
        print("(maybe `sudo usermod -aG docker $USER` + re-login)")
        return 1
    return 0


def _secrets_ready() -> bool:
    secrets = REPO_ROOT / "secrets"
    needed = ["jenkins.env", "credentials.yaml"]
    return all((secrets / n).exists() for n in needed)


def _print_next_steps() -> None:
    print()
    print("Next steps (manual, intentional — bootstrap does not auto-trigger):")
    print()
    print("  Build the base images (slow):")
    print("    curl -X POST -u uksodev:$PW http://localhost:8081/job/metabuilder-base-images/build")
    print("    curl -X POST -u uksodev:$PW http://localhost:8081/job/businessplanner-base-images/build")
    print("    curl -X POST -u uksodev:$PW http://localhost:8081/job/next_extra_primary-base-images/build")
    print()
    print("  Once those succeed, the *-apps jobs will succeed and *-deploy will auto-trigger.")
    print()


def cmd_bootstrap(args: argparse.Namespace) -> int:
    print("[1/5] checking host prerequisites")
    if _check_host():
        return 1
    print("      ok\n")

    if not args.skip_clone:
        print("[2/5] cloning sibling repos")
        clone_args = argparse.Namespace(only=None, update=False)
        rc = cmd_clone_repos(clone_args)
        if rc != 0 and not args.continue_on_error:
            return rc
    else:
        print("[2/5] skipping clone-repos (--skip-clone)")

    print("\n[3/5] checking secrets/")
    if not _secrets_ready():
        print("      MISSING. Bootstrap will not generate secrets unattended")
        print("      because the Nexus password must match the running")
        print("      instance. Run one of:")
        print()
        print("      # if the jenkins_home volume survived a previous run:")
        print("        setup.py recover-key --out secrets/agent_key")
        print("        setup.py secrets --import-ssh-key secrets/agent_key \\")
        print("                          --nexus-password \"$(setup.py recover-key --print-nexus-only)\"")
        print()
        print("      # fresh install, no prior volume:")
        print("        setup.py secrets --rotate-ssh-key --nexus-password <choose>")
        print()
        return 1
    print("      ok")

    print("\n[4/5] bringing the stack up")
    up_args = argparse.Namespace(command="up", services=[], build=False, no_deps=False)
    rc = cmd_lifecycle(up_args)
    if rc != 0:
        print("      `up` failed; not registering jobs")
        return rc

    print("\n[5/5] registering jobs into Jenkins")
    jobs_args = argparse.Namespace(update=args.update_jobs, only=None, wait_timeout=180)
    rc = cmd_register_jobs(jobs_args)
    if rc != 0:
        return rc

    _print_next_steps()
    return 0


def cmd_install_host_deps(args: argparse.Namespace) -> int:
    """Stub. Reading and applying docs/host-baseline.md programmatically is
    out of scope for this first cut — manual is fine for a one-shot recovery,
    and writing this needs sudo + apt-key + nvm + interactive choices about
    desktop vs headless. Tracked as a follow-up."""
    print("install-host-deps is not implemented yet.")
    print("see docs/host-baseline.md for the manual checklist.")
    return 2
