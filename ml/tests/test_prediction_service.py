import pytest
from fastapi.testclient import TestClient
from api.prediction_service import app
import json

client = TestClient(app)


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


def test_predict_endpoint(sample_game_data):
    response = client.post("/predict", json=sample_game_data)
    assert response.status_code == 200

    data = response.json()
    assert "home_team_win_probability" in data
    assert "away_team_win_probability" in data
    assert "predicted_winner" in data
    assert "confidence" in data
    assert "feature_importance" in data

    assert 0 <= data["home_team_win_probability"] <= 1
    assert 0 <= data["away_team_win_probability"] <= 1
    assert data["predicted_winner"] in ["home", "away"]
    assert 0 <= data["confidence"] <= 1


def test_train_endpoint(sample_game_data):
    # Modify sample data for training
    training_data = [
        {
            **sample_game_data["game_data"],
            "winner": "home",
            "stats": sample_game_data["historical_games"][0]["stats"],
        }
    ]

    response = client.post("/train", json=training_data)
    assert response.status_code == 200

    data = response.json()
    assert "message" in data
    assert "metrics" in data
    assert "accuracy" in data["metrics"]


def test_model_info_endpoint():
    response = client.get("/model/info")
    assert response.status_code == 200

    data = response.json()
    assert "features" in data
    assert "model_type" in data
    assert data["model_type"] == "GradientBoostingClassifier"


def test_invalid_data():
    response = client.post("/predict", json={"invalid": "data"})
    assert response.status_code == 422  # Validation error


def test_missing_features():
    invalid_data = {
        "game_data": {"homeTeam": {"id": "home-1"}, "awayTeam": {"id": "away-1"}},
        "historical_games": [],
    }
    response = client.post("/predict", json=invalid_data)
    assert response.status_code == 500  # Internal server error
