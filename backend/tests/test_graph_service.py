import pytest # type: ignore
from backend.src.services.graph_service import GraphService
from backend.src.models.word import Word
from backend.src.models.kanji import Kanji

@pytest.fixture
def sample_data():
    kanji1 = Kanji(id=101, character="日", meaning="day, sun", on_reading=["にち"], kun_reading=["ひ"], components=[])
    kanji2 = Kanji(id=102, character="本", meaning="book, origin", on_reading=["ほん"], kun_reading=["もと"], components=[])
    kanji3 = Kanji(id=103, character="語", meaning="language", on_reading=["ご"], kun_reading=["かた.る"], components=[])
    word1 = Word(id=1, text="日本語", reading="にほんご", meaning="Japanese language", kanji_components=[kanji1, kanji2, kanji3])
    
    # Simplified data for testing graph service
    return {
        "words": {
            "日本語": word1
        },
        "kanji": {
            "日": kanji1,
            "本": kanji2,
            "語": kanji3
        },
        "word_kanji_map": {
            "日本語": ["日", "本", "語"]
        },
        "kanji_components_map": {
            "語": ["口"] # Example component
        }
    }

def test_generate_graph_for_word(sample_data):
    service = GraphService(words=sample_data["words"], kanji=sample_data["kanji"], word_kanji_map=sample_data["word_kanji_map"], kanji_components_map=sample_data["kanji_components_map"])
    graph = service.generate_graph([sample_data["words"]["日本語"]])

    assert "nodes" in graph
    assert "links" in graph

    # Check nodes
    node_ids = {node["id"] for node in graph["nodes"]}
    assert "word-1" in node_ids
    assert "kanji-101" in node_ids
    assert "kanji-102" in node_ids
    assert "kanji-103" in node_ids

    # Check links
    links = {(link["source"], link["target"]) for link in graph["links"]}
    assert ("word-1", "kanji-101") in links
    assert ("word-1", "kanji-102") in links
    assert ("word-1", "kanji-103") in links

def test_generate_graph_for_nonexistent_word(sample_data):
    service = GraphService(words=sample_data["words"], kanji=sample_data["kanji"], word_kanji_map=sample_data["word_kanji_map"], kanji_components_map=sample_data["kanji_components_map"])
    graph = service.generate_graph([]) # Pass an empty list for nonexistent word
    assert graph == {"nodes": [], "links": []}

def test_get_kanji_details(sample_data):
    service = GraphService(words=sample_data["words"], kanji=sample_data["kanji"], word_kanji_map=sample_data["word_kanji_map"], kanji_components_map=sample_data["kanji_components_map"])
    details = service.get_kanji_details("日")
    assert details is not None # Add this assertion
    assert details["character"] == "日"
    assert details["meaning"] == "day, sun"

def test_get_kanji_details_nonexistent(sample_data):
    service = GraphService(words=sample_data["words"], kanji=sample_data["kanji"], word_kanji_map=sample_data["word_kanji_map"], kanji_components_map=sample_data["kanji_components_map"])
    details = service.get_kanji_details(" nonexistent ")
    assert details is None