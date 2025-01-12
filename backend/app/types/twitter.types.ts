export interface Tweet {
  text: string;
  author: string;
  timestamp: Date;
  metrics?: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
  };
}

export interface SentimentResult {
  text: string;
  sentiment: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
    confidence: number;
  };
}

export interface TopTweet {
  text: string;
  sentiment: number;
  author: string;
}

export interface AnalystData {
  handle: string;
  sentiment: number;
  tweetCount: number;
  influence: number;
}
