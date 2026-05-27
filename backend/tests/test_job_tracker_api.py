"""Backend tests for Job Tracker API."""
import os
import pytest
import requests
from datetime import date, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://apply-hub-39.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_USER = "bidyadhar"
ADMIN_PASS = "Bidyadhar1!"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 10
    assert data["username"] == ADMIN_USER
    return data["token"]


@pytest.fixture
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ---------- Auth ----------
class TestAuth:
    def test_login_wrong_credentials(self):
        r = requests.post(f"{API}/auth/login", json={"username": "wrong", "password": "wrong"}, timeout=10)
        assert r.status_code == 401

    def test_me_requires_token(self):
        r = requests.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 401

    def test_me_with_token(self, auth_headers):
        r = requests.get(f"{API}/auth/me", headers=auth_headers, timeout=10)
        assert r.status_code == 200
        assert r.json()["username"] == ADMIN_USER


# ---------- Jobs Public ----------
class TestJobsPublic:
    def test_list_jobs_public(self):
        r = requests.get(f"{API}/jobs", timeout=10)
        assert r.status_code == 200
        jobs = r.json()
        assert isinstance(jobs, list)
        # Seeded with 6 jobs
        assert len(jobs) >= 1
        if jobs:
            j = jobs[0]
            for k in ("id", "job_name", "last_date", "apply_link", "applied"):
                assert k in j
            # No mongo _id leak
            assert "_id" not in j

    def test_create_job_requires_auth(self):
        r = requests.post(f"{API}/jobs", json={"job_name": "Unauth", "last_date": "2026-12-01", "apply_link": "https://x"}, timeout=10)
        assert r.status_code == 401

    def test_stats(self):
        r = requests.get(f"{API}/stats", timeout=10)
        assert r.status_code == 200
        s = r.json()
        for k in ("total", "applied", "pending", "upcoming", "overdue"):
            assert k in s
            assert isinstance(s[k], int)


# ---------- Jobs CRUD ----------
class TestJobsCRUD:
    created_id = None

    def test_create_job(self, auth_headers):
        future = (date.today() + timedelta(days=20)).isoformat()
        exam = (date.today() + timedelta(days=60)).isoformat()
        payload = {
            "job_name": "TEST_PyTest Job",
            "last_date": future,
            "exam_date": exam,
            "apply_link": "https://example.com/apply",
            "notes": "pytest seed",
        }
        r = requests.post(f"{API}/jobs", headers=auth_headers, json=payload, timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["job_name"] == "TEST_PyTest Job"
        assert data["last_date"] == future
        assert data["applied"] is False
        assert "id" in data
        TestJobsCRUD.created_id = data["id"]

        # Verify GET persists
        list_r = requests.get(f"{API}/jobs", timeout=10)
        ids = [j["id"] for j in list_r.json()]
        assert TestJobsCRUD.created_id in ids

    def test_toggle_applied(self, auth_headers):
        assert TestJobsCRUD.created_id is not None
        r = requests.patch(f"{API}/jobs/{TestJobsCRUD.created_id}/toggle-applied", headers=auth_headers, timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["applied"] is True
        assert data["applied_at"] is not None

        # Toggle off
        r2 = requests.patch(f"{API}/jobs/{TestJobsCRUD.created_id}/toggle-applied", headers=auth_headers, timeout=10)
        assert r2.status_code == 200
        assert r2.json()["applied"] is False
        assert r2.json()["applied_at"] is None

    def test_update_job(self, auth_headers):
        assert TestJobsCRUD.created_id is not None
        r = requests.put(
            f"{API}/jobs/{TestJobsCRUD.created_id}",
            headers=auth_headers,
            json={"job_name": "TEST_PyTest Job Updated", "notes": "edited"},
            timeout=10,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["job_name"] == "TEST_PyTest Job Updated"
        assert data["notes"] == "edited"

    def test_update_nonexistent(self, auth_headers):
        r = requests.put(f"{API}/jobs/nonexistent-id-xyz", headers=auth_headers, json={"job_name": "x"}, timeout=10)
        assert r.status_code == 404

    def test_delete_job(self, auth_headers):
        assert TestJobsCRUD.created_id is not None
        r = requests.delete(f"{API}/jobs/{TestJobsCRUD.created_id}", headers=auth_headers, timeout=10)
        assert r.status_code == 200
        # Verify gone
        list_r = requests.get(f"{API}/jobs", timeout=10)
        ids = [j["id"] for j in list_r.json()]
        assert TestJobsCRUD.created_id not in ids

    def test_delete_requires_auth(self):
        r = requests.delete(f"{API}/jobs/anything", timeout=10)
        assert r.status_code == 401


# ---------- Smart Parse ----------
class TestSmartParse:
    def test_smart_parse_requires_auth(self):
        r = requests.post(f"{API}/jobs/smart-parse", json={"text": "some text"}, timeout=10)
        assert r.status_code == 401

    def test_smart_parse_too_short(self, auth_headers):
        r = requests.post(f"{API}/jobs/smart-parse", headers=auth_headers, json={"text": "hi"}, timeout=15)
        assert r.status_code == 400

    def test_smart_parse_real(self, auth_headers):
        text = (
            "SBI PO 2026 Recruitment Notification. "
            "The State Bank of India invites online applications for the post of Probationary Officer. "
            "Last date to apply is 30 June 2026. The preliminary exam will be conducted on 15 August 2026. "
            "Apply at https://www.sbi.co.in/careers"
        )
        r = requests.post(f"{API}/jobs/smart-parse", headers=auth_headers, json={"text": text}, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        # Job name should mention SBI PO
        assert data.get("job_name"), f"No job_name in {data}"
        assert "SBI" in data["job_name"].upper() or "PO" in data["job_name"].upper()
        # Dates should be ISO format YYYY-MM-DD
        if data.get("last_date"):
            assert len(data["last_date"]) == 10 and data["last_date"][4] == "-"
        if data.get("apply_link"):
            assert data["apply_link"].startswith("http")
