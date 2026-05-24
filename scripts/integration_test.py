"""Integration test: Docker-aware HTTP endpoint checker driven by a JSON config."""
import json
import subprocess
import sys
import time
from typing import Any
import requests


def load_config(path: str) -> dict[str, Any]:
    with open(path) as f:
        return json.load(f)


def docker_ps() -> list[str]:
    """Return running container names via docker ps."""
    result = subprocess.run(
        ["docker", "ps", "--format", "{{.Names}}"],
        capture_output=True, text=True, timeout=10,
    )
    return result.stdout.strip().splitlines()


def check_endpoint(
    ep: dict[str, Any],
    session: requests.Session,
) -> dict[str, Any]:
    """GET a single endpoint. Returns a result dict."""
    label = ep["label"]
    url = ep["url"]
    timeout = ep.get("timeout", 10)
    expected = set(ep.get("expected_status", range(200, 400)))

    start = time.monotonic()
    try:
        resp = session.get(url, timeout=timeout, allow_redirects=True)
        elapsed = round(time.monotonic() - start, 2)
        return {
            "label": label, "url": url,
            "status": resp.status_code,
            "elapsed": elapsed,
            "ok": resp.status_code in expected,
            "error": None,
        }
    except requests.RequestException as exc:
        elapsed = round(time.monotonic() - start, 2)
        return {
            "label": label, "url": url,
            "status": 0, "elapsed": elapsed,
            "ok": False, "error": str(exc)[:80],
        }


def check_containers(
    required: list[str],
    running: list[str],
) -> list[dict[str, Any]]:
    """Verify each required name appears in the running list."""
    return [
        {"name": name, "ok": any(name in r for r in running)}
        for name in required
    ]


def fmt(r: dict[str, Any]) -> str:
    flag = "✓" if r["ok"] else "✗"
    label = r["label"].ljust(34)
    code = str(r["status"]).rjust(3)
    err = f"  [{r['error']}]" if r.get("error") else ""
    return f"  {flag} {label} {code}  {r['elapsed']}s{err}"


def run_checks(
    config: dict[str, Any],
    session: requests.Session | None = None,
) -> int:
    """Execute all checks. Returns 0 if all pass, 1 otherwise."""
    failures = 0
    own = session is None
    if own:
        session = requests.Session()
    try:
        if required := config.get("required_containers"):
            print("\n── Docker containers ──")
            for c in check_containers(required, docker_ps()):
                flag = "✓" if c["ok"] else "✗"
                print(f"  {flag} {c['name']}")
                failures += not c["ok"]

        if endpoints := config.get("endpoints"):
            print("\n── HTTP endpoints ──")
            for ep in endpoints:
                r = check_endpoint(ep, session)
                print(fmt(r))
                failures += not r["ok"]
    finally:
        if own:
            session.close()

    label = "All checks passed." if not failures else f"{failures} check(s) failed."
    print(f"\n{label}")
    return 0 if not failures else 1


def main() -> None:
    path = sys.argv[1] if len(sys.argv) > 1 else "config.json"
    sys.exit(run_checks(load_config(path)))


if __name__ == "__main__":
    main()
