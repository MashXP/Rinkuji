import pytest # type: ignore

def test_graph_api_returns_data(client):
    response = client.get("/graph?word=日本語")
    assert response.status_code == 200
    data = response.get_json()
    assert "nodes" in data
    assert "edges" in data
    assert any(node["id"] == 1 for node in data["nodes"])

def test_graph_api_missing_word_parameter(client):
    response = client.get("/graph")
    assert response.status_code == 400
    assert response.get_json() == {"error": "Missing 'word' parameter"}

def test_graph_api_word_not_found(client):
    response = client.get("/graph?word=nonexistent")
    assert response.status_code == 404
    assert response.get_json() == {"error": "Word 'nonexistent' not found."}

def test_kanji_details_api_missing_character_parameter(client):
    response = client.get("/kanji_details")
    assert response.status_code == 400
    assert response.get_json() == {"error": "Missing 'character' parameter"}

def test_kanji_details_api_kanji_not_found(client):
    response = client.get("/kanji_details?character= inexistente")
    assert response.status_code == 404
    assert response.get_json() == {"error": "Kanji not found"}

def test_kanji_details_api_returns_data(client):
    response = client.get("/kanji_details?character=日")
    assert response.status_code == 200
    data = response.get_json()
    assert data["character"] == "日"
    assert "meaning" in data
    assert "on_reading" in data
    assert "kun_reading" in data
    assert "components" in data

def test_graph_api_consolidates_similar_kanjis(client):
    response = client.get("/graph?word=日本語")
    assert response.status_code == 200
    data = response.get_json()
    kanji_node = [node for node in data["nodes"] if node["id"] == "日"][0]
    assert kanji_node is not None
    assert len(kanji_node["meanings"]) > 1
