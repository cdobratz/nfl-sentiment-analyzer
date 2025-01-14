# Use Python 3.9 slim as base
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies and cleanup in one layer
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# Install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && find /usr/local/lib/python3.9/site-packages -name "*.pyc" -delete \
    && find /usr/local/lib/python3.9/site-packages -name "__pycache__" -delete

# Create non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# Download NLTK data as non-root user
RUN python -c "import nltk; nltk.download('punkt', quiet=True)"

# Copy application code
COPY --chown=appuser:appuser . .

# Run the application
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
