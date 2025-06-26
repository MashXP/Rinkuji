import requests
from flask import Flask, jsonify, render_template, request

# Initialize Flask App
app = Flask(__name__)

# Jisho.org API endpoint for word searches
JISHO_API_URL = "https://jisho.org/api/v1/search/words"

@app.route('/')
def index():
    """
    Serves the main HTML page of the application.
    """
    return render_template('index.html')

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

if __name__ == '__main__':
    app.run(debug=True)