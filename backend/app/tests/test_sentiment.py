import pytest
from app.ml.sentiment_analyzer import SentimentAnalyzer

@pytest.mark.asyncio
async def test_sentiment_analyzer():
    analyzer = SentimentAnalyzer()
    text = "This game was amazing!"
    result = await analyzer.analyze(text)
    assert isinstance(result, dict)
    assert 'sentiment' in result
    assert 'score' in result

@pytest.mark.asyncio
async def test_empty_text():
    analyzer = SentimentAnalyzer()
    text = ""
    result = await analyzer.analyze(text)
    assert isinstance(result, dict)
    assert result['sentiment'] == 'neutral'
