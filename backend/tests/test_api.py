import pytest # type: ignore


def test_get_graph_for_word(client):
    response = client.get("/graph?word=日本語")
    assert response.status_code == 200
    data = response.get_json()
    assert "nodes" in data
    assert "edges" in data
    assert any(node["id"] == 1 for node in data["nodes"])

def test_get_graph_for_nonexistent_word(client):
    response = client.get("/graph?word=nonexistent")
    assert response.status_code == 404
    data = response.get_json()
    assert "error" in data

def test_get_kanji_details(client):
    response = client.get("/kanji_details?character=日")
    assert response.status_code == 200
    data = response.get_json()
    assert data["character"] == "日"
    assert data["meaning"] == "day, sun, Japan"

def test_get_kanji_details_nonexistent(client):
    response = client.get("/kanji_details?character=nonexistent")
    assert response.status_code == 404
    data = response.get_json()
    assert "error" in data