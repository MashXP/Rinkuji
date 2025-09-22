import unittest
from unittest.mock import patch, mock_open, MagicMock
import json
from backend.src.services.data_loader_service import DataLoaderService
from backend.src.models.word import Word
from backend.src.models.kanji import Kanji

class TestDataLoaderService(unittest.TestCase):

    def setUp(self):
        self.mock_data_file_path = "/fake/path/data.json"
        self.data_loader_service = DataLoaderService(self.mock_data_file_path)
        self.sample_data = [
            {
                "id": 1,
                "text": "日本語",
                "reading": "にほんご",
                "meaning": "Japanese language",
                "kanji_components": [
                    {"id": 101, "character": "日", "meaning": "day", "on_reading": ["にち"], "kun_reading": ["ひ"], "components": []},
                    {"id": 102, "character": "本", "meaning": "book", "on_reading": ["ほん"], "kun_reading": ["もと"], "components": []},
                    {"id": 103, "character": "語", "meaning": "language", "on_reading": ["ご"], "kun_reading": [], "components": []}
                ]
            },
            {
                "id": 2,
                "text": "食べる",
                "reading": "たべる",
                "meaning": "to eat",
                "kanji_components": [
                    {"id": 104, "character": "食", "meaning": "eat", "on_reading": ["しょく"], "kun_reading": ["た"], "components": []}
                ]
            },
            {
                "id": 3,
                "text": "犬",
                "reading": "いぬ",
                "meaning": "dog",
                "kanji_components": []
            }
        ]

    @patch('builtins.open', new_callable=mock_open)
    @patch('json.load')
    def test_load_data_success(self, mock_json_load, mock_file_open):
        mock_json_load.return_value = self.sample_data
        words = self.data_loader_service.load_data()

        mock_file_open.assert_called_once_with(self.mock_data_file_path, 'r', encoding='utf-8')
        mock_json_load.assert_called_once()
        self.assertEqual(len(words), 3)
        self.assertIsInstance(words[0], Word)
        self.assertEqual(words[0].text, "日本語")
        self.assertEqual(len(words[0].kanji_components), 3)
        self.assertIsInstance(words[0].kanji_components[0], Kanji)

    @patch('builtins.open', new_callable=mock_open)
    @patch('json.load')
    def test_load_data_caching(self, mock_json_load, mock_file_open):
        mock_json_load.return_value = self.sample_data

        # First call - should load from file
        words1 = self.data_loader_service.load_data()
        mock_file_open.assert_called_once()
        mock_json_load.assert_called_once()

        # Second call - should load from cache
        words2 = self.data_loader_service.load_data()
        mock_file_open.assert_called_once()  # Still only called once
        mock_json_load.assert_called_once()  # Still only called once
        self.assertEqual(words1, words2)

    @patch('builtins.open', new_callable=mock_open)
    @patch('json.load')
    def test_load_data_empty_file(self, mock_json_load, mock_file_open):
        mock_json_load.return_value = []
        words = self.data_loader_service.load_data()
        self.assertEqual(len(words), 0)

    @patch('builtins.open', new_callable=mock_open)
    @patch('json.load')
    def test_load_data_malformed_json(self, mock_json_load, mock_file_open):
        mock_json_load.side_effect = json.JSONDecodeError("Expecting value", "doc", 0)
        with self.assertRaises(json.JSONDecodeError):
            self.data_loader_service.load_data()

    @patch.object(DataLoaderService, 'load_data')
    def test_get_suggestions_match(self, mock_load_data):
        mock_load_data.return_value = [
            Word(id=1, text="日本語", reading="にほんご", meaning="Japanese language", kanji_components=[]),
            Word(id=2, text="食べる", reading="たべる", meaning="to eat", kanji_components=[]),
            Word(id=3, text="犬", reading="いぬ", meaning="dog", kanji_components=[]),
        ]
        suggestions = self.data_loader_service.get_suggestions("日本")
        self.assertEqual(suggestions, ["日本語"])

    @patch.object(DataLoaderService, 'load_data')
    def test_get_suggestions_no_match(self, mock_load_data):
        mock_load_data.return_value = [
            Word(id=1, text="食べる", reading="たべる", meaning="to eat", kanji_components=[]),
            Word(id=2, text="犬", reading="いぬ", meaning="dog", kanji_components=[]),
        ]
        suggestions = self.data_loader_service.get_suggestions("猫")
        self.assertEqual(suggestions, [])

    @patch.object(DataLoaderService, 'load_data')
    def test_get_suggestions_empty_query(self, mock_load_data):
        mock_load_data.return_value = [
            Word(id=1, text="日本語", reading="にほんご", meaning="Japanese language", kanji_components=[]),
            Word(id=2, text="食べる", reading="たべる", meaning="to eat", kanji_components=[]),
        ]
        suggestions = self.data_loader_service.get_suggestions("")
        self.assertEqual(suggestions, [])

    @patch.object(DataLoaderService, 'load_data')
    def test_get_all_kanji_with_kanji(self, mock_load_data):
        mock_load_data.return_value = [
            Word(id=1, text="日本語", reading="にほんご", meaning="Japanese language", kanji_components=[
                Kanji(id=101, character="日", meaning="day", on_reading=[], kun_reading=[], components=[]),
                Kanji(id=102, character="本", meaning="book", on_reading=[], kun_reading=[], components=[]),
            ]),
            Word(id=2, text="食べる", reading="たべる", meaning="to eat", kanji_components=[
                Kanji(id=103, character="食", meaning="eat", on_reading=[], kun_reading=[], components=[]),
            ]),
        ]
        all_kanji = self.data_loader_service.get_all_kanji(mock_load_data.return_value)
        self.assertEqual(len(all_kanji), 3)
        self.assertIn(101, all_kanji)
        self.assertIn(102, all_kanji)
        self.assertIn(103, all_kanji)
        self.assertEqual(all_kanji[101].character, "日")

    @patch.object(DataLoaderService, 'load_data')
    def test_get_all_kanji_no_kanji(self, mock_load_data):
        mock_load_data.return_value = [
            Word(id=1, text="犬", reading="いぬ", meaning="dog", kanji_components=[]),
        ]
        all_kanji = self.data_loader_service.get_all_kanji(mock_load_data.return_value)
        self.assertEqual(len(all_kanji), 0)

    @patch.object(DataLoaderService, 'load_data')
    def test_get_all_kanji_empty_words_list(self, mock_load_data):
        mock_load_data.return_value = []
        all_kanji = self.data_loader_service.get_all_kanji(mock_load_data.return_value)
        self.assertEqual(len(all_kanji), 0)

if __name__ == '__main__':
    unittest.main()
