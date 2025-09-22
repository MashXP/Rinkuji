from flask import Blueprint, request, jsonify # pyright: ignore[reportMissingImports]
import json
import os

suggestions_bp = Blueprint('suggestions', __name__)

# Load data.json once when the blueprint is created
def load_data():
    script_dir = os.path.dirname(__file__)
    data_path = os.path.abspath(os.path.join(script_dir, '..', '..', 'data.json'))
    try:
        with open(data_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: data.json not found at {data_path}")
        return []

DATA = load_data()

@suggestions_bp.route('/api/suggestions', methods=['GET'])
def get_suggestions():
    if 'q' not in request.args: # Check if 'q' parameter is missing
        return jsonify({'error': 'Query parameter "q" is required.'}), 400

    query = request.args.get('q', '').lower()
    if not query: # Handle empty query string
        return jsonify([]), 200

    suggestions = []
    for entry in DATA:
        # Search in 'text' field
        if 'text' in entry and isinstance(entry['text'], str) and query in entry['text'].lower():
            suggestions.append(entry['text'])

        # Search in 'reading' field
        if 'reading' in entry and isinstance(entry['reading'], str) and query in entry['reading'].lower():
            suggestions.append(entry['reading'])

        # Search in 'meaning' field (can be a string or a list of strings)
        if 'meaning' in entry:
            if isinstance(entry['meaning'], str) and query in entry['meaning'].lower():
                suggestions.append(entry['meaning'])
            elif isinstance(entry['meaning'], list):
                for meaning in entry['meaning']:
                    if isinstance(meaning, str) and query in meaning.lower():
                        suggestions.append(meaning)

    # Limit to a reasonable number of unique suggestions
    return jsonify(list(set(suggestions))[:10]), 200