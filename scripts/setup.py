#!/usr/bin/env python3
"""Entrypoint for the Jenkins CI stack management CLI.

The implementation lives in the jenkins_stack package next to this file
(cli, secretgen, recover, doctor, compose modules). This stays a thin
launcher so `scripts/setup.py <subcommand>` keeps working unchanged.

Lives in scripts/ (not the repo root) on purpose: a root-level setup.py
would be picked up by setuptools/pip as a packaging script, which this is not.

Run `scripts/setup.py --help` for the available subcommands and flows.
"""

import sys
from pathlib import Path

# Allow running both as `scripts/setup.py` and `python -m`: ensure the
# directory holding the jenkins_stack package is importable.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from jenkins_stack.cli import main  # noqa: E402

if __name__ == "__main__":
    raise SystemExit(main())
