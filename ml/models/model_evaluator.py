import json
import logging
from datetime import datetime
from pathlib import Path


class ModelEvaluator:
    def __init__(self, metrics_path: str = "models/metrics"):
        self.metrics_path = Path(metrics_path)
        self.metrics_file = self.metrics_path / "metrics_log.jsonl"
        self.logger = logging.getLogger(__name__)

        # Create metrics directory if it doesn't exist
        self.metrics_path.mkdir(parents=True, exist_ok=True)

        # Create metrics file if it doesn't exist
        if not self.metrics_file.exists():
            self.metrics_file.touch()

            # Add some sample data
            sample_metrics = [
                {
                    "timestamp": "2025-01-11T20:00:00-07:00",
                    "accuracy": 0.75,
                    "f1": 0.73,
                    "precision": 0.72,
                    "recall": 0.74,
                },
                {
                    "timestamp": "2025-01-11T21:00:00-07:00",
                    "accuracy": 0.78,
                    "f1": 0.76,
                    "precision": 0.75,
                    "recall": 0.77,
                },
                {
                    "timestamp": "2025-01-11T22:00:00-07:00",
                    "accuracy": 0.80,
                    "f1": 0.79,
                    "precision": 0.78,
                    "recall": 0.80,
                },
            ]

            for metrics in sample_metrics:
                self.log_metrics(metrics)

    def log_metrics(self, metrics: dict) -> None:
        """Log metrics to file with timestamp."""
        try:
            if "timestamp" not in metrics:
                metrics["timestamp"] = datetime.now().isoformat()

            with open(self.metrics_file, "a") as f:
                f.write(json.dumps(metrics) + "\n")
        except Exception as e:
            self.logger.error(f"Error logging metrics: {str(e)}")

    def get_metrics_history(self) -> list:
        """Load and return historical metrics."""
        try:
            metrics_list = []

            if self.metrics_file.exists():
                with open(self.metrics_file, "r") as f:
                    for line in f:
                        if line.strip():  # Skip empty lines
                            metrics_list.append(json.loads(line))

            return metrics_list
        except Exception as e:
            self.logger.error(f"Error loading metrics history: {str(e)}")
            return []

    def get_latest_metrics(self) -> dict:
        """Get the most recent metrics."""
        try:
            metrics_list = self.get_metrics_history()
            return metrics_list[-1] if metrics_list else {}
        except Exception as e:
            self.logger.error(f"Error getting latest metrics: {str(e)}")
            return {}
