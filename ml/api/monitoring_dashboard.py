from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any
import json
from models.model_evaluator import ModelEvaluator
import logging

app = FastAPI(title="NFL Prediction Model Monitoring")
evaluator = ModelEvaluator()
logger = logging.getLogger(__name__)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/dashboard", response_class=HTMLResponse)
async def get_dashboard():
    """Serve the monitoring dashboard HTML."""
    return """
    <!DOCTYPE html>
    <html>
        <head>
            <title>NFL Prediction Model Monitoring</title>
            <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
            <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                .chart-container { margin: 20px; padding: 20px; border: 1px solid #ddd; }
                .metric-card { margin: 10px; padding: 15px; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="container-fluid">
                <h1 class="text-center my-4">NFL Prediction Model Monitoring</h1>
                
                <div class="row">
                    <div class="col-md-3">
                        <div class="metric-card bg-light" id="current-accuracy"></div>
                    </div>
                    <div class="col-md-3">
                        <div class="metric-card bg-light" id="current-f1"></div>
                    </div>
                    <div class="col-md-3">
                        <div class="metric-card bg-light" id="prediction-count"></div>
                    </div>
                    <div class="col-md-3">
                        <div class="metric-card bg-light" id="last-updated"></div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-6">
                        <div class="chart-container">
                            <div id="metrics-history"></div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="chart-container">
                            <div id="feature-importance"></div>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-12">
                        <div class="chart-container">
                            <div id="confusion-matrix"></div>
                        </div>
                    </div>
                </div>
            </div>

            <script>
                function updateDashboard() {
                    $.get('/api/metrics', function(data) {
                        // Update metric cards
                        $('#current-accuracy').html(`
                            <h4>Current Accuracy</h4>
                            <h2>${(data.current_metrics.accuracy * 100).toFixed(1)}%</h2>
                        `);
                        $('#current-f1').html(`
                            <h4>Current F1 Score</h4>
                            <h2>${(data.current_metrics.f1 * 100).toFixed(1)}%</h2>
                        `);
                        $('#prediction-count').html(`
                            <h4>Predictions Made</h4>
                            <h2>${data.prediction_count}</h2>
                        `);
                        $('#last-updated').html(`
                            <h4>Last Updated</h4>
                            <h2>${new Date(data.last_updated).toLocaleString()}</h2>
                        `);

                        // Update charts
                        Plotly.newPlot('metrics-history', data.metrics_history);
                        Plotly.newPlot('feature-importance', data.feature_importance);
                        Plotly.newPlot('confusion-matrix', data.confusion_matrix);
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
        metrics_df = evaluator.get_metrics_history()
        
        # Current metrics
        current_metrics = metrics_df.iloc[-1].to_dict() if not metrics_df.empty else {
            'accuracy': 0,
            'f1': 0
        }
        
        # Create metrics history plot
        metrics_history = {
            'data': [
                go.Scatter(x=metrics_df['timestamp'], y=metrics_df['accuracy'],
                          name='Accuracy'),
                go.Scatter(x=metrics_df['timestamp'], y=metrics_df['f1'],
                          name='F1 Score')
            ],
            'layout': {
                'title': 'Model Performance History',
                'xaxis': {'title': 'Date'},
                'yaxis': {'title': 'Score'}
            }
        }

        # Get feature importance
        feature_importance = evaluator.plot_feature_importance(None)
        
        return {
            'current_metrics': current_metrics,
            'metrics_history': metrics_history,
            'feature_importance': feature_importance,
            'prediction_count': len(metrics_df),
            'last_updated': metrics_df['timestamp'].max() if not metrics_df.empty else None
        }
    except Exception as e:
        logger.error(f"Error getting metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/predictions")
async def get_predictions(days: int = 7):
    """Get prediction results for the last N days."""
    try:
        metrics_df = evaluator.get_metrics_history()
        recent_metrics = metrics_df[
            metrics_df['timestamp'] >= (datetime.now() - timedelta(days=days))
        ]
        
        return {
            'predictions': recent_metrics.to_dict(orient='records')
        }
    except Exception as e:
        logger.error(f"Error getting predictions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
