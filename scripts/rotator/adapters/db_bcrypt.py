"""DB-bcrypt adapter: UPSERT a bcrypt-hashed password into an admin/users
table reached via `docker exec <container> psql`.

params keys:
    db_container         (str)  container name where psql lives
    db_name              (str)  database
    db_user              (str)  psql role
    table                (str)  e.g. 'admin_users'
    username_column      (str)  e.g. 'username'
    hash_column          (str)  e.g. 'password_hash'
    updated_at_column    (str)  e.g. 'updated_at'  (optional)
    username             (str)  the user to upsert
    bcrypt_cost          (int)  default 10
"""
from __future__ import annotations

import subprocess

import bcrypt


def _psql(params: dict, sql: str, capture: bool = False) -> str | None:
    cmd = [
        'docker', 'exec', '-i', params['db_container'],
        'psql', '-U', params['db_user'], '-d', params['db_name'],
        '-At', '-v', 'ON_ERROR_STOP=1',
    ]
    proc = subprocess.run(cmd, input=sql.encode(), capture_output=capture)
    if proc.returncode != 0:
        err = proc.stderr.decode() if capture and proc.stderr else f'psql exit {proc.returncode}'
        raise RuntimeError(err.strip())
    return proc.stdout.decode() if capture else None


def _sql_quote(s: str) -> str:
    return s.replace("'", "''")


def rotate(params: dict, new_password: str) -> None:
    h = bcrypt.hashpw(
        new_password.encode(),
        bcrypt.gensalt(params.get('bcrypt_cost', 10)),
    ).decode()

    table = params['table']
    user_col = params['username_column']
    hash_col = params['hash_column']
    upd_col = params.get('updated_at_column')
    user = _sql_quote(params['username'])

    set_clause = f"{hash_col} = EXCLUDED.{hash_col}"
    if upd_col:
        set_clause += f", {upd_col} = now()"

    sql = (
        f"INSERT INTO {table} ({user_col}, {hash_col}) "
        f"VALUES ('{user}', '{h}') "
        f"ON CONFLICT ({user_col}) DO UPDATE SET {set_clause};"
    )
    _psql(params, sql)


def status(params: dict) -> dict:
    table = params['table']
    user_col = params['username_column']
    hash_col = params['hash_column']
    upd_col = params.get('updated_at_column', 'NULL')
    user = _sql_quote(params['username'])

    sql = (
        f"SELECT length({hash_col}), {upd_col} "
        f"FROM {table} WHERE {user_col} = '{user}';"
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
        'hash_len': int(parts[0]),
        'updated_at': parts[1] if len(parts) > 1 else None,
    }
