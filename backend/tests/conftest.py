import pytest # type: ignore
from backend.app import create_app # Import the create_app function

@pytest.fixture
def app():
    app = create_app() # Call create_app to get a fresh app instance
    app.config["TESTING"] = True
    yield app

@pytest.fixture
def client(app):
    return app.test_client()