def test_health_does_not_need_database(client) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "pulsovecinal-api"}
