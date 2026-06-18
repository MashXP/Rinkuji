"""
Shared utilities for Rinkuji Vercel serverless functions.
This module provides data loading, Jisho API access, and graph generation
without relying on Flask's application context or app-level state.
"""
import json
import os
import re
import requests as _requests

# ---------------------------------------------------------------------------
# Path helpers
# ---------------------------------------------------------------------------

def _data_file_path() -> str:
    """Resolve path to data.json relative to this file (api/_shared.py).
    data.json lives at the project root: one level above api/.
    """
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(here, '..', 'backend', 'data.json')


# ---------------------------------------------------------------------------
# Models (inline — avoids circular import issues with absolute package paths)
# ---------------------------------------------------------------------------

class Kanji:
    def __init__(self, id, character, meaning, on_reading, kun_reading, components):
        self.id = id
        self.character = character
        self.meaning = meaning
        self.on_reading = on_reading
        self.kun_reading = kun_reading
        self.components = components

    @classmethod
    def from_dict(cls, data):
        return cls(
            id=data['id'],
            character=data['character'],
            meaning=data['meaning'],
            on_reading=data.get('on_reading', []),
            kun_reading=data.get('kun_reading', []),
            components=data.get('components', []),
        )

    def to_dict(self):
        return {
            'id': self.id,
            'character': self.character,
            'meaning': self.meaning,
            'on_reading': self.on_reading,
            'kun_reading': self.kun_reading,
            'components': self.components,
        }


class Word:
    def __init__(self, id, text, reading, meaning, kanji_components):
        self.id = id
        self.text = text
        self.reading = reading
        self.meaning = meaning
        self.kanji_components = kanji_components

    @classmethod
    def from_dict(cls, data):
        kanji_components = [Kanji.from_dict(kc) for kc in data.get('kanji_components', [])]
        return cls(
            id=data['id'],
            text=data['text'],
            reading=data['reading'],
            meaning=data['meaning'],
            kanji_components=kanji_components,
        )


# ---------------------------------------------------------------------------
# Data loader
# ---------------------------------------------------------------------------

_words_cache = None

def load_words():
    """Load and cache word data from data.json."""
    global _words_cache
    if _words_cache is not None:
        return _words_cache
    with open(_data_file_path(), 'r', encoding='utf-8') as f:
        data = json.load(f)
    _words_cache = [Word.from_dict(item) for item in data]
    return _words_cache

def load_raw_data():
    """Load raw JSON list from data.json (used by suggestions)."""
    with open(_data_file_path(), 'r', encoding='utf-8') as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Jisho service
# ---------------------------------------------------------------------------

JISHO_API_URL = "https://jisho.org/api/v1/search/words"

def is_japanese(text: str) -> bool:
    return bool(re.search(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]', text))

def search_words(query: str):
    """Proxy search to Jisho words API, filtering non-Japanese results."""
    if not query:
        return {"error": "A 'query' parameter is required."}, 400
    try:
        resp = _requests.get(f"{JISHO_API_URL}?keyword={query}", timeout=10)
        resp.raise_for_status()
        data = resp.json()
        if 'data' in data:
            data['data'] = [
                item for item in data['data']
                if 'slug' in item and is_japanese(item['slug'])
            ]
        return data, 200
    except _requests.exceptions.RequestException as e:
        print(f"Jisho search_words error: {e}")
        return {"error": "Failed to fetch data from the external API."}, 502


def search_by_kanji(kanji: str):
    """Proxy single-kanji search to Jisho, consolidating duplicate slugs."""
    if not kanji or len(kanji) != 1:
        return {"error": "A single 'kanji' character parameter is required."}, 400
    try:
        resp = _requests.get(f"{JISHO_API_URL}?keyword={kanji}", timeout=10)
        resp.raise_for_status()
        data = resp.json()

        processed = {}
        for result in data.get("data", []):
            slug = result.get("slug")
            if slug and is_japanese(slug):
                base = slug.split('-')[0]
                processed.setdefault(base, []).append(result)

        final = []
        for base, results in processed.items():
            if len(results) > 1:
                final.append({
                    "slug": base,
                    "meanings": [
                        res.get("senses", [{}])[0].get("english_definitions", [])[0] or ""
                        for res in results
                    ],
                    "readings": [
                        jp.get("reading")
                        for res in results
                        for jp in res.get("japanese", [])
                        if jp.get("reading")
                    ],
                    "is_consolidated": True,
                    "consolidated_members": results,
                })
            else:
                final.append(results[0])
        return {"data": final}, 200
    except _requests.exceptions.RequestException as e:
        print(f"Jisho search_by_kanji error: {e}")
        return {"error": "Failed to fetch data from the external API."}, 502


# ---------------------------------------------------------------------------
# Graph generation
# ---------------------------------------------------------------------------

def generate_graph(target_words):
    nodes = []
    edges = []
    for word in target_words:
        nodes.append({
            'id': word.id,
            'text': word.text,
            'type': 'word',
            'meaning': word.meaning,
            'reading': word.reading,
        })
        for kanji_char in word.kanji_components:
            kanji_data, _ = search_by_kanji(kanji_char.character)
            for kanji in kanji_data.get("data", []):
                if isinstance(kanji, dict):
                    slug = kanji.get('slug')
                    if slug and not any(n['id'] == slug for n in nodes):
                        nodes.append({
                            'id': slug,
                            'text': slug,
                            'type': 'kanji',
                            'meanings': kanji.get('meanings', []),
                            'is_consolidated': kanji.get('is_consolidated', False),
                        })
                    if slug:
                        edges.append({'source': word.id, 'target': slug, 'type': 'contains'})
    return {'nodes': nodes, 'edges': edges}


# ---------------------------------------------------------------------------
# Changelog
# ---------------------------------------------------------------------------

def get_changelog_from_github():
    url = "https://raw.githubusercontent.com/MashXP/Rinkuji/main/CHANGELOG.md"
    try:
        resp = _requests.get(url, timeout=10)
        resp.raise_for_status()
        return resp.text
    except _requests.exceptions.RequestException as e:
        print(f"Changelog fetch error: {e}")
        return None


# ---------------------------------------------------------------------------
# CORS helper
# ---------------------------------------------------------------------------

def add_cors_headers(headers: dict) -> dict:
    headers['Access-Control-Allow-Origin'] = '*'
    headers['Content-Type'] = 'application/json'
    return headers
