"""env_var adapter: write KEY=value into a .env file under jenkins/secrets/
that the consuming docker compose service mounts via env_file.

The container won't pick up the new value until it's recreated. We don't do
that here — too many compose files to know about, and post-rotation deploy
is the cleaner place. Adapter sets `recreate_service` in its status output so
the driver / Jenkins job can act on it.

params keys:
    env_file             (str)  path RELATIVE TO jenkins/ root
                                e.g. 'secrets/dockerterminal.env'
    env_key              (str)  the variable name to write, e.g. ADMIN_PASSWORD
    recreate_service     (str)  container name that needs to be recreated
                                (informational only — adapter does NOT restart)
"""
from __future__ import annotations

from pathlib import Path

# jenkins/ root, two levels up from adapters/
JENKINS_ROOT = Path(__file__).resolve().parents[3]


def _path(params: dict) -> Path:
    return JENKINS_ROOT / params['env_file']


def _read(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    out = {}
    for line in path.read_text().splitlines():
        if not line.strip() or line.startswith('#') or '=' not in line:
            continue
        k, v = line.split('=', 1)
        out[k.strip()] = v
    return out


def _write(path: Path, values: dict[str, str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(''.join(f'{k}={v}\n' for k, v in sorted(values.items())))
    path.chmod(0o600)


def rotate(params: dict, new_password: str) -> None:
    path = _path(params)
    values = _read(path)
    values[params['env_key']] = new_password
    _write(path, values)


def status(params: dict) -> dict:
    path = _path(params)
    if not path.exists():
        return {'present': False, 'env_file': str(path)}
    values = _read(path)
    key = params['env_key']
    return {
        'present': key in values,
        'env_file': str(path.relative_to(JENKINS_ROOT)),
        'env_key': key,
        'value_len': len(values.get(key, '')),
        'needs_recreate': params.get('recreate_service'),
    }
