export interface Tweet {
  id: string;
  text: string;
  authorId: string;
  createdAt: Date;
  metrics: {
    retweets: number;
    replies: number;
    likes: number;
    quotes: number;
  };
  isAnalyst: boolean;
}

export interface TopTweet extends Tweet {
  sentiment: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
    confidence: number;
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
