"""pyracms_pbkdf2 adapter: UPDATE a PBKDF2-SHA256 hashed password in the PyraCMS
PostgreSQL users table, reached via `docker exec <container> psql`.

PyraCMS stores passwords as "salt_hex:hash_hex" where:
  - salt:  16 random bytes
  - hash:  PBKDF2-HMAC-SHA256(password, salt, 100_000 iterations, 32 bytes)

params keys:
    db_container  (str)  postgres container name, e.g. 'pyracms-cpp-port-postgres-1'
    db_name       (str)  e.g. 'pyracms'
    db_user       (str)  e.g. 'pyracms'
    username      (str)  PyraCMS username to update
"""
from __future__ import annotations

import hashlib
import os
import subprocess


def _hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100_000, dklen=32)
    return salt.hex() + ':' + dk.hex()


def _psql(params: dict, sql: str, capture: bool = False) -> str | None:
    cmd = [
        'docker', 'exec', '-i', params['db_container'],
        'psql', '-U', params['db_user'], '-d', params['db_name'],
        '-At', '-v', 'ON_ERROR_STOP=1',
    ]
    proc = subprocess.run(cmd, input=sql.encode(), capture_output=capture)
    if proc.returncode != 0:
        err = proc.stderr.decode().strip() if capture and proc.stderr else f'psql exit {proc.returncode}'
        raise RuntimeError(err or f'psql exit {proc.returncode}')
    return proc.stdout.decode() if capture else None


def _safe(s: str) -> str:
    return s.replace("'", "''")


def rotate(params: dict, new_password: str) -> None:
    pw_hash = _hash_password(new_password)
    sql = (
        f"UPDATE users SET password_hash = '{pw_hash}' "
        f"WHERE username = '{_safe(params['username'])}';"
    )
    _psql(params, sql)


def status(params: dict) -> dict:
    sql = (
        f"SELECT id, length(password_hash) FROM users "
        f"WHERE username = '{_safe(params['username'])}';"
    )
    try:
        out = _psql(params, sql, capture=True)
    except RuntimeError as e:
        return {'present': False, 'error': str(e)}

    if not out or not out.strip():
        return {'present': False, 'username': params['username']}

    parts = out.strip().split('|')
    return {
        'present': True,
        'username': params['username'],
        'user_id': parts[0],
        'hash_len': int(parts[1]) if len(parts) > 1 else 0,
    }
