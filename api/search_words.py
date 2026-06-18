"""
Vercel Serverless Function: /search_words
Proxies search requests to the Jisho.org API (word search).
"""
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import sys, os

sys.path.insert(0, os.path.dirname(__file__))
from _shared import search_words, add_cors_headers


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        query = params.get('query', [''])[0]
        body, status = search_words(query)
        self._respond(status, body)

    def _respond(self, status: int, body):
        self.send_response(status)
        for k, v in add_cors_headers({}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())
