import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib
import logging
from typing import Dict, List, Tuple, Any
import json

class GamePredictor:
    def __init__(self, model_path: str = 'models/saved/game_predictor.joblib'):
        self.model_path = model_path
        self.model = None
        self.scaler = StandardScaler()
        self.feature_columns = [
            # Team performance features
            'home_win_rate', 'away_win_rate',
            'home_points_scored_avg', 'away_points_scored_avg',
            'home_points_allowed_avg', 'away_points_allowed_avg',
            
            # Advanced stats
            'home_yards_per_play', 'away_yards_per_play',
            'home_turnover_diff', 'away_turnover_diff',
            
            # Sentiment features
            'home_sentiment_score', 'away_sentiment_score',
            'analyst_confidence_home', 'analyst_confidence_away',
            
            # Game context
            'is_division_game', 'is_primetime',
            'home_rest_days', 'away_rest_days'
        ]
        
        self.logger = logging.getLogger(__name__)

    def preprocess_data(self, data: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Preprocess the input data for training or prediction."""
        try:
            # Extract features and target
            X = data[self.feature_columns]
            y = data['home_team_won'] if 'home_team_won' in data.columns else None
            
            # Scale features
            X_scaled = self.scaler.fit_transform(X) if y is not None else self.scaler.transform(X)
            
            return X_scaled, y
        except Exception as e:
            self.logger.error(f"Error in preprocessing data: {str(e)}")
            raise

    def train(self, training_data: pd.DataFrame) -> Dict[str, float]:
        """Train the model and return performance metrics."""
        try:
            # Preprocess data
            X, y = self.preprocess_data(training_data)
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            
            # Initialize and train model
            self.model = GradientBoostingClassifier(
                n_estimators=100,
                learning_rate=0.1,
                max_depth=5,
                random_state=42
            )
            
            self.model.fit(X_train, y_train)
            
            # Evaluate model
            y_pred = self.model.predict(X_test)
            accuracy = accuracy_score(y_test, y_pred)
            report = classification_report(y_test, y_pred, output_dict=True)
            
            # Save model
            self.save_model()
            
            return {
                'accuracy': accuracy,
                'classification_report': report
            }
            
        except Exception as e:
            self.logger.error(f"Error in training model: {str(e)}")
            raise

    def predict(self, game_data: Dict[str, Any]) -> Dict[str, Any]:
        """Make predictions for a single game."""
        try:
            # Load model if not loaded
            if self.model is None:
                self.load_model()
            
            # Convert game data to DataFrame
            df = pd.DataFrame([game_data])
            
            # Preprocess data
            X_scaled, _ = self.preprocess_data(df)
            
            # Make prediction
            win_prob = self.model.predict_proba(X_scaled)[0]
            prediction = self.model.predict(X_scaled)[0]
            
            return {
                'home_team_win_probability': float(win_prob[1]),
                'away_team_win_probability': float(win_prob[0]),
                'predicted_winner': 'home' if prediction == 1 else 'away',
                'confidence': float(max(win_prob))
            }
            
        except Exception as e:
            self.logger.error(f"Error in making prediction: {str(e)}")
            raise

    def save_model(self):
        """Save the trained model to disk."""
        try:
            model_data = {
                'model': self.model,
                'scaler': self.scaler,
                'feature_columns': self.feature_columns
            }
            joblib.dump(model_data, self.model_path)
            self.logger.info(f"Model saved to {self.model_path}")
        except Exception as e:
            self.logger.error(f"Error saving model: {str(e)}")
            raise

    def load_model(self):
        """Load the trained model from disk."""
        try:
            model_data = joblib.load(self.model_path)
            self.model = model_data['model']
            self.scaler = model_data['scaler']
            self.feature_columns = model_data['feature_columns']
            self.logger.info(f"Model loaded from {self.model_path}")
        except Exception as e:
            self.logger.error(f"Error loading model: {str(e)}")
            raise

    def feature_importance(self) -> Dict[str, float]:
        """Get feature importance scores."""
        if self.model is None:
            raise ValueError("Model not trained or loaded")
            
        importance_scores = self.model.feature_importances_
        return dict(zip(self.feature_columns, importance_scores))
