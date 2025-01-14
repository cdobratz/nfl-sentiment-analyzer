"""
FastAPI application for NFL sentiment analysis.
Provides endpoints for sentiment analysis of NFL-related tweets.
"""

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging
from pathlib import Path

# Local imports
from ml.models.sentiment_analyzer import NFLSentimentAnalyzer
from app.services.twitter_service import TwitterService
from app.schemas.sentiment import (
    SentimentResponse,
    WeeklySentimentResponse,
    TrendAnalysisResponse,
    GameSentimentDetails,
)
from app.core.config import Settings
from app.core.logging import setup_logging

# Setup logging
logger = setup_logging()

# Initialize FastAPI app
app = FastAPI(
    title="NFL Sentiment Analysis API",
    description="API for analyzing sentiment of NFL-related tweets",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Dependencies
async def get_sentiment_analyzer():
    """Dependency for getting sentiment analyzer instance."""
    try:
        analyzer = NFLSentimentAnalyzer()
        yield analyzer
    except Exception as e:
        logger.error(f"Error initializing sentiment analyzer: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to initialize sentiment analyzer"
        )


async def get_twitter_service():
    """Dependency for getting Twitter service instance."""
    try:
        service = TwitterService()
        yield service
    except Exception as e:
        logger.error(f"Error initializing Twitter service: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to initialize Twitter service"
        )


# Routes
@app.get("/api/sentiment/weekly/{game_id}", response_model=WeeklySentimentResponse)
async def get_weekly_sentiment(
    game_id: str,
    analyzer: NFLSentimentAnalyzer = Depends(get_sentiment_analyzer),
    twitter_service: TwitterService = Depends(get_twitter_service),
):
    """
    Get weekly sentiment analysis for a specific game.

    Args:
        game_id: Unique identifier for the game
        analyzer: Sentiment analyzer instance
        twitter_service: Twitter service instance

    Returns:
        Weekly sentiment analysis data
    """
    try:
        # Get tweets for the game
        tweets = await twitter_service.get_game_tweets(game_id)

        # Analyze sentiment
        sentiment_df = analyzer.analyze_sentiment(tweets)

        # Calculate aggregated metrics
        sentiment_score = sentiment_df["score"].mean()
        confidence = (
            sentiment_df["confidence"].mean() if "confidence" in sentiment_df else None
        )

        return WeeklySentimentResponse(
            game_id=game_id,
            sentiment_score=float(sentiment_score),
            tweet_count=len(tweets),
            confidence=float(confidence) if confidence is not None else None,
            updated_at=datetime.now().isoformat(),
        )

    except Exception as e:
        logger.error(f"Error getting weekly sentiment for game {game_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/sentiment/trends/{game_id}", response_model=TrendAnalysisResponse)
async def get_sentiment_trends(
    game_id: str,
    days: int = Query(7, ge=1, le=30),
    analyzer: NFLSentimentAnalyzer = Depends(get_sentiment_analyzer),
    twitter_service: TwitterService = Depends(get_twitter_service),
):
    """
    Get sentiment trends for a specific game over time.

    Args:
        game_id: Unique identifier for the game
        days: Number of days to analyze
        analyzer: Sentiment analyzer instance
        twitter_service: Twitter service instance

    Returns:
        Sentiment trend analysis data
    """
    try:
        # Get historical tweets
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        tweets = await twitter_service.get_historical_tweets(
            game_id, start_date, end_date
        )

        # Analyze sentiment
        sentiment_df = analyzer.analyze_sentiment(tweets)
        trends = analyzer.analyze_trends(sentiment_df)

        return TrendAnalysisResponse(
            game_id=game_id,
            trends=trends,
            period_start=start_date.isoformat(),
            period_end=end_date.isoformat(),
            tweet_count=len(tweets),
        )

    except Exception as e:
        logger.error(f"Error getting sentiment trends for game {game_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/sentiment/game/{game_id}/details", response_model=GameSentimentDetails)
async def get_game_sentiment_details(
    game_id: str,
    analyzer: NFLSentimentAnalyzer = Depends(get_sentiment_analyzer),
    twitter_service: TwitterService = Depends(get_twitter_service),
):
    """
    Get detailed sentiment analysis for a specific game.

    Args:
        game_id: Unique identifier for the game
        analyzer: Sentiment analyzer instance
        twitter_service: Twitter service instance

    Returns:
        Detailed game sentiment analysis
    """
    try:
        # Get game tweets with metadata
        tweets = await twitter_service.get_game_tweets(game_id, include_metadata=True)

        # Analyze sentiment
        sentiment_df = analyzer.analyze_sentiment(tweets)

        # Calculate team-specific sentiment
        home_team_tweets = sentiment_df[
            sentiment_df["text"].str.contains(tweets[0]["home_team"], case=False)
        ]
        away_team_tweets = sentiment_df[
            sentiment_df["text"].str.contains(tweets[0]["away_team"], case=False)
        ]

        return GameSentimentDetails(
            game_id=game_id,
            overall_sentiment=float(sentiment_df["score"].mean()),
            home_team_sentiment=float(home_team_tweets["score"].mean()),
            away_team_sentiment=float(away_team_tweets["score"].mean()),
            tweet_count=len(tweets),
            sentiment_distribution={
                "positive": len(sentiment_df[sentiment_df["sentiment"] == "POSITIVE"]),
                "negative": len(sentiment_df[sentiment_df["sentiment"] == "NEGATIVE"]),
                "neutral": len(sentiment_df[sentiment_df["sentiment"] == "NEUTRAL"]),
            },
            top_tweets=sentiment_df.nlargest(5, "score")[
                ["text", "score", "author"]
            ].to_dict("records"),
            updated_at=datetime.now().isoformat(),
        )

    except Exception as e:
        logger.error(f"Error getting game sentiment details for game {game_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}
