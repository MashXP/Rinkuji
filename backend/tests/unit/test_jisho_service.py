import unittest
from unittest.mock import patch, Mock
import requests
from backend.src.services.jisho_service import JishoService

class TestJishoService(unittest.TestCase):

    def setUp(self):
        self.jisho_service = JishoService()

    @patch('requests.get')
    def test_search_words_success(self, mock_get):
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"data": [{"slug": "test", "japanese": [{"word": "テスト"}]}]}
        mock_get.return_value = mock_response

        response, status = self.jisho_service.search_words("test")
        self.assertEqual(status, 200)
        self.assertIn("data", response)
        mock_get.assert_called_once_with(f"{self.jisho_service.JISHO_API_URL}?keyword=test")

    def test_search_words_empty_query(self):
        response, status = self.jisho_service.search_words("")
        self.assertEqual(status, 400)
        self.assertIn("error", response)
        self.assertEqual(response["error"], "A 'query' parameter is required.")

    @patch('requests.get')
    def test_search_words_api_failure(self, mock_get):
        mock_get.side_effect = requests.exceptions.RequestException("Test exception")

        response, status = self.jisho_service.search_words("test")
        self.assertEqual(status, 502)
        self.assertIn("error", response)
        self.assertEqual(response["error"], "Failed to fetch data from the external API.")
        mock_get.assert_called_once_with(f"{self.jisho_service.JISHO_API_URL}?keyword=test")

    @patch('requests.get')
    def test_search_by_kanji_success(self, mock_get):
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"data": [{"slug": "日", "japanese": [{"word": "ひ"}]}]}
        mock_get.return_value = mock_response

        response, status = self.jisho_service.search_by_kanji("日")
        self.assertEqual(status, 200)
        self.assertIn("data", response)
        mock_get.assert_called_once_with(f"{self.jisho_service.JISHO_API_URL}?keyword=日")

    def test_search_by_kanji_empty_kanji(self):
        response, status = self.jisho_service.search_by_kanji("")
        self.assertEqual(status, 400)
        self.assertIn("error", response)
        self.assertEqual(response["error"], "A single 'kanji' character parameter is required.")

    def test_search_by_kanji_multiple_kanji(self):
        response, status = self.jisho_service.search_by_kanji("日本")
        self.assertEqual(status, 400)
        self.assertIn("error", response)
        self.assertEqual(response["error"], "A single 'kanji' character parameter is required.")

    @patch('requests.get')
    def test_search_by_kanji_api_failure(self, mock_get):
        mock_get.side_effect = requests.exceptions.RequestException("Test exception")

        response, status = self.jisho_service.search_by_kanji("日")
        self.assertEqual(status, 502)
        self.assertIn("error", response)
        self.assertEqual(response["error"], "Failed to fetch data from the external API.")
        mock_get.assert_called_once_with(f"{self.jisho_service.JISHO_API_URL}?keyword=日")

if __name__ == '__main__':
    unittest.main()
