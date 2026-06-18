"""
Vercel Serverless Function: /api/suggestions
Returns word/reading/meaning suggestions from local data.json.
"""
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import sys, os

sys.path.insert(0, os.path.dirname(__file__))
from _shared import load_raw_data, add_cors_headers


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        if 'q' not in params:
            self._respond(400, {'error': 'Query parameter "q" is required.'})
            return

        query = params['q'][0].lower()
        if not query:
            self._respond(200, [])
            return

        try:
            data = load_raw_data()
        except Exception as e:
            self._respond(500, {'error': f'Failed to load data: {e}'})
            return

        suggestions = set()
        for entry in data:
            if 'text' in entry and isinstance(entry['text'], str) and query in entry['text'].lower():
                suggestions.add(entry['text'])
            if 'reading' in entry and isinstance(entry['reading'], str) and query in entry['reading'].lower():
                suggestions.add(entry['reading'])
            if 'meaning' in entry:
                if isinstance(entry['meaning'], str) and query in entry['meaning'].lower():
                    suggestions.add(entry['meaning'])
                elif isinstance(entry['meaning'], list):
                    for m in entry['meaning']:
                        if isinstance(m, str) and query in m.lower():
                            suggestions.add(m)

        self._respond(200, list(suggestions)[:10])

    def _respond(self, status: int, body):
        self.send_response(status)
        for k, v in add_cors_headers({}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())
