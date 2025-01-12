from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
from models.game_predictor import GamePredictor
from models.data_preprocessor import DataPreprocessor
import logging

app = FastAPI(title="NFL Game Prediction Service")
predictor = GamePredictor()
preprocessor = DataPreprocessor()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GamePredictionRequest(BaseModel):
    game_data: Dict[str, Any]
    historical_games: List[Dict[str, Any]]

class GamePredictionResponse(BaseModel):
    home_team_win_probability: float
    away_team_win_probability: float
    predicted_winner: str
    confidence: float
    feature_importance: Optional[Dict[str, float]]

@app.post("/predict", response_model=GamePredictionResponse)
async def predict_game(request: GamePredictionRequest):
    try:
        # Prepare features
        features = preprocessor.prepare_game_features(
            request.game_data,
            request.historical_games
        )
        
        # Make prediction
        prediction = predictor.predict(features)
        
        # Get feature importance
        importance = predictor.feature_importance()
        
        return {
            **prediction,
            'feature_importance': importance
        }
    except Exception as e:
        logger.error(f"Error making prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/train")
async def train_model(training_data: List[Dict[str, Any]]):
    try:
        # Convert training data to features
        processed_data = []
        for game in training_data:
            features = preprocessor.prepare_game_features(
                game,
                training_data  # Use all games as historical data
            )
            features['home_team_won'] = 1 if game.get('winner') == 'home' else 0
            processed_data.append(features)
        
        # Train model
        metrics = predictor.train(pd.DataFrame(processed_data))
        
        return {
            'message': 'Model trained successfully',
            'metrics': metrics
        }
    except Exception as e:
        logger.error(f"Error training model: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/model/info")
async def get_model_info():
    try:
        return {
            'features': predictor.feature_columns,
            'importance': predictor.feature_importance() if predictor.model else None,
            'model_type': 'GradientBoostingClassifier'
        }
    except Exception as e:
        logger.error(f"Error getting model info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
