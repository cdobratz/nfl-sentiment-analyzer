import pytest
import os
import sys

# Add the project root directory to Python path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

@pytest.fixture
def sample_game_data():
    return {
        "game_data": {
            "homeTeam": {"id": "home-1", "name": "Home Team"},
            "awayTeam": {"id": "away-1", "name": "Away Team"},
            "date": "2024-01-01",
            "is_primetime": True,
            "is_division_game": True,
            "sentiment_data": {
                "tweets": {
                    "home_team": [{"sentiment_score": 0.8}],
                    "away_team": [{"sentiment_score": 0.6}],
                },
                "analyst_opinions": [{"pick": "home", "confidence": 0.9}],
            },
        },
        "historical_games": [
            {
                "homeTeam": {"id": "home-1", "score": 24},
                "awayTeam": {"id": "away-1", "score": 17},
                "winner": "home",
                "stats": {
                    "home_yards_total": 350,
                    "away_yards_total": 300,
                    "home_turnovers": 1,
                    "away_turnovers": 2,
                },
            }
        ],
    }
