import { useState, useEffect } from 'react';
import axios from 'axios';

interface SentimentData {
  gameInfo: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    date: string;
  };
  sentimentAnalysis: {
    overall: number;
    homeTeam: number;
    awayTeam: number;
    trending: {
      timestamps: string[];
      values: number[];
    };
  };
  tweets: Array<{
    id: string;
    text: string;
    author: string;
    timestamp: string;
    sentiment: {
      score: number;
      label: 'positive' | 'negative' | 'neutral';
      confidence: number;
    };
  }>;
}

interface ErrorState {
  message: string;
  code?: string;
}

export const useSentimentData = (gameId: string) => {
  const [data, setData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ErrorState | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(30000); // 30 seconds default

  const fetchSentimentData = async () => {
    try {
      const response = await axios.get<SentimentData>(
        `${process.env.REACT_APP_API_URL}/games/${gameId}/sentiment`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      setData(response.data);
      setError(null);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError({
          message: err.response?.data?.message || 'Failed to fetch sentiment data',
          code: err.response?.status?.toString(),
        });
      } else {
        setError({
          message: 'An unexpected error occurred',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    fetchSentimentData();
  }, [gameId]);

  // Set up polling for live updates
  useEffect(() => {
    if (!refreshInterval) return;

    const intervalId = setInterval(() => {
      fetchSentimentData();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [gameId, refreshInterval]);

  // Function to manually refresh data
  const refresh = () => {
    setLoading(true);
    fetchSentimentData();
  };

  // Function to update refresh interval
  const updateRefreshInterval = (interval: number) => {
    setRefreshInterval(interval);
  };

  // Function to stop auto-refresh
  const stopAutoRefresh = () => {
    setRefreshInterval(0);
  };

  return {
    data,
    loading,
    error,
    refresh,
    updateRefreshInterval,
    stopAutoRefresh,
    isAutoRefreshing: refreshInterval > 0,
  };
};

// Helper hook for aggregated sentiment stats
export const useAggregatedSentiment = (gameId: string) => {
  const { data, loading, error } = useSentimentData(gameId);

  const aggregatedStats = {
    overallSentiment: data?.sentimentAnalysis.overall || 0,
    homeTeamSentiment: data?.sentimentAnalysis.homeTeam || 0,
    awayTeamSentiment: data?.sentimentAnalysis.awayTeam || 0,
    tweetCount: data?.tweets.length || 0,
    positiveTweets: data?.tweets.filter(t => t.sentiment.label === 'positive').length || 0,
    negativeTweets: data?.tweets.filter(t => t.sentiment.label === 'negative').length || 0,
  };

  return {
    stats: aggregatedStats,
    loading,
    error,
  };
};

// Helper hook for sentiment trends
export const useSentimentTrends = (gameId: string) => {
  const { data, loading, error } = useSentimentData(gameId);

  const trends = data?.sentimentAnalysis.trending || { timestamps: [], values: [] };

  return {
    trends,
    loading,
    error,
  };
};
