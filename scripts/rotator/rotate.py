#!/usr/bin/env python3
"""JSON-orchestrated credentials rotator.

The manifest (manifest.json) lists every credential target across all
frontends. Each target picks one adapter (db_bcrypt, env_var, keycloak_realm,
...) and a params block the adapter understands. This driver loops the
manifest, asks each adapter to rotate, and writes the new values to
jenkins/secrets/rotated.env (live) plus jenkins/secrets/rotated/<ts>.env
(archive) plus rotated.history.json (metadata only, no secrets).

Examples:
    ./rotate.py status
    ./rotate.py status --only postgres-dashboard-admin
    ./rotate.py rotate --only postgres-dashboard-admin --password admin123
    ./rotate.py rotate --only postgres-dashboard-admin     # generate
    ./rotate.py rotate                                      # all targets
    ./rotate.py rotate --dry-run                            # show plan, no writes
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import secrets as pysecrets
import string
import sys
from pathlib import Path

# Allow running this file directly from anywhere — make sibling adapters/
# importable as a package.
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))   # so `rotator.adapters.*` works
sys.path.insert(0, str(HERE))          # so `adapters.*` works (this layout)

import adapters  # noqa: E402

REPO_ROOT = HERE.parent.parent          # jenkins/
SECRETS_DIR = REPO_ROOT / 'secrets'
LIVE_ENV = SECRETS_DIR / 'rotated.env'
ARCHIVE_DIR = SECRETS_DIR / 'rotated'
HISTORY = SECRETS_DIR / 'rotated.history.json'


def load_manifest() -> list[dict]:
    with open(HERE / 'manifest.json') as f:
        return json.load(f)['targets']


def select(targets: list[dict], only: list[str] | None) -> list[dict]:
    if not only:
        return targets
    names = {t['name'] for t in targets}
    missing = [n for n in only if n not in names]
    if missing:
        sys.exit(f"unknown target(s): {', '.join(missing)}")
    return [t for t in targets if t['name'] in only]


def gen_password(n: int = 32) -> str:
    alphabet = string.ascii_letters + string.digits
    return ''.join(pysecrets.choice(alphabet) for _ in range(n))


def write_snapshot(values: dict[str, str], ts: dt.datetime) -> Path:
    SECRETS_DIR.mkdir(parents=True, exist_ok=True)
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)

    # Live: full current view (overwrite each rotation by merging with the
    # previous file so partial runs don't blow away unrelated keys).
    live = read_env(LIVE_ENV)
    live.update(values)
    write_env(LIVE_ENV, live, header=f"# rotated.env — live view, updated {ts.isoformat()}\n")

    # Archive: only the keys touched this run.
    arc = ARCHIVE_DIR / f"{ts.strftime('%Y%m%dT%H%M%SZ')}.env"
    write_env(arc, values, header=f"# rotated at {ts.isoformat()}\n")
    return arc


def read_env(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    out = {}
    for line in path.read_text().splitlines():
        if not line.strip() or line.startswith('#'):
            continue
        if '=' not in line:
            continue
        k, v = line.split('=', 1)
        out[k.strip()] = v
    return out


def write_env(path: Path, values: dict[str, str], header: str = '') -> None:
    path.write_text(
        header + ''.join(f'{k}={v}\n' for k, v in sorted(values.items()))
    )
    os.chmod(path, 0o600)


def update_history(records: list[dict]) -> None:
    HISTORY.parent.mkdir(parents=True, exist_ok=True)
    prior = []
    if HISTORY.exists():
        try:
            prior = json.loads(HISTORY.read_text())
        except json.JSONDecodeError:
            prior = []
    prior.extend(records)
    HISTORY.write_text(json.dumps(prior, indent=2))
    os.chmod(HISTORY, 0o600)


def cmd_status(args: argparse.Namespace) -> int:
    targets = select(load_manifest(), args.only)
    for t in targets:
        try:
            meta = adapters.status(t['adapter'])(t['params'])
            print(f"{t['name']:40s} {t['adapter']:18s} {meta}")
        except Exception as e:  # adapter-side problems should never tank the whole report
            print(f"{t['name']:40s} {t['adapter']:18s} ERROR: {e}", file=sys.stderr)
    return 0


def cmd_rotate(args: argparse.Namespace) -> int:
    targets = select(load_manifest(), args.only)
    if args.password and len(targets) != 1:
        sys.exit("--password requires --only <one target>")

    ts = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
    values: dict[str, str] = {}
    records: list[dict] = []

    for t in targets:
        password = args.password or gen_password()
        if args.dry_run:
            print(f"[dry-run] {t['name']} via {t['adapter']} -> would rotate (pw not shown)")
            continue
        try:
            adapters.rotate(t['adapter'])(t['params'], password)
        except Exception as e:
            sys.stderr.write(f"[fail] {t['name']}: {e}\n")
            records.append({'ts': ts.isoformat(), 'name': t['name'], 'adapter': t['adapter'], 'result': 'fail', 'error': str(e)})
            if args.stop_on_error:
                break
            continue
        values[t['secret_env_key']] = password
        records.append({'ts': ts.isoformat(), 'name': t['name'], 'adapter': t['adapter'], 'result': 'ok', 'secret_env_key': t['secret_env_key']})
        print(f"[ok] {t['name']} -> {t['secret_env_key']}")

    if args.dry_run:
        return 0

    if values:
        arc = write_snapshot(values, ts)
        print(f"\nWrote {len(values)} keys to {LIVE_ENV}")
        print(f"Archived to {arc}")
    update_history(records)
    failures = sum(1 for r in records if r['result'] == 'fail')
    return 1 if failures else 0


def cmd_generate(args: argparse.Namespace) -> int:
    """Just print fresh passwords. No adapter calls, no writes. Useful for
    seeing what a rotation would emit without actually doing one."""
    targets = select(load_manifest(), args.only)
    for t in targets:
        print(f"{t['secret_env_key']}={gen_password()}")
    return 0


def main() -> int:
    p = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = p.add_subparsers(dest='cmd', required=True)

    s = sub.add_parser('status', help='read current state of targets (no writes)')
    s.add_argument('--only', nargs='+', metavar='NAME')
    s.set_defaults(fn=cmd_status)

    r = sub.add_parser('rotate', help='apply new password to each target')
    r.add_argument('--only', nargs='+', metavar='NAME')
    r.add_argument('--password', help='use this password (requires --only with one target)')
    r.add_argument('--dry-run', action='store_true')
    r.add_argument('--stop-on-error', action='store_true')
    r.set_defaults(fn=cmd_rotate)

    g = sub.add_parser('generate', help='print fresh passwords without applying')
    g.add_argument('--only', nargs='+', metavar='NAME')
    g.set_defaults(fn=cmd_generate)

    args = p.parse_args()
    return args.fn(args)


if __name__ == '__main__':
    sys.exit(main())
