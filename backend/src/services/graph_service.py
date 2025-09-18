from typing import List, Dict, Any, Optional
from backend.src.models.word import Word
from backend.src.models.kanji import Kanji
from backend.src.services.data_loader_service import DataLoaderService

class GraphService:
    def __init__(self, words: Optional[Dict[str, Word]] = None, kanji: Optional[Dict[str, Kanji]] = None, word_kanji_map: Optional[Dict[str, List[str]]] = None, kanji_components_map: Optional[Dict[str, List[str]]] = None):
        if words is not None and kanji is not None and word_kanji_map is not None and kanji_components_map is not None:
            self.words = words
            self.kanji = kanji
            self.word_kanji_map = word_kanji_map
            self.kanji_components_map = kanji_components_map
        else:
            # Default initialization using DataLoaderService
            data_loader = DataLoaderService(data_file_path='data.json')
            all_words = data_loader.load_data()
            self.words = {word.text: word for word in all_words}
            # For simplicity, we'll extract kanji and maps from words here
            self.kanji = {}
            self.word_kanji_map = {}
            for word in all_words:
                self.word_kanji_map[word.text] = [k.character for k in word.kanji_components]
                for k in word.kanji_components:
                    self.kanji[k.character] = k
            # This part needs to be properly implemented if kanji_components_map is used
            self.kanji_components_map = {}

    def generate_graph(self, target_words: List[Word]) -> Dict[str, List[Dict[str, Any]]]:
        nodes = []
        links = []
        
        word_nodes = {}
        kanji_nodes = {}

        # Create nodes for words and kanji
        for word in target_words:
            if word.id not in word_nodes:
                word_nodes[word.id] = {'id': f'word-{word.id}', 'label': word.text, 'type': 'word'}
                nodes.append(word_nodes[word.id])

            for kanji in word.kanji_components:
                if kanji.id not in kanji_nodes:
                    kanji_nodes[kanji.id] = {'id': f'kanji-{kanji.id}', 'label': kanji.character, 'type': 'kanji'}
                    nodes.append(kanji_nodes[kanji.id])
                
                # Link word to kanji
                links.append({'source': word_nodes[word.id]['id'], 'target': kanji_nodes[kanji.id]['id'], 'type': 'contains'})

        # Add links for kanji components (if any)
        # This part would require more sophisticated logic to traverse kanji components
        # For now, we'll keep it simple and just link words to their direct kanji

        return {'nodes': nodes, 'links': links}

    def get_kanji_details(self, character: str) -> Optional[Dict[str, Any]]:
        kanji_obj = self.kanji.get(character)
        if kanji_obj:
            return {
                "character": kanji_obj.character,
                "meaning": kanji_obj.meaning,
                "on_reading": kanji_obj.on_reading,
                "kun_reading": kanji_obj.kun_reading,
                "components": kanji_obj.components
            }
        return None