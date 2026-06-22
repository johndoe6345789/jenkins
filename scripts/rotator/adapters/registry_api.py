"""registry_api adapter: rotate a packagerepo/registry user via the backend's
/auth REST API (login, then change-password).

Used for the :5002 packagerepo backend, whose
PgUserStore hash is not reproducible by the db_* adapters. Reads the current
password from a local env file to authenticate, sets the new one, then writes it
back so the next rotation can authenticate.

params keys:
    api_url     (str)   backend base URL, e.g. 'http://pkgrepo-backend:5000'
    username    (str)   registry user to rotate, e.g. 'admin'
    env_file    (str)   path relative to jenkins/ root, e.g. 'secrets/pkgrepo-registry.env'
    env_key     (str)   key in that file, e.g. 'PACKAGEREPO_REGISTRY_PASSWORD'
    verify_ssl  (bool)  default True
"""
from __future__ import annotations

import json
import os
import ssl
import urllib.error
import urllib.request
from pathlib import Path

JENKINS_ROOT = Path(__file__).resolve().parents[3]


def _read_env(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    out: dict[str, str] = {}
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        k, v = line.split('=', 1)
        out[k.strip()] = v.strip()
    return out


def _write_env(path: Path, values: dict[str, str]) -> None:
    path.write_text(''.join(f'{k}={v}\n' for k, v in sorted(values.items())))
    os.chmod(path, 0o600)


def _ctx(verify: bool) -> ssl.SSLContext | None:
    if verify:
        return None
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def _post(url: str, body: dict, headers: dict, verify: bool) -> dict:
    data = json.dumps(body).encode()
    h = {'Content-Type': 'application/json', **headers}
    req = urllib.request.Request(url, data=data, headers=h, method='POST')
    with urllib.request.urlopen(req, timeout=15, context=_ctx(verify)) as r:
        raw = r.read()
        return json.loads(raw) if raw else {}


def _base(params: dict) -> str:
    return params['api_url'].rstrip('/')


def _login(params: dict, password: str, verify: bool) -> str:
    resp = _post(f"{_base(params)}/auth/login",
                 {'username': params['username'], 'password': password},
                 {}, verify)
    token = resp.get('token')
    if not token:
        raise RuntimeError(f"registry login failed for {params['username']!r}")
    return token


def rotate(params: dict, new_password: str) -> None:
    verify = bool(params.get('verify_ssl', True))
    path = JENKINS_ROOT / params['env_file']
    env = _read_env(path)
    current = env.get(params['env_key'], '')
    if not current:
        raise RuntimeError(f"current registry password not in {params['env_file']}")

    token = _login(params, current, verify)
    _post(f"{_base(params)}/auth/change-password",
          {'old_password': current, 'new_password': new_password},
          {'Authorization': f'Bearer {token}'}, verify)
    env[params['env_key']] = new_password
    _write_env(path, env)


def status(params: dict) -> dict:
    try:
        verify = bool(params.get('verify_ssl', True))
        path = JENKINS_ROOT / params['env_file']
        current = _read_env(path).get(params['env_key'], '')
        if not current:
            return {'accessible': False, 'error': f"no password in {params['env_file']}"}
        _login(params, current, verify)
        return {'accessible': True, 'url': _base(params), 'username': params['username']}
    except (urllib.error.URLError, RuntimeError) as e:
        return {'accessible': False, 'error': str(e)}
