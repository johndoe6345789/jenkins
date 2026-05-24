"""Unit tests for integration_test.py — no Docker or real HTTP needed."""
import unittest
from unittest.mock import MagicMock, patch
import requests

from integration_test import (
    check_containers,
    check_endpoint,
    fmt,
    run_checks,
)


def _session(status: int = 200) -> MagicMock:
    resp = MagicMock()
    resp.status_code = status
    s = MagicMock(spec=requests.Session)
    s.get.return_value = resp
    return s


def _ep(url: str = "http://x/", **kw) -> dict:
    return {"label": "test", "url": url, **kw}


class TestCheckEndpoint(unittest.TestCase):
    def test_200_is_ok_by_default(self):
        r = check_endpoint(_ep(), _session(200))
        self.assertTrue(r["ok"])
        self.assertEqual(r["status"], 200)

    def test_redirect_ok_by_default(self):
        r = check_endpoint(_ep(), _session(307))
        self.assertTrue(r["ok"])

    def test_500_fails_by_default(self):
        r = check_endpoint(_ep(), _session(500))
        self.assertFalse(r["ok"])

    def test_custom_expected_status(self):
        r = check_endpoint(_ep(expected_status=[404]), _session(404))
        self.assertTrue(r["ok"])

    def test_connection_error(self):
        s = MagicMock(spec=requests.Session)
        s.get.side_effect = requests.ConnectionError("refused")
        r = check_endpoint(_ep(), s)
        self.assertFalse(r["ok"])
        self.assertEqual(r["status"], 0)
        self.assertIn("refused", r["error"])

    def test_timeout_error(self):
        s = MagicMock(spec=requests.Session)
        s.get.side_effect = requests.Timeout("timed out")
        r = check_endpoint(_ep(), s)
        self.assertFalse(r["ok"])

    def test_result_keys_present(self):
        r = check_endpoint(_ep(), _session(200))
        for key in ("label", "url", "status", "elapsed", "ok", "error"):
            self.assertIn(key, r)

    def test_elapsed_is_float(self):
        r = check_endpoint(_ep(), _session(200))
        self.assertIsInstance(r["elapsed"], float)


class TestCheckContainers(unittest.TestCase):
    def test_exact_match(self):
        [r] = check_containers(["frontend"], ["frontend", "backend"])
        self.assertTrue(r["ok"])

    def test_substring_match(self):
        [r] = check_containers(["frontend"], ["my-frontend-1"])
        self.assertTrue(r["ok"])

    def test_not_found(self):
        [r] = check_containers(["frontend"], ["backend"])
        self.assertFalse(r["ok"])

    def test_empty_running_list(self):
        [r] = check_containers(["frontend"], [])
        self.assertFalse(r["ok"])

    def test_multiple_mixed(self):
        results = check_containers(["a", "b", "c"], ["a", "c"])
        self.assertTrue(results[0]["ok"])
        self.assertFalse(results[1]["ok"])
        self.assertTrue(results[2]["ok"])

    def test_empty_required_returns_empty(self):
        self.assertEqual(check_containers([], ["anything"]), [])


class TestFmt(unittest.TestCase):
    def test_ok_contains_checkmark(self):
        r = {"label": "x", "status": 200, "elapsed": 0.1, "ok": True, "error": None}
        self.assertIn("✓", fmt(r))
        self.assertIn("200", fmt(r))

    def test_fail_contains_cross(self):
        r = {"label": "x", "status": 0, "elapsed": 0.0, "ok": False, "error": "refused"}
        line = fmt(r)
        self.assertIn("✗", line)
        self.assertIn("refused", line)

    def test_no_error_omits_brackets(self):
        r = {"label": "x", "status": 200, "elapsed": 0.1, "ok": True, "error": None}
        self.assertNotIn("[", fmt(r))


class TestRunChecks(unittest.TestCase):
    def test_all_pass_returns_0(self):
        config = {"endpoints": [_ep(expected_status=[200])]}
        code = run_checks(config, _session(200))
        self.assertEqual(code, 0)

    def test_any_fail_returns_1(self):
        config = {"endpoints": [_ep(expected_status=[200])]}
        code = run_checks(config, _session(500))
        self.assertEqual(code, 1)

    def test_multiple_endpoints_counts_failures(self):
        eps = [
            _ep("http://a/", expected_status=[200]),
            _ep("http://b/", expected_status=[200]),
        ]
        s = MagicMock(spec=requests.Session)
        ok = MagicMock(); ok.status_code = 200
        fail = MagicMock(); fail.status_code = 500
        s.get.side_effect = [ok, fail]
        code = run_checks({"endpoints": eps}, s)
        self.assertEqual(code, 1)

    def test_container_failure_returns_1(self):
        with patch("integration_test.docker_ps", return_value=[]):
            code = run_checks({"required_containers": ["missing"]}, _session())
        self.assertEqual(code, 1)

    def test_container_pass_returns_0(self):
        with patch("integration_test.docker_ps", return_value=["my-frontend"]):
            code = run_checks({"required_containers": ["frontend"]}, _session())
        self.assertEqual(code, 0)

    def test_empty_config_returns_0(self):
        self.assertEqual(run_checks({}), 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
