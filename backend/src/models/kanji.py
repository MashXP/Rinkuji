from typing import List, Dict, Any

class Kanji:
    def __init__(self, id: int, character: str, meaning: str, on_reading: List[str], kun_reading: List[str], components: List[str]):
        self.id = id
        self.character = character
        self.meaning = meaning
        self.on_reading = on_reading
        self.kun_reading = kun_reading
        self.components = components

    def __repr__(self):
        return f"Kanji(id={self.id}, character='{self.character}', meaning='{self.meaning}')"

    @classmethod
    def from_dict(cls, data: Dict[str, Any]):
        return cls(
            id=data['id'],
            character=data['character'],
            meaning=data['meaning'],
            on_reading=data.get('on_reading', []),
            kun_reading=data.get('kun_reading', []),
            components=data.get('components', [])
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "character": self.character,
            "meaning": self.meaning,
            "on_reading": self.on_reading,
            "kun_reading": self.kun_reading,
            "components": self.components
        }