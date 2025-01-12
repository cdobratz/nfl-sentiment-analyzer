# NFL Sentiment Analyzer

A full-stack application that analyzes sentiment around NFL games, teams, and players using social media data and ESPN coverage.

## Features

- Real-time sentiment analysis of NFL-related social media posts
- Game-by-game sentiment tracking
- Interactive dashboard with sentiment trends
- Player and team analysis
- Integration with Twitter API and ESPN data

## Tech Stack

- Frontend: React with TypeScript
- Backend: Node.js/Express with TypeScript
- ML: Python for sentiment analysis
- Database: MongoDB
- APIs: Twitter API, ESPN API

## Project Structure

```
nfl-sentiment-analyzer/
├── frontend/           # React frontend application
├── backend/           # Node.js/Express backend
├── ml/               # Machine learning components
├── config/           # Configuration files
├── scripts/          # Utility scripts
└── docs/            # Documentation
```

## Getting Started

### Prerequisites

- Node.js >= 16
- Python >= 3.8
- MongoDB
- Twitter API credentials
- ESPN API access

### Installation

1. Clone the repository
2. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```
3. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```
4. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Set up environment variables (see `.env.example`)

### Development

1. Start frontend development server:
   ```bash
   cd frontend
   npm run dev
   ```

2. Start backend server:
   ```bash
   cd backend
   npm run dev
   ```

## NFL Sentiment Analysis ML Service

This service provides sentiment analysis for NFL-related text using state-of-the-art transformer models. It's designed to be extensible, allowing for easy integration of new models for comparative analysis.

### Architecture

The service uses a model registry pattern that allows multiple sentiment analysis models to be registered and used. Currently, it includes:

- **Model Registry**: The service stores and manages a collection of sentiment analysis models, each with its own configuration and performance metrics.
- **API**: The service exposes an API for registering new models, retrieving model details, and triggering sentiment analysis tasks.

#### See more in the [ML Service](./ml/README.md)

### API Rate Limits and Caching Strategy

This project is designed to work within the free tier limits of the Twitter API. Here's how we manage API usage:

### Twitter API Limits (Free Tier)
- 3 requests per 15-minute window
- 96 requests per 24-hour period
- Maximum of 10 tweets per request

### Our Rate Limit Management
1. **Aggressive Caching**
   - Tweets are cached for 1 hour
   - Failed requests are cached for 30 minutes to prevent repeated failures
   - Cache is automatically cleared when expired

2. **Request Queue**
   - Implements exponential backoff for rate-limited requests
   - Queues requests to prevent overwhelming the API
   - Automatically retries failed requests with increasing delays

3. **Error Handling**
   - Gracefully handles rate limit errors (HTTP 429)
   - Provides detailed logging about rate limit status
   - Shows when rate limits will reset

### Best Practices for Development
1. Use the test script (`test-twitter.ts`) to validate API functionality
2. Monitor the logs for rate limit warnings
3. Implement proper error handling in your components
4. Consider applying for Elevated access if you need higher limits

### Environment Variables
Configure these in your `.env` file:
```bash
TWITTER_BEARER_TOKEN=your_bearer_token
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_DAILY_TWEET_LIMIT=50
TWITTER_RATE_LIMIT_WINDOW=900000  # 15 minutes in milliseconds
```

For production deployment, consider:
1. Applying for Elevated API access
2. Implementing a more sophisticated caching strategy
3. Using a distributed cache like Redis for multi-instance deployments

## Data Pipeline

The application features a comprehensive data collection and processing pipeline that integrates multiple data sources:

### Data Sources
1. **ESPN API Integration**
   - Game details and scores
   - Team statistics
   - Game odds
   - Historical game data

2. **X (Twitter) Integration**
   - Game-related tweets collection
   - NFL analyst opinions tracking
   - Automated sentiment analysis
   - Trusted NFL analysts tracking

3. **File Upload Support**
   - Excel (.xlsx) files
   - JSON files
   - Automated data validation
   - Data transformation

### Using the Data Pipeline

1. **Real-time Data Collection**
   ```typescript
   const dataCollector = container.resolve(DataCollectionController);
   const gameData = await dataCollector.collectGameData('gameId');
   ```

2. **File Upload Processing**
   ```typescript
   const uploadedData = await dataCollector.processUploadedFile(file);
   ```

3. **Historical Data Collection**
   ```typescript
   const historicalData = await dataCollector.collectHistoricalData('2024-01-01', '2024-01-31');
   ```

### Environment Setup
Required environment variables:
```env
TWITTER_BEARER_TOKEN=your_twitter_token
ESPN_API_KEY=your_espn_key
```

## Documentation

Comprehensive documentation for the NFL Sentiment Analyzer project is available in the `/docs` directory:

### Quick Links
- [MVP Deployment Guide](docs/wiki/mvp_deployment.md) - Essential steps for MVP deployment
- [Quick Start Guide](docs/wiki/quick_start.md) - Get up and running quickly
- [Technical Stack](docs/architecture/tech_stack.md) - Detailed overview of our technology choices
- [Project Requirements](docs/requirements/project_requirements.md) - Project scope and requirements
- [API Integration Guides](docs/integration/) - Detailed guides for ESPN and Twitter API integration

### Documentation Structure
```
docs/
├── architecture/     # System architecture and design decisions
├── implementation/   # Implementation details and guidelines
├── integration/      # Third-party API integration guides
├── requirements/     # Project requirements and specifications
└── wiki/            # Quick reference guides and tutorials
```

For more detailed documentation, see our [Documentation Index](docs/README.md).

## License

MIT License
