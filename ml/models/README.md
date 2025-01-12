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

## Current State (as of 2025-01-11)

### Model Components
- `GamePredictor`: Main prediction model for NFL game outcomes
- `DataPreprocessor`: Handles data cleaning and feature engineering
- `ModelEvaluator`: Tracks and evaluates model performance metrics

### Monitoring Dashboard
Currently accessible at http://localhost:9999/dashboard

#### Features
- Real-time metric cards showing:
  - Current model accuracy
  - F1 score
  - Number of predictions made
  - Last updated timestamp
- Recent predictions table
- Feature importance visualization

## Advanced Feature Roadmap (Next Steps)

### Phase 1: Interactive Charts 
- Add Plotly/D3.js visualizations for:
  - Accuracy trends over time
  - Confusion matrix
  - ROC curves
  - Feature importance plots

### Phase 2: Real-time Updates 
- WebSocket integration for live metric updates
- Push notifications for significant changes
- Auto-refresh functionality with configurable intervals
- Live prediction streaming

### Phase 3: Performance Alerts 
- Configurable alert thresholds for metrics
- Email/Slack notifications for:
  - Accuracy drops below threshold
  - Unusual prediction patterns
  - Model drift indicators
- Alert history and management dashboard

### Phase 4: Data Drift Detection 
- Feature distribution monitoring
- Statistical drift detection algorithms
- Automated model retraining triggers
- Data quality monitoring
- Concept drift visualization

## Usage

### Starting the Dashboard
```bash
cd ml/
uvicorn api.monitoring_dashboard:app --reload --port 9999 --host 127.0.0.1
```

### Accessing Metrics
- Dashboard UI: http://localhost:9999/dashboard
- API Endpoints:
  - GET /api/metrics: Current metrics
  - GET /api/predictions: Recent predictions
  
## Dependencies
- FastAPI
- Uvicorn
- Python 3.12+

For detailed API documentation, visit http://localhost:9999/docs

## Documentation

### Model Architecture

#### GamePredictor
The main prediction model for NFL game outcomes.
- Input: Game features including team statistics, sentiment scores, and analyst predictions
- Output: Win probability for home team
- Key methods:
  - `predict()`: Generate game outcome predictions
  - `train()`: Train model on historical data
  - `evaluate()`: Calculate model performance metrics

#### DataPreprocessor
Handles data cleaning and feature engineering.
- Input: Raw game data, sentiment scores, and analyst predictions
- Output: Processed feature vectors for model training/prediction
- Features processed:
  - Team performance metrics
  - Historical head-to-head statistics
  - Sentiment analysis scores
  - Analyst confidence ratings

#### ModelEvaluator
Tracks and evaluates model performance.
- Metrics tracked:
  - Accuracy: Overall prediction accuracy
  - F1 Score: Balance between precision and recall
  - Precision: Accuracy of positive predictions
  - Recall: Ability to detect positive cases

### Monitoring Dashboard

#### API Endpoints

##### GET /api/metrics
Returns current model performance metrics.
```json
{
  "current_metrics": {
    "accuracy": 0.80,
    "f1": 0.79,
    "precision": 0.78,
    "recall": 0.80,
    "timestamp": "2025-01-11T22:00:00-07:00"
  },
  "prediction_count": 150,
  "last_updated": "2025-01-11T22:00:00-07:00"
}
```

##### GET /api/predictions
Returns recent prediction history.
```json
{
  "predictions": [
    {
      "timestamp": "2025-01-11T22:00:00-07:00",
      "accuracy": 0.80,
      "f1": 0.79,
      "precision": 0.78,
      "recall": 0.80
    }
  ]
}
```

#### Metric Definitions

##### Performance Metrics
- **Accuracy**: Percentage of correct predictions
  - Formula: (True Positives + True Negatives) / Total Predictions
  - Target: > 75%

- **F1 Score**: Harmonic mean of precision and recall
  - Formula: 2 * (Precision * Recall) / (Precision + Recall)
  - Target: > 0.75

- **Precision**: Accuracy of positive predictions
  - Formula: True Positives / (True Positives + False Positives)
  - Target: > 0.75

- **Recall**: Ability to detect actual positive cases
  - Formula: True Positives / (True Positives + False Negatives)
  - Target: > 0.75

##### Feature Importance
Relative impact of each feature on predictions:
- Home Team Win Rate: Historical win percentage
- Away Team Points: Average points scored in away games
- Home Team Defense: Points allowed at home
- Sentiment Score: Fan sentiment analysis
- Analyst Confidence: Expert prediction confidence

### Error Handling

#### Common Issues
1. **Dashboard Not Loading**
   - Check if server is running on port 9999
   - Verify no conflicting processes
   - Solution: `pkill -f uvicorn` and restart server

2. **Metrics Not Updating**
   - Check metrics file permissions
   - Verify ModelEvaluator initialization
   - Solution: Check logs in `models/metrics/metrics_log.jsonl`

3. **Missing Dependencies**
   - Install required packages: `pip install -r requirements.txt`
   - Verify Python version (3.12+ required)

### Security Considerations

1. **API Access**
   - Currently accessible only from localhost
   - Future: Add authentication for remote access
   - Rate limiting to be implemented

2. **Data Privacy**
   - No sensitive data stored in metrics
   - Aggregated statistics only
   - Logs automatically rotated

### Contributing

#### Adding New Features
1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Submit pull request

#### Code Style
- Follow PEP 8 guidelines
- Add type hints to new functions
- Include docstrings for all classes/methods
