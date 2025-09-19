import json
import os # Import os
from typing import List, Dict
from backend.src.models.word import Word
from backend.src.models.kanji import Kanji

class DataLoaderService:
    def __init__(self):
        # data_file_path is no longer passed as an argument
        self._words_cache = None

    def load_data(self) -> List[Word]:
        if self._words_cache:
            return self._words_cache

        # Construct absolute path to data.json relative to this file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # Go up two levels (from src/services to backend/)
        # Then append data.json
        data_file_path = os.path.join(current_dir, '..', '..', 'data.json')

        with open(data_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        words = []
        for item in data:
            kanji_components = []
            for kc_data in item.get('kanji_components', []):
                kanji = Kanji(
                    id=kc_data['id'],
                    character=kc_data['character'],
                    meaning=kc_data['meaning'],
                    on_reading=kc_data.get('on_reading', []),
                    kun_reading=kc_data.get('kun_reading', []),
                    components=kc_data.get('components', [])
                )
                kanji_components.append(kanji)

            word = Word(
                id=item['id'],
                text=item['text'],
                reading=item['reading'],
                meaning=item['meaning'],
                kanji_components=kanji_components
            )
            words.append(word)
        
        self._words_cache = words
        return words

    def get_suggestions(self, query: str) -> List[str]:
        words = self.load_data()
        suggestions = []
        if query:
            for word in words:
                if word.text.startswith(query):
                    suggestions.append(word.text)
        return suggestions

    def get_all_kanji(self, words: List[Word]) -> Dict[int, Kanji]:
        all_kanji = {}
        for word in words:
            for kanji in word.kanji_components:
                all_kanji[kanji.id] = kanji
        return all_kanji