import os
from typing import List, Dict
from backend.src.models.word import Word
from backend.src.models.kanji import Kanji
from backend.src.services.data_loader_service import DataLoaderService

class GraphService:
    def __init__(self):
        current_dir = os.path.dirname(os.path.abspath(__file__))
        data_file_path = os.path.join(current_dir, '..', '..', 'data.json')
        self.data_loader = DataLoaderService(data_file_path=data_file_path)

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
            for kanji in word.kanji_components:
                # Add kanji node if not already present
                if not any(n['id'] == kanji.id for n in nodes):
                    nodes.append({
                        'id': kanji.id,
                        'text': kanji.character,
                        'type': 'kanji',
                        'meaning': kanji.meaning
                    })
                
                # Add edge from word to kanji
                edges.append({
                    'source': word.id,
                    'target': kanji.id,
                    'type': 'contains'
                })

        return {'nodes': nodes, 'edges': edges}