import requests
from flask import Flask, jsonify, render_template, request # pyright: ignore[reportMissingImports]
from backend.src.services.data_loader_service import DataLoaderService
from backend.src.services.graph_service import GraphService
from backend.src.services.jisho_service import JishoService

# Initialize Flask App
app = Flask(__name__, static_folder='../frontend/src', template_folder='templates')

# Initialize services
app.data_loader = DataLoaderService(data_file_path='data.json')
app.graph_service = GraphService()
app.jisho_service = JishoService()

@app.route('/')
def index(): # The main page is now the Rinku visualization
    """
    Serves the Rinku visualization page.
    Takes an optional 'word' query parameter for the search.
    """
    word = request.args.get('word', '')
    return render_template('rinku.html', word=word)

@app.route('/search_words')
def search_words():
    """
    An API endpoint that proxies search requests to the Jisho.org API.
    It takes a 'query' parameter from the request URL.
    """
    query = request.args.get('query', '')
    response_data, status_code = app.jisho_service.search_words(query)
    return jsonify(response_data), status_code

@app.route('/search_by_kanji')
def search_by_kanji():
    """
    An API endpoint that finds words containing a specific kanji.
    It takes a 'kanji' parameter from the request URL.
    """
    kanji = request.args.get('kanji', '')
    response_data, status_code = app.jisho_service.search_by_kanji(kanji)
    return jsonify(response_data), status_code

@app.route('/api/graph')
def get_graph_data():
    """
    API endpoint to generate and return graph data for a given word.
    """
    word_text = request.args.get('word', '')
    if not word_text:
        return jsonify({"error": "A 'word' parameter is required."}), 400

    all_words = app.data_loader.load_data()

    # Filter for the requested word
    target_words = [w for w in all_words if w.text == word_text]
    if not target_words:
        return jsonify({"error": f"Word '{word_text}' not found in data."}), 404

    graph_data = app.graph_service.generate_graph(target_words)

    return jsonify(graph_data)

@app.route('/about')
def about():
    return render_template('about.html')

if __name__ == '__main__':
    app.run(debug=True)
