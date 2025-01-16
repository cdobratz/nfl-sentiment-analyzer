import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, AsyncMock
import pandas as pd
from datetime import datetime, timedelta

from app.main import app, get_sentiment_analyzer, get_twitter_service
from app.ml.models.sentiment_analyzer import NFLSentimentAnalyzer
from app.services.twitter_service import TwitterService


@pytest.fixture
def test_client():
    return TestClient(app)


@pytest.fixture
def mock_sentiment_analyzer():
    analyzer = Mock(spec=NFLSentimentAnalyzer)
    
    # Mock analyze_sentiment method
    def analyze_sentiment(tweets):
        return pd.DataFrame({
            'text': ['Test tweet'],
            'score': [0.8],
            'confidence': [0.9],
            'timestamp': [datetime.now()]
        })
    
    analyzer.analyze_sentiment = analyze_sentiment
    return analyzer


@pytest.fixture
def mock_twitter_service():
    service = AsyncMock(spec=TwitterService)
    
    # Mock get_game_tweets method
    service.get_game_tweets.return_value = [
        {'text': 'Great game!', 'created_at': datetime.now().isoformat()}
    ]
    
    # Mock get_historical_tweets method
    service.get_historical_tweets.return_value = [
        {'text': f'Day {i} tweet', 'created_at': (datetime.now() - timedelta(days=i)).isoformat()}
        for i in range(7)
    ]
    
    return service


@pytest.fixture
def override_dependencies(mock_sentiment_analyzer, mock_twitter_service):
    app.dependency_overrides[get_sentiment_analyzer] = lambda: mock_sentiment_analyzer
    app.dependency_overrides[get_twitter_service] = lambda: mock_twitter_service
    yield
    app.dependency_overrides = {}


def test_health_check(test_client):
    response = test_client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_weekly_sentiment(test_client, override_dependencies):
    response = test_client.get("/api/sentiment/weekly/test-game-id")
    assert response.status_code == 200
    data = response.json()
    assert "sentiment_score" in data
    assert "confidence" in data
    assert "timestamp" in data


def test_sentiment_trends(test_client, override_dependencies):
    response = test_client.get("/api/sentiment/trends/test-game-id?days=7")
    assert response.status_code == 200
    data = response.json()
    assert "trend_data" in data
    assert len(data["trend_data"]) > 0
    assert "overall_sentiment" in data


def test_game_sentiment_details(test_client, override_dependencies):
    response = test_client.get("/api/sentiment/details/test-game-id")
    assert response.status_code == 200
    data = response.json()
    assert "home_team_sentiment" in data
    assert "away_team_sentiment" in data
    assert "neutral_sentiment" in data


def test_invalid_game_id(test_client, override_dependencies, mock_twitter_service):
    mock_twitter_service.get_game_tweets.side_effect = Exception("Game not found")
    response = test_client.get("/api/sentiment/weekly/invalid-id")
    assert response.status_code == 500
    assert "error" in response.json()


def test_invalid_days_parameter(test_client, override_dependencies):
    response = test_client.get("/api/sentiment/trends/test-game-id?days=31")
    assert response.status_code == 422  # Validation error
    

def test_sentiment_analyzer_initialization_error(test_client):
    def mock_error():
        raise Exception("Initialization error")
    
    app.dependency_overrides[get_sentiment_analyzer] = mock_error
    response = test_client.get("/api/sentiment/weekly/test-game-id")
    assert response.status_code == 500
    assert "Failed to initialize sentiment analyzer" in response.json()["detail"]
    app.dependency_overrides = {}
