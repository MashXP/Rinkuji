import os
from typing import List, Dict
from backend.src.models.word import Word
from backend.src.models.kanji import Kanji
from backend.src.services.data_loader_service import DataLoaderService
from backend.src.services.jisho_service import JishoService

class GraphService:
    def __init__(self, jisho_service: JishoService):
        current_dir = os.path.dirname(os.path.abspath(__file__))
        data_file_path = os.path.join(current_dir, '..', '..', 'data.json')
        self.data_loader = DataLoaderService(data_file_path=data_file_path)
        self.jisho_service = jisho_service

    def generate_graph(self, target_words: List[Word]) -> Dict:
        nodes = []
        edges = []
        
        # Add target words as nodes
        for word in target_words:
            nodes.append({
                'id': word.id,
                'text': word.text,
                'type': 'word',
                'meaning': word.meaning,
                'reading': word.reading
            })

            # Add kanji components as nodes and edges
            for kanji_char in word.kanji_components:
                kanji_data, _ = self.jisho_service.search_by_kanji(kanji_char.character)
                for kanji in kanji_data.get("data", []):
                    if isinstance(kanji, dict):
                        slug = kanji.get('slug')
                        if slug and not any(n['id'] == slug for n in nodes):
                            nodes.append({
                                'id': slug,
                                'text': slug,
                                'type': 'kanji',
                                'meanings': kanji.get('meanings', []),
                                'is_consolidated': kanji.get('is_consolidated', False)
                            })
                        if slug:
                            # Add edge from word to kanji
                            edges.append({
                                'source': word.id,
                                'target': slug,
                                'type': 'contains'
                            })

        return {'nodes': nodes, 'edges': edges}