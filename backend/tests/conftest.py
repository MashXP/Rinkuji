import pytest # type: ignore
from flask import Flask # type: ignore
from backend.src.api.graph import graph_bp
from backend.src.services.graph_service import GraphService
from backend.src.models.word import Word
from backend.src.models.kanji import Kanji

@pytest.fixture
def app():
    app = Flask(__name__)
    app.register_blueprint(graph_bp)
    app.config["TESTING"] = True
    
    # Mock data for GraphService
    kanji1 = Kanji(id=101, character="日", meaning="day, sun", on_reading=["にち"], kun_reading=["ひ"], components=[])
    kanji2 = Kanji(id=102, character="本", meaning="book, origin", on_reading=["ほん"], kun_reading=["もと"], components=[])
    kanji3 = Kanji(id=103, character="語", meaning="language", on_reading=["ご"], kun_reading=["かた.る"], components=[])
    word1 = Word(id=1, text="日本語", reading="にほんご", meaning="Japanese language", kanji_components=[kanji1, kanji2, kanji3])

    mock_words = {"日本語": word1}
    mock_kanji = {"日": kanji1, "本": kanji2, "語": kanji3}
    mock_word_kanji_map = {"日本語": ["日", "本", "語"]}
    mock_kanji_components_map = {"語": ["口"]}

    app.graph_service = GraphService(words=mock_words, kanji=mock_kanji, word_kanji_map=mock_word_kanji_map, kanji_components_map=mock_kanji_components_map)
    
    yield app

@pytest.fixture
def client(app):
    return app.test_client()