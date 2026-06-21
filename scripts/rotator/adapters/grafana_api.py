"""grafana_api adapter: set a Grafana user's password via the Admin REST API.

params keys:
    grafana_url          (str)  e.g. 'http://172.21.0.36:3000'
    admin_password_env   (str)  env var that holds the Grafana admin password
    login                (str)  Grafana login name of the user to rotate
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request


def _admin_password(params: dict) -> str:
    var = params['admin_password_env']
    # rotated.env is always up-to-date; check it first before the static env var
    rotated = Path('/app/secrets/rotated.env')
    if rotated.exists():
        for line in rotated.read_text().splitlines():
            if line.startswith(f'{var}='):
                return line.split('=', 1)[1]
    pw = os.environ.get(var)
    if pw:
        return pw
    raise RuntimeError(f"env var {var!r} not found in rotated.env or environment")


def _api(params: dict, path: str, method: str = 'GET', body: dict | None = None):
    admin_pw = _admin_password(params)
    data = json.dumps(body).encode() if body is not None else None
    headers = {}
    if body is not None:
        headers['Content-Type'] = 'application/json'
    import base64
    cred = base64.b64encode(f"admin:{admin_pw}".encode()).decode()
    headers['Authorization'] = f'Basic {cred}'
    req = urllib.request.Request(
        f"{params['grafana_url']}{path}",
        data=data, headers=headers, method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            raw = r.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Grafana API {method} {path} → HTTP {e.code}: {e.read().decode()[:200]}")


def _user_id(params: dict) -> int:
    users = _api(params, f"/api/users/lookup?loginOrEmail={urllib.parse.quote(params['login'])}")
    if not users or 'id' not in users:
        raise RuntimeError(f"user {params['login']!r} not found in Grafana")
    return users['id']


def rotate(params: dict, new_password: str) -> None:
    uid = _user_id(params)
    _api(params, f"/api/admin/users/{uid}/password", method='PUT', body={'password': new_password})


def status(params: dict) -> dict:
    try:
        uid = _user_id(params)
        return {'present': True, 'login': params['login'], 'id': uid}
    except RuntimeError as e:
        return {'present': False, 'error': str(e)}
