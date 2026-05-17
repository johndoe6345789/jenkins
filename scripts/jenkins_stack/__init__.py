"""Shared constants and helpers for the Jenkins CI stack management CLI.

The package is driven by scripts/setup.py (the entrypoint); the subcommands
live in sibling modules: secretgen, recover, doctor, compose, cli.
"""

from __future__ import annotations

import stat
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SSH_COMMENT = "jenkins-agent"
HOME_VOLUME = "jenkins_jenkins_home"
JENKINS_MAGIC = b"::::MAGIC::::"


def write_secret(path: Path, content: str) -> None:
    """Write a secret file with 0600 perms (trailing newline guaranteed)."""
    path.write_text(content if content.endswith("\n") else content + "\n")
    path.chmod(stat.S_IRUSR | stat.S_IWUSR)  # 0600
