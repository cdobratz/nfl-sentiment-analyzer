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

## API Rate Limits and Caching Strategy

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

## License

MIT License
