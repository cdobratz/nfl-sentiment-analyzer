# NFL Game Prediction Models

This directory contains the machine learning models and data processing components for NFL game predictions.

## Models Overview

### GamePredictor
The primary model for game predictions using Gradient Boosting Classification.

#### Features Used
1. **Team Performance Metrics**
   - Win rates
   - Points scored/allowed averages
   - Yards per play
   - Turnover differential

2. **Social Sentiment Features**
   - Fan sentiment scores
   - Analyst confidence levels
   - Social media engagement metrics

3. **Game Context**
   - Division game flag
   - Primetime game flag
   - Rest days between games
   - Historical matchup data

#### Model Architecture
- Algorithm: Gradient Boosting Classifier
- Features: 18 input features
- Output: Binary classification (home/away win)
- Confidence: Probability scores for predictions

## Usage Guide

### 1. Making Predictions
```python
from models.game_predictor import GamePredictor
from models.data_preprocessor import DataPreprocessor

# Initialize
predictor = GamePredictor()
preprocessor = DataPreprocessor()

# Prepare data
features = preprocessor.prepare_game_features(game_data, historical_games)

# Get prediction
prediction = predictor.predict(features)
```

### 2. Training the Model
```python
# Prepare training data
training_data = preprocessor.prepare_game_features(games_data, historical_data)

# Train model
metrics = predictor.train(training_data)
```

### 3. Model Evaluation
```python
# Get feature importance
importance = predictor.feature_importance()

# Get model metrics
metrics = predictor.evaluate(test_data)
```

## Model Performance

### Current Metrics
- Accuracy: ~70-75% (varies by season)
- ROC-AUC: ~0.75-0.80
- F1 Score: ~0.72-0.76

### Feature Importance (Top 5)
1. Home team win rate (0.15)
2. Away team points scored avg (0.12)
3. Home team points allowed avg (0.11)
4. Analyst confidence home (0.10)
5. Home sentiment score (0.09)

## Data Preprocessing

### DataPreprocessor
Handles all data preparation tasks:
- Team statistics calculation
- Sentiment data processing
- Feature engineering
- Data validation

#### Key Functions
- `calculate_team_stats()`: Computes rolling team performance metrics
- `process_sentiment_data()`: Aggregates and normalizes sentiment scores
- `prepare_game_features()`: Combines all features for prediction

## Model Updates
- Model is retrained weekly with new game data
- Performance metrics are logged and monitored
- Feature importance is tracked over time

## Error Handling
- Robust error handling for missing data
- Fallback predictions when sentiment data unavailable
- Data validation at each processing step

## Future Improvements
1. Ensemble model approach
2. Real-time odds integration
3. Player injury impact analysis
4. Weather data integration
5. Automated model retraining pipeline

## API Integration
The model is served via FastAPI endpoints:
- `/predict`: Get game predictions
- `/train`: Retrain model with new data
- `/model/info`: Get model statistics and status

For more details on the API, see the [API documentation](../api/README.md).
