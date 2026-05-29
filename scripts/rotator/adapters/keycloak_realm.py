"""keycloak_realm adapter: reset a realm user's password via Keycloak's
admin REST API.

Uses urllib so there are no extra dependencies. The master admin password is
NOT in the manifest — it's pulled from the env at runtime via
`kc_master_password_env`, so the manifest stays committable and the secret
only lives in jenkins/secrets/.

params keys:
    kc_url                  (str)  e.g. 'http://localhost:8080'
    kc_master_user          (str)  default 'admin'
    kc_master_password_env  (str)  env var name where master pw is sourced
    realm                   (str)  e.g. 'businessplanner'
    user                    (str)  realm user to rotate (e.g. 'devadmin')
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request


def _master_password(params: dict) -> str:
    var = params['kc_master_password_env']
    pw = os.environ.get(var)
    if not pw:
        raise RuntimeError(f"env var {var} is not set (master KC password)")
    return pw


def _token(params: dict) -> str:
    body = urllib.parse.urlencode({
        'client_id': 'admin-cli',
        'grant_type': 'password',
        'username': params.get('kc_master_user', 'admin'),
        'password': _master_password(params),
    }).encode()
    req = urllib.request.Request(
        f"{params['kc_url']}/realms/master/protocol/openid-connect/token",
        data=body,
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())['access_token']


def _api(params: dict, path: str, token: str, method: str = 'GET', body: dict | None = None) -> dict | None:
    data = json.dumps(body).encode() if body is not None else None
    headers = {'Authorization': f'Bearer {token}'}
    if body is not None:
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(
        f"{params['kc_url']}/admin/realms/{params['realm']}{path}",
        data=data, headers=headers, method=method,
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        raw = r.read()
        if not raw:
            return None
        return json.loads(raw)


def _user_id(params: dict, token: str) -> str:
    users = _api(params, f"/users?username={urllib.parse.quote(params['user'])}&exact=true", token)
    if not users:
        raise RuntimeError(f"user {params['user']!r} not found in realm {params['realm']!r}")
    return users[0]['id']


def rotate(params: dict, new_password: str) -> None:
    token = _token(params)
    uid = _user_id(params, token)
    _api(
        params, f"/users/{uid}/reset-password", token,
        method='PUT',
        body={'type': 'password', 'value': new_password, 'temporary': False},
    )


def status(params: dict) -> dict:
    try:
        token = _token(params)
        users = _api(params, f"/users?username={urllib.parse.quote(params['user'])}&exact=true", token)
    except (urllib.error.URLError, RuntimeError) as e:
        return {'present': False, 'error': str(e)}
    if not users:
        return {'present': False, 'realm': params['realm'], 'user': params['user']}
    u = users[0]
    return {
        'present': True,
        'realm': params['realm'],
        'user': params['user'],
        'enabled': u.get('enabled'),
        'last_modified': u.get('createdTimestamp'),
    }
