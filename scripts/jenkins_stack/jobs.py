"""register-jobs: walk jobs/*.xml and push each one to a running Jenkins.

Replaces the manual curl loop in README.md. Uses uksodev/<password> from
secrets/jenkins.env. Idempotent: if a job already exists, `--update` POSTs
to its config.xml endpoint; without `--update`, existing jobs are skipped.

Used by bootstrap so that a fresh Jenkins (with no jobs) becomes a fully-
populated one in a single command. Safe to re-run after editing jobs/.
"""
from __future__ import annotations

import argparse
import base64
import http.cookiejar
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from . import REPO_ROOT

JENKINS_URL = "http://localhost:8081"


def _jenkins_password() -> str:
    env = REPO_ROOT / "secrets" / "jenkins.env"
    if not env.exists():
        raise RuntimeError(f"missing {env} — run `setup.py secrets` first")
    for line in env.read_text().splitlines():
        m = re.match(r"\s*JENKINS_UKSODEV_PASSWORD\s*=\s*(.+?)\s*$", line)
        if m:
            return m.group(1)
    raise RuntimeError("JENKINS_UKSODEV_PASSWORD not in secrets/jenkins.env")


def _opener(user: str, password: str) -> tuple[urllib.request.OpenerDirector, str]:
    """Return an opener + a pre-built `Basic <b64>` Authorization header.

    Jenkins answers anonymous requests with 403 (not 401), which means the
    stock HTTPBasicAuthHandler never retries with credentials. We send the
    header pre-emptively on every Request instead.
    """
    token = base64.b64encode(f"{user}:{password}".encode()).decode()
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()),
    )
    return opener, f"Basic {token}"


def _get(opener, auth: str, url: str, timeout: int = 5) -> bytes:
    req = urllib.request.Request(url, headers={"Authorization": auth})
    with opener.open(req, timeout=timeout) as r:
        return r.read()


def _wait_ready(opener, auth: str, timeout_s: int) -> None:
    end = time.monotonic() + timeout_s
    last_err = "unknown"
    while time.monotonic() < end:
        try:
            json.loads(_get(opener, auth, f"{JENKINS_URL}/api/json?tree=mode"))
            return
        except (urllib.error.URLError, ValueError, ConnectionError) as e:
            last_err = str(e)
            time.sleep(3)
    raise RuntimeError(f"Jenkins not ready at {JENKINS_URL} after {timeout_s}s: {last_err}")


def _crumb(opener, auth: str) -> tuple[str, str]:
    d = json.loads(_get(opener, auth, f"{JENKINS_URL}/crumbIssuer/api/json"))
    return d["crumbRequestField"], d["crumb"]


def _job_exists(opener, auth: str, name: str) -> bool:
    try:
        _get(opener, auth, f"{JENKINS_URL}/job/{urllib.parse.quote(name)}/api/json?tree=name")
        return True
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return False
        raise


def _post(opener, auth: str, url: str, xml: bytes, crumb: tuple[str, str]) -> int:
    req = urllib.request.Request(
        url, data=xml,
        headers={
            "Authorization": auth,
            "Content-Type": "application/xml",
            crumb[0]: crumb[1],
        },
        method="POST",
    )
    with opener.open(req) as r:
        return r.status


def cmd_register_jobs(args: argparse.Namespace) -> int:
    user = "uksodev"
    password = _jenkins_password()
    opener, auth = _opener(user, password)
    _wait_ready(opener, auth, args.wait_timeout)
    crumb = _crumb(opener, auth)

    jobs_dir = REPO_ROOT / "jobs"
    xmls = sorted(jobs_dir.glob("*.xml"))
    if args.only:
        wanted = set(args.only)
        xmls = [p for p in xmls if p.stem in wanted]
        unknown = wanted - {p.stem for p in xmls}
        if unknown:
            print(f"unknown job(s): {', '.join(sorted(unknown))}")
            return 1

    created = updated = skipped = failed = 0
    for path in xmls:
        name = path.stem
        body = path.read_bytes()
        try:
            if _job_exists(opener, auth, name):
                if not args.update:
                    print(f"  skip   {name}  (use --update to overwrite)")
                    skipped += 1
                    continue
                _post(opener, auth, f"{JENKINS_URL}/job/{urllib.parse.quote(name)}/config.xml", body, crumb)
                print(f"  update {name}")
                updated += 1
            else:
                url = f"{JENKINS_URL}/createItem?name={urllib.parse.quote(name)}"
                _post(opener, auth, url, body, crumb)
                print(f"  create {name}")
                created += 1
        except urllib.error.HTTPError as e:
            print(f"  fail   {name}  HTTP {e.code} {e.reason}")
            failed += 1

    print(f"\nregister-jobs: {created} created, {updated} updated, {skipped} skipped, {failed} failed")
    return 1 if failed else 0
