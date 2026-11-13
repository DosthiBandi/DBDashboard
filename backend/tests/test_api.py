from fastapi.testclient import TestClient
from app.main import app

def test_health():
    r = TestClient(app).get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

def test_sales_require_auth():
    r = TestClient(app).get("/api/v1/daily-sales")
    assert r.status_code == 401

def test_invalid_sale_is_rejected_before_auth():
    r = TestClient(app).post("/api/v1/daily-sales", json={"business_date": "2026-11-13", "cash_sales": -2})
    assert r.status_code == 422
