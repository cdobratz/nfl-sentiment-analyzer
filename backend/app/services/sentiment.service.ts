import { injectable } from 'tsyringe';
import { Logger } from 'winston';
import NodeCache from 'node-cache';
import { SentimentResult } from '../types/twitter.types';

const POSITIVE_WORDS = ['good', 'great', 'excellent', 'awesome', 'amazing'];
const NEGATIVE_WORDS = ['bad', 'terrible', 'awful', 'poor', 'horrible'];

@injectable()
export class SentimentService {
  private readonly cache: NodeCache;

  constructor(private readonly logger: Logger) {
    this.cache = new NodeCache({ stdTTL: 300 }); // Cache for 5 minutes
  }

  async analyzeTweets(tweets: string[]): Promise<SentimentResult[]> {
    return tweets.map(text => this.analyzeSentiment(text));
  }

  analyzeSentiment(text: string): SentimentResult {
    const cacheKey = `sentiment:${text}`;
    const cached = this.cache.get<SentimentResult>(cacheKey);
    if (cached) return cached;

    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    let confidence = 0;

    // Count positive and negative words
    words.forEach(word => {
      if (POSITIVE_WORDS.includes(word)) score += 1;
      if (NEGATIVE_WORDS.includes(word)) score -= 1;
    });

    // Normalize score to [-1, 1] range
    const maxPossibleScore = words.length;
    score = maxPossibleScore > 0 ? score / maxPossibleScore : 0;
    
    // Calculate confidence based on word matches
    const matchedWords = words.filter(word => 
      POSITIVE_WORDS.includes(word) || NEGATIVE_WORDS.includes(word)
    ).length;
    confidence = matchedWords / words.length;

    // Determine label
    let label: 'positive' | 'negative' | 'neutral';
    if (score > 0.3) label = 'positive';
    else if (score < -0.3) label = 'negative';
    else label = 'neutral';

    const result: SentimentResult = {
      text,
      sentiment: {
        score,
        confidence,
        label
      }
    };

    this.cache.set(cacheKey, result);
    return result;
  }

  clearCache(): void {
    this.cache.flushAll();
    this.logger.info('Sentiment analysis cache cleared');
  }
}
