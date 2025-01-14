"""
Pydantic models for sentiment analysis API responses.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime


class SentimentResponse(BaseModel):
    """Base sentiment response model."""

    game_id: str
    sentiment_score: float = Field(..., ge=-1, le=1)
    tweet_count: int = Field(..., ge=0)
    confidence: Optional[float] = Field(None, ge=0, le=1)
    updated_at: str


class WeeklySentimentResponse(SentimentResponse):
    """Weekly sentiment analysis response model."""

    weekly_trend: Optional[List[float]] = None
    top_analysts: Optional[List[Dict[str, Any]]] = None


class TrendAnalysisResponse(BaseModel):
    """Trend analysis response model."""

    game_id: str
    trends: Dict[str, Any]
    period_start: str
    period_end: str
    tweet_count: int = Field(..., ge=0)


class GameSentimentDetails(BaseModel):
    """Detailed game sentiment analysis response model."""

    game_id: str
    overall_sentiment: float = Field(..., ge=-1, le=1)
    home_team_sentiment: float = Field(..., ge=-1, le=1)
    away_team_sentiment: float = Field(..., ge=-1, le=1)
    tweet_count: int = Field(..., ge=0)
    sentiment_distribution: Dict[str, int]
    top_tweets: List[Dict[str, Any]]
    updated_at: str
