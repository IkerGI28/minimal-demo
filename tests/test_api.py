import copy
import pytest
from fastapi.testclient import TestClient

from src.app import app, activities

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_activities():
    # Keep a deep copy of the initial activities and restore after each test
    original = copy.deepcopy(activities)
    yield
    activities.clear()
    activities.update(original)


def test_get_activities():
    res = client.get("/activities")
    assert res.status_code == 200
    data = res.json()
    assert "Chess Club" in data


def test_signup_and_remove():
    name = "Chess Club"
    email = "tester@mergington.edu"

    # Sign up
    res = client.post(f"/activities/{name}/signup", params={"email": email})
    assert res.status_code == 200
    assert "Successfully signed up" in res.json().get("message", "")
    assert any(p.lower() == email for p in activities[name]["participants"]) is True

    # Remove
    res2 = client.delete(f"/activities/{name}/participants", params={"email": email})
    assert res2.status_code == 200
    assert "Removed" in res2.json().get("message", "")
    assert all(p.lower() != email for p in activities[name]["participants"]) is True


def test_signup_duplicate():
    name = "Chess Club"
    email = activities[name]["participants"][0]
    res = client.post(f"/activities/{name}/signup", params={"email": email})
    assert res.status_code == 400


def test_remove_nonexistent_participant():
    name = "Chess Club"
    email = "noone@mergington.edu"
    res = client.delete(f"/activities/{name}/participants", params={"email": email})
    assert res.status_code == 404


def test_activity_not_found():
    res = client.post("/activities/NoSuchActivity/signup", params={"email": "a@b.com"})
    assert res.status_code == 404
    res2 = client.delete("/activities/NoSuchActivity/participants", params={"email": "a@b.com"})
    assert res2.status_code == 404
