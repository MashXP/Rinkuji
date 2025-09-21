import json

def test_get_suggestions_success(client):
    """
    Tests that the /api/suggestions endpoint returns a successful response
    with a list of strings.
    """
    response = client.get('/api/suggestions?q=test')
    assert response.status_code == 200
    assert response.content_type == 'application/json'
    
    data = json.loads(response.data)
    assert isinstance(data, list)
    if data:
        assert all(isinstance(item, str) for item in data)

def test_get_suggestions_no_query(client):
    """
    Tests that the /api/suggestions endpoint returns a 400 Bad Request
    when the 'q' parameter is missing.
    """
    response = client.get('/api/suggestions')
    assert response.status_code == 400

def test_get_suggestions_empty_query(client):
    """
    Tests that the /api/suggestions endpoint returns an empty list
    when the 'q' parameter is empty.
    """
    response = client.get('/api/suggestions?q=')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data == []