import pytest # type: ignore
from unittest.mock import MagicMock
from backend.src.services.graph_service import GraphService
from backend.src.models.word import Word
from backend.src.models.kanji import Kanji

def test_generate_graph_for_word():
    jisho_service = MagicMock()
    jisho_service.search_by_kanji.return_value = ({}, 200)
    service = GraphService(jisho_service)
    words = service.data_loader.load_data()
    target_word = next((word for word in words if word.text == "日本語"), None)
    assert target_word is not None

    graph = service.generate_graph([target_word])

    assert "nodes" in graph
    assert "edges" in graph

    # Check nodes
    node_ids = {node["id"] for node in graph["nodes"]}
    assert 1 in node_ids

def test_generate_graph_for_nonexistent_word():
    jisho_service = MagicMock()
    service = GraphService(jisho_service)
    graph = service.generate_graph([]) # Pass an empty list for nonexistent word
    assert graph == {"nodes": [], "edges": []}
