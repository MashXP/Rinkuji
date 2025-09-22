from flask import Blueprint, jsonify
from backend.src.services import github_service

changelog_bp = Blueprint('changelog', __name__)

@changelog_bp.route('/api/changelog', methods=['GET'])
def get_changelog():
    """
    API endpoint to get the changelog.
    """
    changelog_md = github_service.get_changelog_from_github()
    if changelog_md:
        return jsonify({'changelog': changelog_md})
    else:
        return jsonify({'error': 'Failed to fetch changelog'}), 500
