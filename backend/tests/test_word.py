import pytest # type: ignore
from backend.src.models.word import Word
from backend.src.models.kanji import Kanji

def test_word_creation():
    kanji1 = Kanji(id=101, character="日", meaning="day, sun", on_reading=["にち"], kun_reading=["ひ"], components=[])
    word = Word(id=1, text="日本語", reading="にほんご", meaning="Japanese language", kanji_components=[kanji1])
    assert word.id == 1
    assert word.text == "日本語"
    assert word.reading == "にほんご"
    assert word.meaning == "Japanese language"
    assert len(word.kanji_components) == 1
    assert word.kanji_components[0].character == "日"

def test_word_from_dict():
    data = {"id": 2, "text": "本", "reading": "ほん", "meaning": "book", "kanji_components": [
        {"id": 102, "character": "本", "meaning": "book", "on_reading": ["ほん"], "kun_reading": ["もと"], "components": ["木"]}
    ]}
    word = Word.from_dict(data)
    assert word.id == 2
    assert word.text == "本"
    assert word.reading == "ほん"
    assert word.meaning == "book"
    assert len(word.kanji_components) == 1
    assert word.kanji_components[0].character == "本"

def test_word_to_dict():
    kanji1 = Kanji(id=103, character="食", meaning="eat", on_reading=["しょく"], kun_reading=["た.べる"], components=[])
    word = Word(id=3, text="食べる", reading="たべる", meaning="to eat", kanji_components=[kanji1])
    expected_dict = {"id": 3, "text": "食べる", "reading": "たべる", "meaning": "to eat", "kanji_components": [
        {"id": 103, "character": "食", "meaning": "eat", "on_reading": ["しょく"], "kun_reading": ["た.べる"], "components": []}
    ]}
    assert word.to_dict() == expected_dict