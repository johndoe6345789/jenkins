"""clone-repos: idempotently clone every sibling app repo listed in
sibling_repos.json into ../<name>/ relative to the jenkins repo root.

Used by bootstrap on a fresh host so a clone of jenkins/ alone is enough to
walk the rest of the stack down. --update pulls existing checkouts; default
is to leave existing checkouts alone so local work isn't disturbed.
"""
from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

from . import REPO_ROOT

MANIFEST = Path(__file__).resolve().parent / "sibling_repos.json"


def _load_manifest() -> list[dict]:
    return json.loads(MANIFEST.read_text())["repos"]


def cmd_clone_repos(args: argparse.Namespace) -> int:
    sibling_root = REPO_ROOT.parent
    repos = _load_manifest()
    only = set(args.only) if args.only else None
    if only:
        unknown = only - {r["name"] for r in repos}
        if unknown:
            print(f"unknown repo(s) in --only: {', '.join(sorted(unknown))}")
            return 1
        repos = [r for r in repos if r["name"] in only]

    failures = 0
    for entry in repos:
        name = entry["name"]
        target = sibling_root / name
        if target.exists():
            if not args.update:
                print(f"  skip {name} — already at {target} (use --update to pull)")
                continue
            print(f"  pull {name}")
            rc = subprocess.run(
                ["git", "-C", str(target), "pull", "--ff-only"],
            ).returncode
            if rc != 0:
                print(f"    failed (non-fast-forward?)")
                failures += 1
            continue
        print(f"  clone {name} from {entry['url']}")
        rc = subprocess.run([
            "git", "clone",
            "--branch", entry["branch"],
            "--single-branch",
            entry["url"], str(target),
        ]).returncode
        if rc != 0:
            failures += 1

    print(f"\nclone-repos: {len(repos) - failures}/{len(repos)} ok")
    return 1 if failures else 0
