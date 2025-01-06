"""FastAPI service for NFL sentiment analysis."""

from typing import Dict, List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import logging
from models.sentiment import NFLSentimentAnalyzer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="NFL Sentiment Analysis API")

# Initialize models
model_registry: Dict[str, dict] = {
    "bertweet-base": {
        "model": NFLSentimentAnalyzer(),
        "description": "BERTweet model fine-tuned for sentiment analysis"
    }
}

class SentimentScore(BaseModel):
    """Sentiment score model."""
    score: float
    confidence: float

class SentimentResponse(BaseModel):
    """Response model for sentiment analysis."""
    text: str
    sentiment: SentimentScore
    label: str

class TextRequest(BaseModel):
    """Request model for sentiment analysis."""
    texts: List[str]
    model_name: str = "bertweet-base"

@app.get("/models")
async def list_models() -> Dict[str, Dict[str, str]]:
    """List available models and their descriptions."""
    return {
        name: {"description": info["description"]} 
        for name, info in model_registry.items()
    }

@app.post("/analyze", response_model=List[SentimentResponse])
async def analyze_texts(request: TextRequest) -> List[SentimentResponse]:
    """Analyze sentiment for a list of texts."""
    try:
        model = model_registry.get(request.model_name)
        if not model:
            raise HTTPException(
                status_code=400,
                detail=f"Model {request.model_name} not found. Available models: {list(model_registry.keys())}"
            )

        results = []
        for text in request.texts:
            try:
                analysis = await model["model"].analyzer(text)
                results.append(SentimentResponse(
                    text=text,
                    sentiment=SentimentScore(
                        score=float(analysis["score"]),
                        confidence=float(analysis["confidence"])
                    ),
                    label=analysis["label"]
                ))
            except Exception as e:
                logger.error(f"Error analyzing text: {text}", exc_info=True)
                results.append(SentimentResponse(
                    text=text,
                    sentiment=SentimentScore(score=0, confidence=0),
                    label="neutral"
                ))

        return results

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error("Error processing request", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)