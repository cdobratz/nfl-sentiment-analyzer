import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSentimentData } from '@/hooks/useSentimentData';

interface SentimentMetric {
  label: string;
  value: number;
  bgColor: string;
  icon?: React.ReactNode;
}

const WeeklySentimentDashboard: React.FC = () => {
  const {
    data: sentimentData,
    loading,
    error,
    refresh,
    lastUpdated
  } = useSentimentData('1'); // TODO: Make game ID dynamic

  const formatSentimentScore = (score: number): string => {
    return (score * 100).toFixed(1) + '%';
  };

  const getSentimentColor = (score: number): string => {
    if (score >= 0.6) return 'text-green-600';
    if (score >= 0.4) return 'text-blue-600';
    return 'text-red-600';
  };

  const metrics: SentimentMetric[] = sentimentData ? [
    {
      label: 'Overall Sentiment',
      value: sentimentData.sentiment_score,
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Tweet Volume',
      value: sentimentData.tweet_count,
      bgColor: 'bg-green-50',
    },
    {
      label: 'Confidence',
      value: sentimentData.confidence,
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Positive Tweets',
      value: sentimentData.sentiment_distribution?.positive || 0,
      bgColor: 'bg-emerald-50',
    },
    {
      label: 'Negative Tweets',
      value: sentimentData.sentiment_distribution?.negative || 0,
      bgColor: 'bg-red-50',
    },
    {
      label: 'Neutral Tweets',
      value: sentimentData.sentiment_distribution?.neutral || 0,
      bgColor: 'bg-gray-50',
    }
  ] : [];

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-4xl mx-auto my-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load sentiment data. {error.message}
          <Button
            variant="outline"
            size="sm"
            className="ml-4"
            onClick={refresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Weekly NFL Game Sentiment Analysis</CardTitle>
        <div className="flex items-center space-x-4">
          {lastUpdated && (
            <span className="text-sm text-gray-500">
              Updated {formatDistanceToNow(new Date(lastUpdated))} ago
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* Sentiment Trend Chart */}
          <div className="h-[300px] w-full">
            {loading ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={sentimentData?.weekly_trend || []}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis domain={[-1, 1]} tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                  <Tooltip
                    formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Sentiment']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sentimentScore"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 8 }}
                    name="Sentiment Score"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {loading ? (
              Array(6).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))
            ) : (
              metrics.map((metric, index) => (
                <div
                  key={index}
                  className={`${metric.bgColor} p-4 rounded-lg transition-all hover:shadow-md`}
                >
                  <h3 className="font-semibold text-gray-700">{metric.label}</h3>
                  <p className={`text-2xl font-bold ${getSentimentColor(metric.value)}`}>
                    {metric.label.includes('Sentiment')
                      ? formatSentimentScore(metric.value)
                      : metric.value.toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Top Analysts Section */}
          {sentimentData?.top_analysts && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Top Analysts</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sentimentData.top_analysts.map((analyst, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{analyst.name}</p>
                        <p className="text-sm text-gray-500">{analyst.handle}</p>
                      </div>
                      <div className={`text-lg font-bold ${getSentimentColor(analyst.sentiment)}`}>
                        {formatSentimentScore(analyst.sentiment)}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklySentimentDashboard;
