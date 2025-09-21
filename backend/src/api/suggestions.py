from flask import Blueprint, request, jsonify # pyright: ignore[reportMissingImports]
import json
import os

suggestions_bp = Blueprint('suggestions', __name__)

# Load data.json once when the blueprint is created
def load_data():
    script_dir = os.path.dirname(__file__)
    data_path = os.path.join(script_dir, '..\..\data.json') # Corrected path
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

    query = request.args.get('q', '')
    if not query: # Handle empty query string
        return jsonify([]), 200

    # Filter English meanings from the loaded data
    # Assuming each entry in DATA has an 'meanings' field which is a list of strings
    # And each meaning might contain English words
    english_suggestions = []
    for entry in DATA:
        if 'meaning' in entry and isinstance(entry['meaning'], list):
            for meaning in entry['meaning']:
                if isinstance(meaning, str) and query.lower() in meaning.lower():
                    english_suggestions.append(meaning)
    
    # Limit to a reasonable number of suggestions
    return jsonify(list(set(english_suggestions))[:10]), 200 # Return unique suggestions, limited to 10