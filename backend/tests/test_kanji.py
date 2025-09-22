import pytest # type: ignore
from backend.src.models.kanji import Kanji

def test_kanji_creation():
    kanji = Kanji(id=1, character="語", meaning="language", on_reading=["ご"], kun_reading=["かた.る"], components=["口"])
    assert kanji.id == 1
    assert kanji.character == "語"
    assert kanji.meaning == "language"
    assert kanji.on_reading == ["ご"]
    assert kanji.kun_reading == ["かた.る"]
    assert kanji.components == ["口"]

def test_kanji_from_dict():
    data = {"id": 2, "character": "日", "meaning": "day, sun", "on_reading": ["にち", "じつ"], "kun_reading": ["ひ", "び"], "components": ["一"]}
    kanji = Kanji.from_dict(data)
    assert kanji.id == 2
    assert kanji.character == "日"
    assert kanji.meaning == "day, sun"
    assert kanji.on_reading == ["にち", "じつ"]
    assert kanji.kun_reading == ["ひ", "び"]
    assert kanji.components == ["一"]

def test_kanji_from_dict_missing_optional_fields():
    data = {"id": 4, "character": "私", "meaning": "I, private"}
    kanji = Kanji.from_dict(data)
    assert kanji.id == 4
    assert kanji.character == "私"
    assert kanji.meaning == "I, private"
    assert kanji.on_reading == []
    assert kanji.kun_reading == []
    assert kanji.components == []

def test_kanji_to_dict():
    kanji = Kanji(id=3, character="本", meaning="book, origin", on_reading=["ほん"], kun_reading=["もと"], components=["木"])
    expected_dict = {"id": 3, "character": "本", "meaning": "book, origin", "on_reading": ["ほん"], "kun_reading": ["もと"], "components": ["木"]}
    assert kanji.to_dict() == expected_dict

def test_kanji_repr():
    kanji = Kanji(id=1, character="語", meaning="language", on_reading=["ご"], kun_reading=["かた.る"], components=["口"])
    assert repr(kanji) == "Kanji(id=1, character='語', meaning='language')"
