import pytest # type: ignore
from backend.src.services.graph_service import GraphService
from backend.src.models.word import Word
from backend.src.models.kanji import Kanji

def test_generate_graph_for_word():
    service = GraphService()
    words = service.data_loader.load_data()
    target_word = next((word for word in words if word.text == "日本語"), None)
    assert target_word is not None

    graph = service.generate_graph([target_word])

    assert "nodes" in graph
    assert "edges" in graph

    # Check nodes
    node_ids = {node["id"] for node in graph["nodes"]}
    assert 1 in node_ids
    assert 101 in node_ids
    assert 102 in node_ids
    assert 103 in node_ids

    # Check links
    links = {(link["source"], link["target"]) for link in graph["edges"]}
    assert (1, 101) in links
    assert (1, 102) in links
    assert (1, 103) in links

def test_generate_graph_for_nonexistent_word():
    service = GraphService()
    graph = service.generate_graph([]) # Pass an empty list for nonexistent word
    assert graph == {"nodes": [], "edges": []}
