import requests

def get_changelog_from_github():
    """
    Fetches the content of the CHANGELOG.md file from the GitHub repository.
    """
    url = "https://raw.githubusercontent.com/MashXP/Rinkuji/main/CHANGELOG.md"
    try:
        response = requests.get(url)
        response.raise_for_status()  # Raise an exception for bad status codes
        return response.text
    except requests.exceptions.RequestException as e:
        print(f"Error fetching changelog from GitHub: {e}")
        return None
