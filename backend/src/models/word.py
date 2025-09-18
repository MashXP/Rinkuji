from typing import List, Dict, Any
from backend.src.models.kanji import Kanji

class Word:
    def __init__(self, id: int, text: str, reading: str, meaning: str, kanji_components: List[Kanji]):
        self.id = id
        self.text = text
        self.reading = reading
        self.meaning = meaning
        self.kanji_components = kanji_components

    def __repr__(self):
        return f"Word(id={self.id}, text='{self.text}', reading='{self.reading}', meaning='{self.meaning}')"

    @classmethod
    def from_dict(cls, data: Dict[str, Any]):
        kanji_components = [
            Kanji.from_dict(kc_data) for kc_data in data.get('kanji_components', [])
        ]
        return cls(
            id=data['id'],
            text=data['text'],
            reading=data['reading'],
            meaning=data['meaning'],
            kanji_components=kanji_components
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "text": self.text,
            "reading": self.reading,
            "meaning": self.meaning,
            "kanji_components": [kc.to_dict() for kc in self.kanji_components]
        }