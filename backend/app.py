import requests
from flask import Flask, jsonify, render_template, request

# Initialize Flask App
app = Flask(__name__, static_folder='../frontend/src', template_folder='templates')

# Jisho.org API endpoint for word searches
JISHO_API_URL = "https://jisho.org/api/v1/search/words"

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
    if not query:
        return jsonify({"error": "A 'query' parameter is required."}), 400

    api_url = f"{JISHO_API_URL}?keyword={query}"

    try:
        response = requests.get(api_url)
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        print(f"Error fetching from Jisho API: {e}")
        return jsonify({"error": "Failed to fetch data from the external API."}), 502

@app.route('/search_by_kanji')
def search_by_kanji():
    """
    An API endpoint that finds words containing a specific kanji.
    It takes a 'kanji' parameter from the request URL.
    """
    kanji = request.args.get('kanji', '')
    if not kanji or len(kanji) != 1:
        return jsonify({"error": "A single 'kanji' character parameter is required."}), 400

    # The Jisho API is smart enough to find words containing a kanji by just searching for the kanji itself.
    api_url = f"{JISHO_API_URL}?keyword={kanji}"

    try:
        response = requests.get(api_url)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        print(f"Error fetching from Jisho API: {e}")
        return jsonify({"error": "Failed to fetch data from the external API."}), 502

@app.route('/about')
def about():
    return render_template('about.html')

if __name__ == '__main__':
    app.run(debug=True)