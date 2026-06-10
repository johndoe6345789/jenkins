"""caprover adapter: reset the CapRover dashboard password via its REST API.

Reads the current password from a local env file to authenticate, then
sets the new password and writes it back so future rotations can
authenticate.

params keys:
    caprover_url   (str)   base URL, e.g. 'https://captain.wardcrew.com'
    env_file       (str)   path relative to repo root, e.g. 'secrets/caprover.env'
    env_key        (str)   key name in that file, e.g. 'CAPROVER_ADMIN_PASSWORD'
    verify_ssl     (bool)  default True; set False to skip cert verification
"""
from __future__ import annotations

import json
import os
import ssl
import urllib.error
import urllib.request
from pathlib import Path


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
    path.write_text(''.join(f'{k}={v}\n' for k, v in values.items()))
    os.chmod(path, 0o600)


def _ssl_ctx(verify: bool) -> ssl.SSLContext | None:
    if verify:
        return None
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def _post(url: str, body: dict, headers: dict | None = None, verify: bool = True) -> dict:
    data = json.dumps(body).encode()
    h: dict[str, str] = {'Content-Type': 'application/json', **(headers or {})}
    req = urllib.request.Request(url, data=data, headers=h, method='POST')
    ctx = _ssl_ctx(verify)
    opener = urllib.request.build_opener(urllib.request.HTTPSHandler(context=ctx)) \
        if ctx else urllib.request.build_opener()
    with opener.open(req, timeout=15) as r:
        return json.loads(r.read())


def _login(base_url: str, password: str, verify: bool = True) -> str:
    resp = _post(f'{base_url}/api/v2/login', {'password': password}, verify=verify)
    if resp.get('status') != 100:
        raise RuntimeError(
            f"CapRover login failed: {resp.get('description', resp)}"
        )
    return resp['data']['token']


def rotate(params: dict, new_password: str) -> None:
    env_path = Path(params['env_file'])
    env = _read_env(env_path)
    current_pw = env.get(params['env_key'], '')
    if not current_pw:
        raise RuntimeError(
            f"current CapRover password not found in {params['env_file']} "
            f"(key: {params['env_key']})"
        )
    verify = bool(params.get('verify_ssl', True))
    base = params['caprover_url'].rstrip('/')
    token = _login(base, current_pw, verify=verify)
    _post(
        f'{base}/api/v2/user/password',
        {'oldPassword': current_pw, 'newPassword': new_password},
        headers={'x-captain-auth': token},
        verify=verify,
    )
    env[params['env_key']] = new_password
    _write_env(env_path, env)


def status(params: dict) -> dict:
    try:
        verify = bool(params.get('verify_ssl', True))
        base = params['caprover_url'].rstrip('/')
        env_path = Path(params['env_file'])
        env = _read_env(env_path)
        current_pw = env.get(params['env_key'], '')
        if not current_pw:
            return {'accessible': False, 'error': f"no password in {params['env_file']}"}
        _login(base, current_pw, verify=verify)
        return {'accessible': True, 'url': base}
    except (urllib.error.URLError, RuntimeError) as e:
        return {'accessible': False, 'error': str(e)}
