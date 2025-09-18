import requests

class JishoService:
    JISHO_API_URL = "https://jisho.org/api/v1/search/words"

    def search_words(self, query):
        if not query:
            return {"error": "A 'query' parameter is required."}, 400

        api_url = f"{self.JISHO_API_URL}?keyword={query}"

        try:
            response = requests.get(api_url)
            response.raise_for_status()
            return response.json(), 200
        except requests.exceptions.RequestException as e:
            print(f"Error fetching from Jisho API: {e}")
            return {"error": "Failed to fetch data from the external API."}, 502

    def search_by_kanji(self, kanji):
        if not kanji or len(kanji) != 1:
            return {"error": "A single 'kanji' character parameter is required."}, 400

        api_url = f"{self.JISHO_API_URL}?keyword={kanji}"

        try:
            response = requests.get(api_url)
            response.raise_for_status()
            return response.json(), 200
        except requests.exceptions.RequestException as e:
            print(f"Error fetching from Jisho API: {e}")
            return {"error": "Failed to fetch data from the external API."}, 502
