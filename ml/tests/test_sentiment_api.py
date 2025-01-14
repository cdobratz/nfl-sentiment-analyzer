"""
Test script for the NFL Sentiment Analysis API.
Run with: python -m pytest tests/test_sentiment_api.py -v
"""

import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)


def test_list_models():
    """Test the /models endpoint"""
    response = client.get("/models")
    assert response.status_code == 200
    models = response.json()
    assert "bertweet-base" in models
    assert "description" in models["bertweet-base"]


def test_analyze_sentiment():
    """Test sentiment analysis with various inputs"""
    test_cases = [
        {
            "text": "Great performance by the Patriots today!",
            "expected_label": "positive",
        },
        {
            "text": "Terrible game by the Jets, very disappointing.",
            "expected_label": "negative",
        },
        {"text": "The game is scheduled for Sunday.", "expected_label": "neutral"},
    ]

    response = client.post(
        "/analyze",
        json={
            "texts": [case["text"] for case in test_cases],
            "model_name": "bertweet-base",
        },
    )

    assert response.status_code == 200
    results = response.json()
    assert len(results) == len(test_cases)

    for result, test_case in zip(results, test_cases):
        assert "text" in result
        assert "sentiment" in result
        assert "score" in result["sentiment"]
        assert "confidence" in result["sentiment"]
        assert "label" in result
        assert result["text"] == test_case["text"]
        assert isinstance(result["sentiment"]["score"], float)
        assert result["label"] in ["positive", "negative", "neutral"]
        assert 0 <= result["sentiment"]["confidence"] <= 1


def test_invalid_model():
    """Test error handling for invalid model name"""
    response = client.post(
        "/analyze", json={"texts": ["Test text"], "model_name": "nonexistent-model"}
    )
    assert response.status_code == 400
    assert "not found" in response.json()["detail"]


def test_empty_input():
    """Test handling of empty input"""
    response = client.post(
        "/analyze", json={"texts": [], "model_name": "bertweet-base"}
    )
    assert response.status_code == 200
    assert len(response.json()) == 0


def test_batch_processing():
    """Test processing of multiple tweets"""
    tweets = [
        "Patriots win in overtime!",
        "Jets lose again...",
        "Game starts at 1 PM",
        "Incredible touchdown pass!",
        "Another disappointing loss",
    ]

    response = client.post(
        "/analyze", json={"texts": tweets, "model_name": "bertweet-base"}
    )

    assert response.status_code == 200
    results = response.json()
    assert len(results) == len(tweets)

    # Check that we have a mix of sentiments
    sentiments = [r["label"] for r in results]
    assert len(set(sentiments)) > 1  # Should have more than one type of sentiment


def test_error_handling():
    """Test error handling for malformed requests"""
    # Missing required field
    response = client.post("/analyze", json={"model_name": "bertweet-base"})
    assert response.status_code == 422

    # Invalid JSON
    response = client.post("/analyze", data="invalid json")
    assert response.status_code == 422


if __name__ == "__main__":
    pytest.main(["-v", __file__])
