"""
NFL Tweet Sentiment Analyzer using Hugging Face Transformers.
Specifically tuned for sports-related content with additional preprocessing
and NFL-specific context handling.
"""

import logging
from typing import List, Dict, Union, Any
import pandas as pd
import numpy as np
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import torch
from pathlib import Path
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class NFLSentimentAnalyzer:
    def __init__(
        self,
        model_name: str = "finiteautomata/bertweet-base-sentiment-analysis",
        device: str = "cuda" if torch.cuda.is_available() else "cpu",
        batch_size: int = 16
    ):
        """
        Initialize the NFL sentiment analyzer.
        
        Args:
            model_name: Name of the pretrained model to use
            device: Device to run the model on ('cuda' or 'cpu')
            batch_size: Batch size for processing
        """
        logger.info(f"Initializing NFL Sentiment Analyzer with model: {model_name}")
        logger.info(f"Using device: {device}")
        
        self.device = device
        self.batch_size = batch_size
        
        # Load NFL-specific context
        self.nfl_teams = self._load_nfl_context()
        
        # Initialize the sentiment analysis pipeline
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModelForSequenceClassification.from_pretrained(model_name)
            self.model.to(device)
            
            self.analyzer = pipeline(
                "sentiment-analysis",
                model=self.model,
                tokenizer=self.tokenizer,
                device=0 if device == "cuda" else -1,
                batch_size=batch_size
            )
            logger.info("Successfully loaded sentiment analysis model")
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise

    def _load_nfl_context(self) -> Dict[str, Any]:
        """Load NFL-specific context for better analysis."""
        context_path = Path(__file__).parent / "nfl_context.json"
        try:
            with open(context_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.warning("NFL context file not found, using default context")
            return {
                "teams": {
                    "Patriots": ["NE", "New England"],
                    "Bills": ["BUF", "Buffalo"],
                    # Add more teams...
                }
            }

    def preprocess_text(self, text: str) -> str:
        """
        Preprocess tweet text for better sentiment analysis.
        
        Args:
            text: Raw tweet text
            
        Returns:
            Preprocessed text
        """
        # Convert to lowercase
        text = text.lower()
        
        # Replace team abbreviations with full names for better context
        for team, variants in self.nfl_teams.get("teams", {}).items():
            for variant in variants:
                text = text.replace(variant.lower(), team.lower())
        
        # Remove URLs
        text = ' '.join(word for word in text.split() if not word.startswith('http'))
        
        # Remove mentions but keep hashtags for context
        text = ' '.join(word for word in text.split() if not word.startswith('@'))
        
        return text.strip()

    def analyze_sentiment(
        self,
        tweets: List[Dict[str, Any]],
        include_confidence: bool = True
    ) -> pd.DataFrame:
        """
        Analyze sentiment of NFL-related tweets.
        
        Args:
            tweets: List of tweet dictionaries with 'text' key
            include_confidence: Whether to include confidence scores
            
        Returns:
            DataFrame with sentiment analysis results
        """
        logger.info(f"Analyzing sentiment for {len(tweets)} tweets")
        
        results = []
        texts = [self.preprocess_text(tweet['text']) for tweet in tweets]
        
        try:
            # Process in batches
            for i in range(0, len(texts), self.batch_size):
                batch_texts = texts[i:i + self.batch_size]
                batch_results = self.analyzer(batch_texts)
                
                for j, sentiment in enumerate(batch_results):
                    result = {
                        'text': tweets[i + j]['text'],
                        'preprocessed_text': texts[i + j],
                        'sentiment': sentiment['label'],
                        'score': sentiment['score'],
                    }
                    
                    if include_confidence:
                        result['confidence'] = self._calculate_confidence(sentiment['score'])
                    
                    # Add original tweet metadata if available
                    for key in ['author', 'created_at', 'metrics']:
                        if key in tweets[i + j]:
                            result[key] = tweets[i + j][key]
                    
                    results.append(result)
                
            logger.info("Successfully completed sentiment analysis")
            
        except Exception as e:
            logger.error(f"Error during sentiment analysis: {e}")
            raise
        
        return pd.DataFrame(results)

    def _calculate_confidence(self, score: float) -> float:
        """Calculate confidence score based on sentiment score."""
        # Transform raw score to confidence (0-1 scale)
        return abs(2 * (score - 0.5))

    def analyze_trends(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Analyze sentiment trends from analyzed tweets.
        
        Args:
            df: DataFrame with sentiment analysis results
            
        Returns:
            Dictionary with trend analysis
        """
        try:
            trends = {
                'overall_sentiment': df['score'].mean(),
                'sentiment_distribution': {
                    'positive': len(df[df['sentiment'] == 'POSITIVE']) / len(df),
                    'negative': len(df[df['sentiment'] == 'NEGATIVE']) / len(df),
                },
                'confidence': {
                    'mean': df['confidence'].mean() if 'confidence' in df else None,
                    'std': df['confidence'].std() if 'confidence' in df else None,
                }
            }
            
            # Add time-based analysis if timestamps available
            if 'created_at' in df:
                df['created_at'] = pd.to_datetime(df['created_at'])
                trends['temporal'] = {
                    'hourly_sentiment': df.set_index('created_at')
                        .resample('H')['score']
                        .mean()
                        .to_dict()
                }
            
            return trends
            
        except Exception as e:
            logger.error(f"Error analyzing trends: {e}")
            raise

    def save_model(self, path: str):
        """Save the model and tokenizer to disk."""
        try:
            save_path = Path(path)
            self.model.save_pretrained(save_path / "model")
            self.tokenizer.save_pretrained(save_path / "tokenizer")
            logger.info(f"Model saved to {path}")
        except Exception as e:
            logger.error(f"Error saving model: {e}")
            raise

    @classmethod
    def load_model(cls, path: str):
        """Load a saved model and tokenizer from disk."""
        try:
            path = Path(path)
            instance = cls.__new__(cls)
            instance.model = AutoModelForSequenceClassification.from_pretrained(path / "model")
            instance.tokenizer = AutoTokenizer.from_pretrained(path / "tokenizer")
            logger.info(f"Model loaded from {path}")
            return instance
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise
