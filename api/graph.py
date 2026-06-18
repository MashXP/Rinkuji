"""
Vercel Serverless Function: /api/graph and /graph
Returns graph node/edge data for a given word from data.json.
"""
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import sys, os

sys.path.insert(0, os.path.dirname(__file__))
from _shared import load_words, generate_graph, add_cors_headers


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        word_text = params.get('word', [None])[0]
        if not word_text:
            self._respond(400, {"error": "Missing 'word' parameter"})
            return

        try:
            words = load_words()
        except Exception as e:
            self._respond(500, {"error": f"Failed to load data: {e}"})
            return

        words_map = {w.text: w for w in words}
        target_word = words_map.get(word_text)
        if not target_word:
            self._respond(404, {"error": f"Word '{word_text}' not found."})
            return

        graph = generate_graph([target_word])
        self._respond(200, graph)

    def _respond(self, status: int, body):
        self.send_response(status)
        for k, v in add_cors_headers({}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())
