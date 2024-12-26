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

## License

MIT License
