import json
from typing import List, Dict
from backend.src.models.word import Word
from backend.src.models.kanji import Kanji

class DataLoaderService:
    def __init__(self, data_file_path: str):
        self.data_file_path = data_file_path

    def load_data(self) -> List[Word]:
        with open(self.data_file_path, 'r', encoding='utf-8') as f:
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
        return words

    def get_all_kanji(self, words: List[Word]) -> Dict[int, Kanji]:
        all_kanji = {}
        for word in words:
            for kanji in word.kanji_components:
                all_kanji[kanji.id] = kanji
        return all_kanji
