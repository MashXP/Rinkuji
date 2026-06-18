"""
Vercel Serverless Function: /search_by_kanji
Proxies single-kanji search to the Jisho.org API with slug consolidation.
"""
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import sys, os

sys.path.insert(0, os.path.dirname(__file__))
from _shared import search_by_kanji, add_cors_headers


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        kanji = params.get('kanji', [''])[0]
        body, status = search_by_kanji(kanji)
        self._respond(status, body)

    def _respond(self, status: int, body):
        self.send_response(status)
        for k, v in add_cors_headers({}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())
