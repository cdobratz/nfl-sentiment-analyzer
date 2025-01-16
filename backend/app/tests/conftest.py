import pytest
import sys
import os
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Set test environment variables
os.environ["TWITTER_API_KEY"] = "test_key"
os.environ["TWITTER_API_SECRET"] = "test_secret"
os.environ["TWITTER_BEARER_TOKEN"] = "test_token"
os.environ["ML_API_URL"] = "http://test-ml-service:8000"
