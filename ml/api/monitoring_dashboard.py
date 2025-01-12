from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
import json
from datetime import datetime, timedelta
import logging
from models.model_evaluator import ModelEvaluator

app = FastAPI(title="NFL Prediction Model Monitoring")
evaluator = ModelEvaluator()
logger = logging.getLogger(__name__)

@app.get("/")
async def root():
    return {"message": "NFL Prediction Model Monitoring API"}

@app.get("/dashboard", response_class=HTMLResponse)
async def get_dashboard():
    """Serve the monitoring dashboard HTML."""
    return """
    <!DOCTYPE html>
    <html>
        <head>
            <title>NFL Prediction Model Monitoring</title>
            <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                .metric-card { 
                    margin: 10px; 
                    padding: 15px; 
                    border-radius: 5px;
                    background-color: #f8f9fa;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .metric-value {
                    font-size: 24px;
                    font-weight: bold;
                    color: #0d6efd;
                }
                .metric-label {
                    color: #6c757d;
                    font-size: 14px;
                }
                .table-container {
                    margin: 20px;
                    padding: 20px;
                    background-color: white;
                    border-radius: 5px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
            </style>
        </head>
        <body>
            <div class="container-fluid">
                <h1 class="text-center my-4">NFL Prediction Model Monitoring</h1>
                
                <div class="row">
                    <div class="col-md-3">
                        <div class="metric-card">
                            <div id="current-accuracy">
                                <div class="metric-label">Current Accuracy</div>
                                <div class="metric-value">Loading...</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="metric-card">
                            <div id="current-f1">
                                <div class="metric-label">Current F1 Score</div>
                                <div class="metric-value">Loading...</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="metric-card">
                            <div id="prediction-count">
                                <div class="metric-label">Predictions Made</div>
                                <div class="metric-value">Loading...</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="metric-card">
                            <div id="last-updated">
                                <div class="metric-label">Last Updated</div>
                                <div class="metric-value">Loading...</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-12">
                        <div class="table-container">
                            <h3>Recent Predictions</h3>
                            <table class="table table-striped" id="predictions-table">
                                <thead>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>Accuracy</th>
                                        <th>F1 Score</th>
                                        <th>Precision</th>
                                        <th>Recall</th>
                                    </tr>
                                </thead>
                                <tbody>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-12">
                        <div class="table-container">
                            <h3>Feature Importance</h3>
                            <table class="table table-striped" id="feature-importance-table">
                                <thead>
                                    <tr>
                                        <th>Feature</th>
                                        <th>Importance Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <script>
                function updateDashboard() {
                    $.get('/api/metrics', function(data) {
                        // Update metric cards
                        $('#current-accuracy .metric-value').text(
                            (data.current_metrics.accuracy * 100).toFixed(1) + '%'
                        );
                        $('#current-f1 .metric-value').text(
                            (data.current_metrics.f1 * 100).toFixed(1) + '%'
                        );
                        $('#prediction-count .metric-value').text(
                            data.prediction_count
                        );
                        $('#last-updated .metric-value').text(
                            new Date(data.last_updated).toLocaleString()
                        );

                        // Update predictions table
                        const predictionsBody = $('#predictions-table tbody');
                        predictionsBody.empty();
                        data.predictions.forEach(pred => {
                            predictionsBody.append(`
                                <tr>
                                    <td>${new Date(pred.timestamp).toLocaleString()}</td>
                                    <td>${(pred.accuracy * 100).toFixed(1)}%</td>
                                    <td>${(pred.f1 * 100).toFixed(1)}%</td>
                                    <td>${(pred.precision * 100).toFixed(1)}%</td>
                                    <td>${(pred.recall * 100).toFixed(1)}%</td>
                                </tr>
                            `);
                        });

                        // Update feature importance table
                        const featureBody = $('#feature-importance-table tbody');
                        featureBody.empty();
                        Object.entries(data.feature_importance)
                            .sort((a, b) => b[1] - a[1])
                            .forEach(([feature, importance]) => {
                                featureBody.append(`
                                    <tr>
                                        <td>${feature}</td>
                                        <td>${(importance * 100).toFixed(1)}%</td>
                                    </tr>
                                `);
                            });
                    });
                }

                // Update every 5 minutes
                $(document).ready(function() {
                    updateDashboard();
                    setInterval(updateDashboard, 300000);
                });
            </script>
        </body>
    </html>
    """

@app.get("/api/metrics")
async def get_metrics():
    """Get current metrics and visualizations for the dashboard."""
    try:
        # Get metrics history
        metrics_list = evaluator.get_metrics_history()
        
        # Current metrics (or default values if no data)
        current_metrics = evaluator.get_latest_metrics() or {
            'accuracy': 0.0,
            'f1': 0.0,
            'precision': 0.0,
            'recall': 0.0
        }
        
        # Get recent predictions (last 10)
        recent_predictions = metrics_list[-10:] if metrics_list else []
        
        # Get feature importance (mock data for now)
        feature_importance = {
            'Home Team Win Rate': 0.15,
            'Away Team Points Scored Avg': 0.12,
            'Home Team Points Allowed Avg': 0.11,
            'Analyst Confidence Home': 0.10,
            'Home Sentiment Score': 0.09,
            'Away Team Win Rate': 0.08,
            'Home Team Points Scored Avg': 0.07,
            'Away Team Points Allowed Avg': 0.07,
            'Away Sentiment Score': 0.06,
            'Analyst Confidence Away': 0.05
        }
        
        return {
            'current_metrics': current_metrics,
            'predictions': recent_predictions,
            'feature_importance': feature_importance,
            'prediction_count': len(metrics_list),
            'last_updated': current_metrics.get('timestamp', datetime.now().isoformat())
        }
    except Exception as e:
        logger.error(f"Error getting metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/predictions")
async def get_predictions(days: int = 7):
    """Get prediction results for the last N days."""
    try:
        metrics_list = evaluator.get_metrics_history()
        cutoff_date = datetime.now() - timedelta(days=days)
        
        recent_metrics = [
            metric for metric in metrics_list
            if datetime.fromisoformat(metric['timestamp']) >= cutoff_date
        ] if metrics_list else []
        
        return {'predictions': recent_metrics}
    except Exception as e:
        logger.error(f"Error getting predictions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
