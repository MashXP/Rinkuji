from flask import Blueprint, request, jsonify # pyright: ignore[reportMissingImports]
from backend.src.services.graph_service import GraphService

graph_bp = Blueprint('graph', __name__)
graph_service = GraphService()
words = graph_service.data_loader.load_data()
words_map = {word.text: word for word in words}
all_kanji = graph_service.data_loader.get_all_kanji(words)


@graph_bp.route('/graph', methods=['GET'])
def get_graph():
    word_text = request.args.get('word')
    if not word_text:
        return jsonify({"error": "Missing 'word' parameter"}), 400

    target_word = words_map.get(word_text)
    if not target_word:
        return jsonify({"error": f"Word '{word_text}' not found."}), 404

    graph = graph_service.generate_graph([target_word])
    return jsonify(graph)


@graph_bp.route('/kanji_details', methods=['GET'])
def get_kanji_details():
    character = request.args.get('character')
    if not character:
        return jsonify({"error": "Missing 'character' parameter"}), 400

    # This is inefficient, but for now it will work.
    # A better approach would be to have a map of kanji characters to kanji objects.
    target_kanji = None
    for kanji in all_kanji.values():
        if kanji.character == character:
            target_kanji = kanji
            break

    if target_kanji:
        # The get_kanji_details method doesn't exist on GraphService.
        # I will assume the intention is to return the kanji details as a dict.
        return jsonify({
            'id': target_kanji.id,
            'character': target_kanji.character,
            'meaning': target_kanji.meaning,
            'on_reading': target_kanji.on_reading,
            'kun_reading': target_kanji.kun_reading,
            'components': target_kanji.components,
        })
    return jsonify({"error": "Kanji not found"}), 404
