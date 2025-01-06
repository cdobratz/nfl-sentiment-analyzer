import { injectable } from 'tsyringe';
import { Logger } from 'winston';
import { SentimentAnalyzer } from '../ml/models/sentiment';

export interface SentimentResult {
  text: string;
  sentiment: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
    confidence: number;
  };
}

@injectable()
export class SentimentService {
  private analyzer: SentimentAnalyzer;

  constructor(private logger: Logger) {
    this.analyzer = new SentimentAnalyzer();
  }

  async analyzeTweets(tweets: string[]): Promise<SentimentResult[]> {
    try {
      const results: SentimentResult[] = [];

      for (const tweet of tweets) {
        try {
          // Clean and preprocess the tweet text
          const cleanedText = this.preprocessText(tweet);

          // Get sentiment analysis from the ML model
          const analysis = await this.analyzer.analyze(cleanedText);

          // Map the sentiment score to a label
          const label = this.getSentimentLabel(analysis.score);

          results.push({
            text: tweet,
            sentiment: {
              score: analysis.score,
              label,
              confidence: analysis.confidence
            }
          });

        } catch (error) {
          this.logger.error(`Error analyzing tweet: ${tweet}`, error);
          continue;
        }
      }

      return results;

    } catch (error) {
      this.logger.error('Error in analyzeTweets:', error);
      throw error;
    }
  }

  private preprocessText(text: string): string {
    return text
      .toLowerCase()
      // Remove URLs
      .replace(/https?:\/\/\S+/g, '')
      // Remove mentions
      .replace(/@\w+/g, '')
      // Remove hashtags
      .replace(/#\w+/g, '')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getSentimentLabel(score: number): 'positive' | 'negative' | 'neutral' {
    if (score > 0.2) return 'positive';
    if (score < -0.2) return 'negative';
    return 'neutral';
  }

  // Method to analyze sentiment trends over time
  async analyzeTrends(tweets: Array<{ text: string; timestamp: Date }>): Promise<{
    dates: string[];
    sentiments: number[];
  }> {
    const dateMap = new Map<string, { sum: number; count: number }>();

    for (const tweet of tweets) {
      const date = tweet.timestamp.toISOString().split('T')[0];
      const analysis = await this.analyzer.analyze(this.preprocessText(tweet.text));

      const current = dateMap.get(date) || { sum: 0, count: 0 };
      current.sum += analysis.score;
      current.count += 1;
      dateMap.set(date, current);
    }

    const sortedDates = Array.from(dateMap.keys()).sort();
    const sentiments = sortedDates.map(date => {
      const data = dateMap.get(date);
      if (!data) {
        throw new Error(`Missing sentiment data for date: ${date}`);
      }
      return data.sum / data.count;
    });

    return {
      dates: sortedDates,
      sentiments
    };
  }
}
