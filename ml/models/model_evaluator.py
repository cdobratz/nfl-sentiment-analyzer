import pandas as pd
import numpy as np
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report
)
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, List, Any, Tuple
import logging
import json
from datetime import datetime

class ModelEvaluator:
    def __init__(self, metrics_path: str = 'models/metrics'):
        self.metrics_path = metrics_path
        self.logger = logging.getLogger(__name__)

    def evaluate_model(self, y_true: np.ndarray, y_pred: np.ndarray, 
                      y_prob: np.ndarray) -> Dict[str, float]:
        """Evaluate model performance with multiple metrics."""
        try:
            metrics = {
                'accuracy': accuracy_score(y_true, y_pred),
                'precision': precision_score(y_true, y_pred),
                'recall': recall_score(y_true, y_pred),
                'f1': f1_score(y_true, y_pred),
                'roc_auc': roc_auc_score(y_true, y_prob[:, 1])
            }
            
            # Log metrics
            self._log_metrics(metrics)
            
            return metrics
        except Exception as e:
            self.logger.error(f"Error evaluating model: {str(e)}")
            raise

    def plot_confusion_matrix(self, y_true: np.ndarray, y_pred: np.ndarray, 
                            save_path: str = None) -> None:
        """Plot and optionally save confusion matrix."""
        try:
            cm = confusion_matrix(y_true, y_pred)
            plt.figure(figsize=(8, 6))
            sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
            plt.title('Confusion Matrix')
            plt.ylabel('True Label')
            plt.xlabel('Predicted Label')
            
            if save_path:
                plt.savefig(save_path)
                plt.close()
            else:
                plt.show()
        except Exception as e:
            self.logger.error(f"Error plotting confusion matrix: {str(e)}")
            raise

    def plot_feature_importance(self, feature_importance: Dict[str, float], 
                              save_path: str = None) -> None:
        """Plot feature importance scores."""
        try:
            # Sort features by importance
            sorted_features = dict(sorted(feature_importance.items(), 
                                       key=lambda x: x[1], reverse=True))
            
            plt.figure(figsize=(12, 6))
            plt.bar(sorted_features.keys(), sorted_features.values())
            plt.xticks(rotation=45, ha='right')
            plt.title('Feature Importance')
            plt.tight_layout()
            
            if save_path:
                plt.savefig(save_path)
                plt.close()
            else:
                plt.show()
        except Exception as e:
            self.logger.error(f"Error plotting feature importance: {str(e)}")
            raise

    def generate_evaluation_report(self, y_true: np.ndarray, y_pred: np.ndarray,
                                 y_prob: np.ndarray, feature_importance: Dict[str, float],
                                 save_path: str = None) -> Dict[str, Any]:
        """Generate comprehensive evaluation report."""
        try:
            # Calculate metrics
            metrics = self.evaluate_model(y_true, y_pred, y_prob)
            
            # Generate classification report
            class_report = classification_report(y_true, y_pred, output_dict=True)
            
            # Create report
            report = {
                'timestamp': datetime.now().isoformat(),
                'metrics': metrics,
                'classification_report': class_report,
                'feature_importance': feature_importance
            }
            
            # Save report
            if save_path:
                with open(save_path, 'w') as f:
                    json.dump(report, f, indent=2)
            
            return report
        except Exception as e:
            self.logger.error(f"Error generating evaluation report: {str(e)}")
            raise

    def _log_metrics(self, metrics: Dict[str, float]) -> None:
        """Log metrics to file with timestamp."""
        try:
            timestamp = datetime.now().isoformat()
            log_entry = {
                'timestamp': timestamp,
                'metrics': metrics
            }
            
            log_file = f"{self.metrics_path}/metrics_log.jsonl"
            with open(log_file, 'a') as f:
                f.write(json.dumps(log_entry) + '\n')
        except Exception as e:
            self.logger.error(f"Error logging metrics: {str(e)}")
            # Don't raise exception as this is a non-critical operation

    def get_metrics_history(self) -> pd.DataFrame:
        """Load and return historical metrics."""
        try:
            log_file = f"{self.metrics_path}/metrics_log.jsonl"
            metrics_list = []
            
            with open(log_file, 'r') as f:
                for line in f:
                    entry = json.loads(line)
                    metrics_list.append({
                        'timestamp': entry['timestamp'],
                        **entry['metrics']
                    })
            
            return pd.DataFrame(metrics_list)
        except Exception as e:
            self.logger.error(f"Error loading metrics history: {str(e)}")
            return pd.DataFrame()
