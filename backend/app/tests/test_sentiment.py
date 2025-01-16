import pytest
from aioresponses import aioresponses
from app.ml.sentiment_analyzer import SentimentAnalyzer


@pytest.fixture
def mock_aioresponse():
    with aioresponses() as m:
        yield m


@pytest.mark.asyncio
async def test_sentiment_analyzer(mock_aioresponse):
    mock_url = "http://test-url/analyze"
    mock_response = [{
        "label": "positive",
        "sentiment": {"score": 0.9}
    }]
    mock_aioresponse.post(mock_url, status=200, payload=mock_response)

    analyzer = SentimentAnalyzer(ml_service_url=mock_url)
    text = "This game was amazing!"
    result = await analyzer.analyze(text)

    assert isinstance(result, dict)
    assert result["sentiment"] == "positive"
    assert result["score"] == 0.9


@pytest.mark.asyncio
async def test_empty_text():
    analyzer = SentimentAnalyzer()
    text = ""
    result = await analyzer.analyze(text)
    assert isinstance(result, dict)
    assert result["sentiment"] == "neutral"
    assert result["score"] == 0.0


@pytest.mark.asyncio
async def test_failed_request(mock_aioresponse):
    mock_url = "http://test-url/analyze"
    mock_aioresponse.post(mock_url, status=500)

    analyzer = SentimentAnalyzer(ml_service_url=mock_url)
    text = "This game was amazing!"
    result = await analyzer.analyze(text)

    assert isinstance(result, dict)
    assert result["sentiment"] == "neutral"
    assert result["score"] == 0.0
