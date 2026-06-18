"""
Vercel Serverless Function: /api/changelog
Fetches the CHANGELOG.md from the GitHub repository.
"""
from http.server import BaseHTTPRequestHandler
import json
import sys, os

sys.path.insert(0, os.path.dirname(__file__))
from _shared import get_changelog_from_github, add_cors_headers


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        changelog_md = get_changelog_from_github()
        if changelog_md:
            self._respond(200, {'changelog': changelog_md})
        else:
            self._respond(500, {'error': 'Failed to fetch changelog'})

    def _respond(self, status: int, body):
        self.send_response(status)
        for k, v in add_cors_headers({}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())
