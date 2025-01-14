import aiohttp
import os
from typing import Dict, Union


class SentimentAnalyzer:
    def __init__(self, ml_service_url: str = None):
        self.ml_service_url = ml_service_url or os.getenv(
            "ML_API_URL", "http://localhost:8000/analyze"
        )

    async def analyze(self, text: str) -> Dict[str, Union[str, float]]:
        if not text:
            return {"sentiment": "neutral", "score": 0.0}

        async with aiohttp.ClientSession() as session:
            async with session.post(
                self.ml_service_url,
                json={"texts": [text], "model_name": "bertweet-base"},
            ) as response:
                if response.status == 200:
                    results = await response.json()
                    if results and len(results) > 0:
                        result = results[0]
                        return {
                            "sentiment": result["label"],
                            "score": result["sentiment"]["score"],
                        }
                return {"sentiment": "neutral", "score": 0.0}
