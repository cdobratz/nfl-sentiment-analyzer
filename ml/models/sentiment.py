"""NFL Sentiment Analysis Model using HuggingFace's BERTweet."""

from typing import Dict, Any
from transformers import AutoModelForSequenceClassification, AutoTokenizer
import torch

class NFLSentimentAnalyzer:
    """Sentiment analyzer for NFL-related text using BERTweet."""

    def __init__(self):
        """Initialize the model and tokenizer."""
        self.model_name = "finiteautomata/bertweet-base-sentiment-analysis"
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(self.model_name)
        self.id2label = {
            0: "negative",
            1: "neutral",
            2: "positive"
        }

    async def analyzer(self, text: str) -> Dict[str, Any]:
        """
        Analyze the sentiment of a given text.
        
        Args:
            text: The text to analyze
            
        Returns:
            Dict containing sentiment scores and label
        """
        # Tokenize and get model predictions
        inputs = self.tokenizer(text, return_tensors="pt", truncation=True, max_length=128)
        with torch.no_grad():
            outputs = self.model(**inputs)
            
        # Get probabilities
        probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
        
        # Get prediction and confidence
        prediction = torch.argmax(probs, dim=-1)
        label = self.id2label[prediction.item()]
        confidence = probs[0][prediction].item()
        
        # Calculate sentiment score (-1 to 1)
        score = (probs[0][2].item() - probs[0][0].item())  # positive - negative
        
        return {
            "label": label,
            "confidence": confidence,
            "score": score
        }
