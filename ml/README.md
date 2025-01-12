# NFL Sentiment Analysis ML Service

This service provides sentiment analysis for NFL-related text using state-of-the-art transformer models. It's designed to be extensible, allowing for easy integration of new models for comparative analysis.

## Architecture

### Model Registry
The service uses a model registry pattern that allows multiple sentiment analysis models to be registered and used. Currently, it includes:

- **BERTweet Base** (`bertweet-base`): A RoBERTa model pre-trained on English tweets and fine-tuned for sentiment analysis. This model is particularly well-suited for analyzing social media content about NFL games.

### API Endpoints

#### 1. List Available Models
```http
GET /models
```
Returns a list of available models and their descriptions.

**Response Example:**
```json
{
    "bertweet-base": {
        "description": "BERTweet model fine-tuned for sentiment analysis"
    }
}
```

#### 2. Analyze Sentiment
```http
POST /analyze
```

**Request Body:**
```json
{
    "texts": ["Great game by the Patriots!", "Terrible performance by the Jets"],
    "model_name": "bertweet-base"  // optional, defaults to "bertweet-base"
}
```

**Response Example:**
```json
[
    {
        "text": "Great game by the Patriots!",
        "sentiment": {
            "score": 0.92,
            "confidence": 0.95
        },
        "label": "positive"
    },
    {
        "text": "Terrible performance by the Jets",
        "sentiment": {
            "score": -0.85,
            "confidence": 0.88
        },
        "label": "negative"
    }
]
```

### Sentiment Scoring
- **Score**: Ranges from -1 (most negative) to 1 (most positive)
- **Confidence**: Ranges from 0 to 1, indicating model's confidence in the prediction
- **Label**: One of "positive", "negative", or "neutral"

## Installation

1. Create a virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Service

Start the FastAPI server:
```bash
python -m uvicorn api.main:app --reload
```

The API will be available at `http://localhost:8000`.

## Testing

Run the test suite:
```bash
python -m pytest tests/ -v
```

## Error Handling

The service includes robust error handling:
- Invalid model requests return 400 status code
- Malformed requests return 422 status code
- Server errors return 500 status code
- Failed analyses return neutral sentiment with 0 confidence

## Adding New Models

To add a new model:

1. Create a new model class in `models/` that implements the `analyzer` method
2. Register the model in `api/main.py`:
```python
model_registry["new-model"] = {
    "model": NewModel(),
    "description": "Description of the new model"
}
```

## Performance Considerations

- The service uses caching in the TypeScript backend to reduce API calls
- Models are loaded once at startup and kept in memory
- Batch processing is supported for multiple texts
- Async/await is used for non-blocking operations

## Security

- CORS settings should be configured for production
- Rate limiting should be implemented based on usage patterns
- API keys should be added for production deployment

## Future Improvements

1. Add more pre-trained models for comparison
2. Implement model versioning
3. Add model performance metrics
4. Add caching at the ML service level
5. Add support for streaming responses for large batches
