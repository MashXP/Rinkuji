from flask import Blueprint, request, jsonify # type: ignore
from backend.src.services.graph_service import GraphService
from backend.src.models.word import Word
from backend.src.models.kanji import Kanji

graph_bp = Blueprint('graph', __name__)

# Dummy data for GraphService
# In a real application, this would be loaded from a database or a more robust data store
# For now, we'll use dummy data to make the API functional for testing

# Fix: Use plural field names 'on_readings' and 'kun_readings'
# Fix: Add components to all kanji for consistency and to match expected data structure
dummy_kanji1 = Kanji(id=101, character="日", meaning="day, sun", on_reading=["にち"], kun_reading=["ひ"], components=[])
dummy_kanji2 = Kanji(id=102, character="本", meaning="book, origin", on_reading=["ほん"], kun_reading=["もと"], components=["木"])
dummy_kanji3 = Kanji(id=103, character="語", meaning="language", on_reading=["ご"], kun_reading=["かた.る"], components=["口", "吾"])

dummy_word1 = Word(id=1, text="日本語", reading="にほんご", meaning="Japanese language", kanji_components=[dummy_kanji1, dummy_kanji2, dummy_kanji3])

dummy_words = {"日本語": dummy_word1}
dummy_kanji = {"日": dummy_kanji1, "本": dummy_kanji2, "語": dummy_kanji3}
dummy_word_kanji_map = {"日本語": ["日", "本", "語"]}
dummy_kanji_components_map = {"語": ["口", "吾"]} # Fix: Added a missing component for 語

graph_service = GraphService(words=dummy_words, kanji=dummy_kanji, word_kanji_map=dummy_word_kanji_map, kanji_components_map=dummy_kanji_components_map)

@graph_bp.route('/graph', methods=['GET'])
def get_graph():
    word_text = request.args.get('word')
    if not word_text:
        return jsonify({"error": "Missing 'word' parameter"}), 400
    
    target_word = graph_service.words.get(word_text)
    if not target_word:
        return jsonify({"error": f"Word '{word_text}' not found in dummy data."}), 404

    graph = graph_service.generate_graph([target_word])
    return jsonify(graph)

@graph_bp.route('/kanji_details', methods=['GET'])
def get_kanji_details():
    character = request.args.get('character')
    if not character:
        return jsonify({"error": "Missing 'character' parameter"}), 400
    
    details = graph_service.get_kanji_details(character)
    if details:
        return jsonify(details)
    return jsonify({"error": "Kanji not found"}), 404
