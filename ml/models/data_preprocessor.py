import pandas as pd
import numpy as np
from typing import Dict, List, Any
import logging
from datetime import datetime


class DataPreprocessor:
    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def calculate_team_stats(
        self,
        historical_games: List[Dict[str, Any]],
        team_id: str,
        last_n_games: int = 5,
    ) -> Dict[str, float]:
        """Calculate team statistics based on recent games."""
        try:
            team_games = []
            for game in historical_games:
                if game["homeTeam"]["id"] == team_id:
                    team_games.append(
                        {
                            "is_home": True,
                            "points_scored": game["homeTeam"].get("score", 0),
                            "points_allowed": game["awayTeam"].get("score", 0),
                            "yards": game.get("stats", {}).get("home_yards_total", 0),
                            "turnovers": game.get("stats", {}).get("home_turnovers", 0),
                            "won": game.get("winner") == "home",
                        }
                    )
                elif game["awayTeam"]["id"] == team_id:
                    team_games.append(
                        {
                            "is_home": False,
                            "points_scored": game["awayTeam"].get("score", 0),
                            "points_allowed": game["homeTeam"].get("score", 0),
                            "yards": game.get("stats", {}).get("away_yards_total", 0),
                            "turnovers": game.get("stats", {}).get("away_turnovers", 0),
                            "won": game.get("winner") == "away",
                        }
                    )

            # Get last N games
            recent_games = team_games[-last_n_games:]

            if not recent_games:
                return {
                    "win_rate": 0.0,
                    "points_scored_avg": 0.0,
                    "points_allowed_avg": 0.0,
                    "yards_per_game": 0.0,
                    "turnover_diff": 0.0,
                }

            stats = {
                "win_rate": np.mean([g["won"] for g in recent_games]),
                "points_scored_avg": np.mean(
                    [g["points_scored"] for g in recent_games]
                ),
                "points_allowed_avg": np.mean(
                    [g["points_allowed"] for g in recent_games]
                ),
                "yards_per_game": np.mean([g["yards"] for g in recent_games]),
                "turnover_diff": np.mean([g["turnovers"] for g in recent_games]),
            }

            return stats

        except Exception as e:
            self.logger.error(f"Error calculating team stats: {str(e)}")
            raise

    def process_sentiment_data(
        self, sentiment_data: Dict[str, Any]
    ) -> Dict[str, float]:
        """Process sentiment analysis data."""
        try:
            home_tweets = sentiment_data.get("tweets", {}).get("home_team", [])
            away_tweets = sentiment_data.get("tweets", {}).get("away_team", [])
            analyst_opinions = sentiment_data.get("analyst_opinions", [])

            # Calculate sentiment scores
            home_sentiment = (
                np.mean([t.get("sentiment_score", 0) for t in home_tweets])
                if home_tweets
                else 0
            )
            away_sentiment = (
                np.mean([t.get("sentiment_score", 0) for t in away_tweets])
                if away_tweets
                else 0
            )

            # Calculate analyst confidence
            home_analyst_confidence = 0
            away_analyst_confidence = 0
            for opinion in analyst_opinions:
                if opinion.get("pick") == "home":
                    home_analyst_confidence += opinion.get("confidence", 0)
                else:
                    away_analyst_confidence += opinion.get("confidence", 0)

            return {
                "home_sentiment_score": home_sentiment,
                "away_sentiment_score": away_sentiment,
                "analyst_confidence_home": home_analyst_confidence,
                "analyst_confidence_away": away_analyst_confidence,
            }

        except Exception as e:
            self.logger.error(f"Error processing sentiment data: {str(e)}")
            raise

    def prepare_game_features(
        self, game_data: Dict[str, Any], historical_games: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Prepare features for a single game prediction."""
        try:
            # Get team stats
            home_stats = self.calculate_team_stats(
                historical_games, game_data["homeTeam"]["id"]
            )
            away_stats = self.calculate_team_stats(
                historical_games, game_data["awayTeam"]["id"]
            )

            # Process sentiment data
            sentiment_features = self.process_sentiment_data(
                game_data.get("sentiment_data", {})
            )

            # Calculate game context features
            game_date = datetime.strptime(game_data["date"], "%Y-%m-%d")
            is_primetime = game_data.get("is_primetime", False)
            is_division_game = game_data.get("is_division_game", False)

            # Combine all features
            features = {
                "home_win_rate": home_stats["win_rate"],
                "away_win_rate": away_stats["win_rate"],
                "home_points_scored_avg": home_stats["points_scored_avg"],
                "away_points_scored_avg": away_stats["points_scored_avg"],
                "home_points_allowed_avg": home_stats["points_allowed_avg"],
                "away_points_allowed_avg": away_stats["points_allowed_avg"],
                "home_yards_per_play": home_stats["yards_per_game"]
                / 60,  # Approximate plays per game
                "away_yards_per_play": away_stats["yards_per_game"] / 60,
                "home_turnover_diff": home_stats["turnover_diff"],
                "away_turnover_diff": away_stats["turnover_diff"],
                "home_sentiment_score": sentiment_features["home_sentiment_score"],
                "away_sentiment_score": sentiment_features["away_sentiment_score"],
                "analyst_confidence_home": sentiment_features[
                    "analyst_confidence_home"
                ],
                "analyst_confidence_away": sentiment_features[
                    "analyst_confidence_away"
                ],
                "is_division_game": int(is_division_game),
                "is_primetime": int(is_primetime),
                "home_rest_days": game_data.get("home_rest_days", 7),
                "away_rest_days": game_data.get("away_rest_days", 7),
            }

            return features

        except Exception as e:
            self.logger.error(f"Error preparing game features: {str(e)}")
            raise
