export interface TweetMetrics {
  retweets: number;
  replies: number;
  likes: number;
  quotes: number;
}

export interface AnalystInfo {
  handle: string;
  name: string;
  organization: string;
  verified: boolean;
}

export interface Tweet {
  id: string;
  text: string;
  authorId: string;
  createdAt: Date;
  metrics: TweetMetrics;
  isAnalyst: boolean;
  analystInfo?: AnalystInfo;
}

export interface TopTweet extends Tweet {
  sentiment: number;
  confidence: number;
  keywords?: string[];
  entities?: string[];
  isPositive: boolean;
  isNegative: boolean;
  isNeutral: boolean;
  sentimentStrength: 'extreme' | 'strong' | 'moderate' | 'mild';
}

export interface AnalystData {
  analyst: string;
  organization: string;
  tweets: TopTweet[];
  averageSentiment?: number;
  topKeywords?: string[];
  topEntities?: string[];
  sentimentBreakdown?: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

export interface SentimentResult {
  text: string;
  sentiment: {
    score: number;
    confidence: number;
    label: 'positive' | 'negative' | 'neutral';
  };
}

export interface TwitterSearchResponse {
  tweets: Tweet[];
  includes?: {
    users?: Array<{
      id: string;
      username: string;
      verified: boolean;
    }>;
  };
}
