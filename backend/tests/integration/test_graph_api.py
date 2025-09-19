import pytest # type: ignore

def test_graph_api_returns_data(client):
    response = client.get("/graph?word=日本語")
    assert response.status_code == 200
    data = response.get_json()
    assert "nodes" in data
    assert "links" in data
    assert any(node["id"] == "word-1" for node in data["nodes"])
