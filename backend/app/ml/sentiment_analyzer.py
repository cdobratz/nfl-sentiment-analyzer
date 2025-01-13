import aiohttp
import os
from typing import Dict, Union

class SentimentAnalyzer:
    def __init__(self, ml_service_url: str = None):
        self.ml_service_url = ml_service_url or os.getenv("ML_API_URL", "http://localhost:8000/ml/analyze")

    async def analyze(self, text: str) -> Dict[str, Union[str, float]]:
        if not text:
            return {"sentiment": "neutral", "score": 0.0}

        async with aiohttp.ClientSession() as session:
            async with session.post(
                self.ml_service_url,
                json={"text": text}
            ) as response:
                if response.status == 200:
                    return await response.json()
                return {"sentiment": "neutral", "score": 0.0}
