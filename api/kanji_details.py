"""
Vercel Serverless Function: /kanji_details
Returns details for a single kanji character from local data.json.
"""
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import sys, os

sys.path.insert(0, os.path.dirname(__file__))
from _shared import load_words, add_cors_headers


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        character = params.get('character', [None])[0]
        if not character:
            self._respond(400, {"error": "Missing 'character' parameter"})
            return

        try:
            words = load_words()
        except Exception as e:
            self._respond(500, {"error": f"Failed to load data: {e}"})
            return

        target_kanji = None
        for word in words:
            for kanji in word.kanji_components:
                if kanji.character == character:
                    target_kanji = kanji
                    break
            if target_kanji:
                break

        if target_kanji:
            self._respond(200, {
                'id': target_kanji.id,
                'character': target_kanji.character,
                'meaning': target_kanji.meaning,
                'on_reading': target_kanji.on_reading,
                'kun_reading': target_kanji.kun_reading,
                'components': target_kanji.components,
            })
        else:
            self._respond(404, {"error": "Kanji not found"})

    def _respond(self, status: int, body):
        self.send_response(status)
        for k, v in add_cors_headers({}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())
