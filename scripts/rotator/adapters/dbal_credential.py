"""dbal_credential adapter: set a login's password in the shared dbal (the OIDC provider businessplanner and
next_extra_primary sign in through) with its admin-token endpoint, POST /admin/credentials.

dbal has no way to read a password back, so this only ever *sets* one; the new value is what rotate.py writes to
the secrets file. The admin token is read from an env file, never from the manifest.

params keys:
    admin_url       (str)  where dbal answers, e.g. 'http://srv-captain--metabuilder-dbal:8080'
    username        (str)  the dbal username (not the e-mail), e.g. 'founder-a531' or 'bp_1a2b3c4d5e6f7a8b'
    email           (str)  optional alternate login identifier to keep set
    token_env_file  (str)  path relative to jenkins/ root holding the admin token, e.g. 'secrets/dbal.env'
    token_env_key   (str)  key in that file, default 'DBAL_ADMIN_TOKEN'

Caution: setting a password for a username that does not exist creates the login, and for one that exists
replaces its password. Only list usernames that are meant to be rotated.
"""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from pathlib import Path

JENKINS_ROOT = Path(__file__).resolve().parents[3]


def _token(params: dict) -> str:
    path = JENKINS_ROOT / params['token_env_file']
    key = params.get('token_env_key', 'DBAL_ADMIN_TOKEN')
    for line in path.read_text().splitlines():
        if line.startswith(key + '='):
            return line.split('=', 1)[1].strip()
    raise RuntimeError(f'{key} not found in {path}')


def rotate(params: dict, new_password: str) -> None:
    body = {'username': params['username'], 'password': new_password}
    if params.get('email'):
        body['email'] = params['email']
    req = urllib.request.Request(
        params['admin_url'].rstrip('/') + '/admin/credentials', data=json.dumps(body).encode(), method='POST',
        headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _token(params)})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            ok = json.loads(r.read()).get('success') is True
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"dbal refused the password change for {params['username']}: HTTP {e.code}") from e
    if not ok:
        raise RuntimeError(f"dbal did not confirm the password change for {params['username']}")


def status(params: dict) -> dict:
    return {'admin_url': params['admin_url'], 'username': params['username'], 'token_file_present': (JENKINS_ROOT / params['token_env_file']).exists()}
