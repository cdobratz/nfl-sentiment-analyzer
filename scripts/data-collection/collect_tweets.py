#!/usr/bin/env python3
"""
Script to collect tweets from NFL analysts using the Twitter (X) API v2.
Handles rate limiting and stores data in a structured format.
"""

import tweepy
import json
import os
import logging
from datetime import datetime
from typing import List, Dict, Any
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class TwitterDataCollector:
    def __init__(self, bearer_token: str = None):
        """Initialize the Twitter data collector with authentication."""
        self.bearer_token = bearer_token or os.getenv('TWITTER_BEARER_TOKEN')
        if not self.bearer_token:
            raise ValueError("Twitter bearer token not provided")
        
        self.client = self.setup_twitter_auth()
        
        # Create data directory if it doesn't exist
        self.data_dir = Path(__file__).parent.parent.parent / 'ml' / 'data' / 'raw'
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def setup_twitter_auth(self) -> tweepy.Client:
        """Set up Twitter API authentication."""
        try:
            client = tweepy.Client(
                bearer_token=self.bearer_token,
                wait_on_rate_limit=True
            )
            logger.info("Successfully authenticated with Twitter API")
            return client
        except Exception as e:
            logger.error(f"Failed to authenticate with Twitter API: {e}")
            raise

    def collect_analyst_tweets(
        self,
        analysts: List[str],
        max_tweets_per_analyst: int = 10,
        max_analysts: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Collect tweets from specified NFL analysts.
        
        Args:
            analysts: List of Twitter usernames
            max_tweets_per_analyst: Maximum number of tweets to collect per analyst
            max_analysts: Maximum number of analysts to collect from
            
        Returns:
            List of collected tweets with metadata
        """
        collected_tweets = []
        processed_analysts = analysts[:max_analysts]
        
        logger.info(f"Starting tweet collection from {len(processed_analysts)} analysts")
        
        for analyst in processed_analysts:
            try:
                # Get user information
                response = self.client.get_user(username=analyst)
                if not response.data:
                    logger.warning(f"Could not find user: {analyst}")
                    continue
                
                user_id = response.data.id
                logger.info(f"Collecting tweets from {analyst} (ID: {user_id})")
                
                # Get user's tweets
                user_tweets = self.client.get_users_tweets(
                    user_id,
                    max_results=max_tweets_per_analyst,
                    tweet_fields=['created_at', 'text', 'public_metrics'],
                    exclude=['retweets', 'replies']
                )
                
                if not user_tweets.data:
                    logger.warning(f"No tweets found for {analyst}")
                    continue
                
                # Process tweets
                for tweet in user_tweets.data:
                    tweet_data = {
                        'id': tweet.id,
                        'text': tweet.text,
                        'author': analyst,
                        'created_at': tweet.created_at.isoformat(),
                        'metrics': tweet.public_metrics,
                    }
                    collected_tweets.append(tweet_data)
                
                logger.info(f"Collected {len(user_tweets.data)} tweets from {analyst}")
                
            except Exception as e:
                logger.error(f"Error collecting tweets from {analyst}: {e}")
                continue
        
        logger.info(f"Successfully collected {len(collected_tweets)} tweets in total")
        return collected_tweets

    def save_tweets(self, tweets: List[Dict[str, Any]], filename: str = None) -> str:
        """
        Save collected tweets to a JSON file.
        
        Args:
            tweets: List of tweet data to save
            filename: Optional custom filename
            
        Returns:
            Path to saved file
        """
        if not filename:
            filename = f'tweets_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        
        filepath = self.data_dir / filename
        
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump({
                    'metadata': {
                        'collected_at': datetime.now().isoformat(),
                        'tweet_count': len(tweets)
                    },
                    'tweets': tweets
                }, f, ensure_ascii=False, indent=2)
            
            logger.info(f"Successfully saved {len(tweets)} tweets to {filepath}")
            return str(filepath)
        except Exception as e:
            logger.error(f"Error saving tweets to file: {e}")
            raise

def main():
    """Main execution function."""
    # List of NFL analysts to track
    analysts = [
        'AdamSchefter',    # ESPN Senior NFL Insider
        'RapSheet',        # NFL Network Insider
        'MattMacKay',      # NFL Analyst
        'JLoCovers',       # NFL Betting Analyst
        'MurphCovers',     # NFL Betting Expert
        'ProFootballTalk', # Pro Football Talk
        'AlbertBreer',     # Sports Illustrated
        'JimTrotter_NFL',  # NFL Network
        'CharlesRobinson', # Yahoo Sports
        'TomPelissero'     # NFL Network
    ]

    try:
        # Initialize collector
        collector = TwitterDataCollector()
        
        # Collect tweets
        tweets = collector.collect_analyst_tweets(
            analysts=analysts,
            max_tweets_per_analyst=10,
            max_analysts=5
        )
        
        # Save tweets
        collector.save_tweets(tweets)
        
    except Exception as e:
        logger.error(f"Error in main execution: {e}")
        raise

if __name__ == "__main__":
    main()
