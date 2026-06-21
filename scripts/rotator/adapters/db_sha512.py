"""DB-sha512 adapter: UPDATE a plain SHA-512-hashed password in a SQLite
database reached via `docker exec <container> python3 -c ...`.

Matches apps that use:
    hashlib.sha512(password.encode()).hexdigest()
with NO salt (e.g. workflowui).

params keys:
    db_container     (str)  container name
    db_path          (str)  absolute path to SQLite file inside the container
    table            (str)  e.g. 'users'
    username_column  (str)  e.g. 'email'   (the lookup key)
    hash_column      (str)  e.g. 'password_hash'
    username         (str)  the user's email/username value to match
"""
from __future__ import annotations

import subprocess


def _exec_python(container: str, code: str) -> str:
    cmd = ['docker', 'exec', container, 'python3', '-c', code]
    proc = subprocess.run(cmd, capture_output=True)
    if proc.returncode != 0:
        err = proc.stderr.decode().strip()
        raise RuntimeError(err or f'docker exec exit {proc.returncode}')
    return proc.stdout.decode().strip()


def rotate(params: dict, new_password: str) -> None:
    table    = params['table']
    user_col = params['username_column']
    hash_col = params['hash_column']
    db_path  = params['db_path']
    username = params['username']

    code = (
        "import sqlite3, hashlib; "
        f"h = hashlib.sha512({new_password!r}.encode()).hexdigest(); "
        f"conn = sqlite3.connect({db_path!r}); "
        f"conn.execute('UPDATE {table} SET {hash_col}=? WHERE {user_col}=?', (h, {username!r})); "
        "conn.commit(); conn.close(); print('ok')"
    )
    out = _exec_python(params['db_container'], code)
    if 'ok' not in out:
        raise RuntimeError(f'Unexpected output: {out!r}')


def status(params: dict) -> dict:
    table    = params['table']
    user_col = params['username_column']
    hash_col = params['hash_column']
    db_path  = params['db_path']
    username = params['username']

    code = (
        "import sqlite3; "
        f"conn = sqlite3.connect({db_path!r}); "
        f"row = conn.execute('SELECT {hash_col} FROM {table} WHERE {user_col}=?', ({username!r},)).fetchone(); "
        "conn.close(); print(len(row[0]) if row else 'NONE')"
    )
    try:
        out = _exec_python(params['db_container'], code)
    except RuntimeError as e:
        return {'present': False, 'error': str(e)}

    if out == 'NONE':
        return {'present': False, 'username': username}
    return {'present': True, 'username': username, 'hash_len': int(out)}
