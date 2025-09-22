import requests
import os
import sys

# Add the project root to sys.path to enable absolute imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from flask import Flask, jsonify, render_template, request # pyright: ignore[reportMissingImports]
from backend.src.services.data_loader_service import DataLoaderService
from backend.src.services.graph_service import GraphService
from backend.src.services.jisho_service import JishoService
from backend.src.api.graph import graph_bp # Import the blueprint
from backend.src.api.suggestions import suggestions_bp # Import the suggestions blueprint
from backend.src.api.changelog import changelog_bp # Import the changelog blueprint
from backend.src.services import github_service

def create_app():
    app = Flask(__name__, static_folder='../frontend/src', template_folder='templates')

    # Initialize services
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_file_path = os.path.join(current_dir, 'data.json')
    app.data_loader = DataLoaderService(data_file_path=data_file_path)
    app.graph_service = GraphService()
    app.jisho_service = JishoService()

    # Register blueprints
    app.register_blueprint(graph_bp) # Register the graph blueprint here
    app.register_blueprint(suggestions_bp) # Register the suggestions blueprint here
    app.register_blueprint(changelog_bp) # Register the changelog blueprint here

    @app.route('/')
    def index(): # The main page is now the Rinku visualization
        """
        Serves the Rinku visualization page.
        Takes an optional 'word' query parameter for the search.
        """
        word = request.args.get('word', '')
        
        # Fetch changelog and extract latest version
        changelog_md = github_service.get_changelog_from_github()
        latest_version_display = "null"
        if changelog_md:
            lines = changelog_md.split('\n')
            for line in lines:
                if line.startswith('## '):
                    # Example: "## Version 1.0.0 - 2025-09-22"
                    version_info = line.replace('## ', '').strip()
                    # Split by " - " to separate version and date
                    parts = version_info.split(' - ', 1)
                    if len(parts) == 2:
                        version_num = parts[0].strip().replace('[', '').replace(']', '') # Removed square brackets
                        print(f"DEBUG: version_num before formatting: {parts[0].strip()}")
                        print(f"DEBUG: version_num after stripping brackets: {version_num}")
                        # version_date = parts[1].strip() # No need for date
                        latest_version_display = f"ver.{version_num}" # Changed to ver.1.0.3 format
                        print(f"DEBUG: latest_version_display: {latest_version_display}")
                    else:
                        latest_version_display = f"ver.{version_info}" # Fallback if format is unexpected
                    break
        
        return render_template('rinku.html', word=word, latest_version=latest_version_display)

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
    
    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True)