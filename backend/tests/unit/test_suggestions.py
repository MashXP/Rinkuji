import pytest
from unittest.mock import patch
from backend.src.api.suggestions import get_suggestions, suggestions_bp, DATA # Import DATA for mocking
from flask import Flask

@pytest.fixture
def app():
    app = Flask(__name__)
    app.register_blueprint(suggestions_bp) # Register the blueprint
    # We need to push an application context for request.args to work
    with app.app_context():
        yield app

@pytest.fixture
def client(app):
    return app.test_client()

# Mock the DATA loaded from data.json
@pytest.fixture(autouse=True)
def mock_data():
    mock_data_content = [
        {"id": 1, "text": "apple", "reading": "アップル", "meaning": ["a common fruit", "red fruit"]},
        {"id": 2, "text": "banana", "reading": "バナナ", "meaning": ["a yellow fruit"]},
        {"id": 3, "text": "orange", "reading": "オレンジ", "meaning": ["an orange fruit", "citrus fruit"]},
        {"id": 4, "text": "grape", "reading": "グレープ", "meaning": ["a small fruit", "purple fruit"]},
        {"id": 5, "text": "pineapple", "reading": "パイナップル", "meaning": ["a tropical fruit", "sweet fruit"]},
        {"id": 6, "text": "red", "reading": "レッド", "meaning": ["a color", "red color"]},
        {"id": 7, "text": "blue", "reading": "ブルー", "meaning": ["a color", "blue color"]},
    ]
    with patch('backend.src.api.suggestions.DATA', mock_data_content):
        yield

def test_get_suggestions_valid_query(client):
    response = client.get('/api/suggestions?q=fruit')
    assert response.status_code == 200
    expected_suggestions = ["a common fruit", "red fruit", "a yellow fruit", "an orange fruit", "citrus fruit", "a small fruit", "purple fruit", "a tropical fruit", "sweet fruit"]
    assert all(s in response.json for s in expected_suggestions)
    assert len(response.json) <= 10

def test_get_suggestions_no_match(client):
    response = client.get('/api/suggestions?q=xyz')
    assert response.status_code == 200
    assert response.json == []

def test_get_suggestions_empty_query(client):
    response = client.get('/api/suggestions?q=')
    assert response.status_code == 200
    assert response.json == []

def test_get_suggestions_case_insensitivity(client):
    response = client.get('/api/suggestions?q=Fruit')
    assert response.status_code == 200
    expected_suggestions = ["a common fruit", "red fruit", "a yellow fruit", "an orange fruit", "citrus fruit", "a small fruit", "purple fruit", "a tropical fruit", "sweet fruit"]
    assert all(s in response.json for s in expected_suggestions)
    assert len(response.json) <= 10

def test_get_suggestions_limit(client):
    response = client.get('/api/suggestions?q=fruit')
    assert response.status_code == 200
    assert len(response.json) <= 10

def test_get_suggestions_missing_query_param(client):
    response = client.get('/api/suggestions')
    assert response.status_code == 400
    assert response.json == {'error': 'Query parameter "q" is required.'}

@patch('builtins.open', side_effect=FileNotFoundError)
@patch('os.path.exists', return_value=False)
def test_load_data_file_not_found(mock_exists, mock_open):
    # To test FileNotFoundError, we need to re-import suggestions
    # so that load_data() is called again.
    import importlib
    import backend.src.api.suggestions
    importlib.reload(backend.src.api.suggestions)
    # Ensure DATA is empty when file not found
    assert backend.src.api.suggestions.DATA == []
    # Ensure the error message was printed (you might need to capture stdout for a real assertion)
    # For now, just checking that DATA is empty is sufficient to show the error was handled.

# Test cases for filtering edge cases
def test_get_suggestions_entry_without_meaning(client):
    mock_data_content = [
        {"id": 1, "text": "apple", "reading": "アップル"},
    ]
    with patch('backend.src.api.suggestions.DATA', mock_data_content):
        response = client.get('/api/suggestions?q=apple')
        assert response.status_code == 200
        assert response.json == []

def test_get_suggestions_meaning_not_list(client):
    mock_data_content = [
        {"id": 1, "text": "apple", "reading": "アップル", "meaning": "a common fruit"},
    ]
    with patch('backend.src.api.suggestions.DATA', mock_data_content):
        response = client.get('/api/suggestions?q=fruit')
        assert response.status_code == 200
        assert response.json == []

def test_get_suggestions_meaning_item_not_string(client):
    mock_data_content = [
        {"id": 1, "text": "apple", "reading": "アップル", "meaning": ["a common fruit", 123]},
    ]
    with patch('backend.src.api.suggestions.DATA', mock_data_content):
        response = client.get('/api/suggestions?q=fruit')
        assert response.status_code == 200
        assert response.json == ["a common fruit"]