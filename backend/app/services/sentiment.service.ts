import { injectable } from 'tsyringe';
import { Logger } from 'winston';
import axios from 'axios';
import NodeCache from 'node-cache';
import { SentimentResult } from '../types/twitter.types';

interface ModelInfo {
  description: string;
}

@injectable()
export class SentimentService {
  private readonly API_URL = process.env.ML_API_URL || 'http://localhost:8000';
  private readonly CACHE_TTL = 60 * 60; // 1 hour
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY = 1000;
  private cache: NodeCache;
  private currentModel: string = 'bertweet-base';

  constructor(private logger: Logger) {
    this.cache = new NodeCache({ stdTTL: this.CACHE_TTL });
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    retryCount = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retryCount < this.MAX_RETRIES) {
        const delay = this.INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        this.logger.warn(`Request failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryWithBackoff(operation, retryCount + 1);
      }
      throw error;
    }
  }

  async listAvailableModels(): Promise<Record<string, ModelInfo>> {
    try {
      const response = await axios.get(`${this.API_URL}/models`);
      return response.data;
    } catch (error) {
      this.logger.error('Error fetching available models:', error);
      throw new Error('Failed to fetch available models');
    }
  }

  async setModel(modelName: string): Promise<void> {
    const models = await this.listAvailableModels();
    if (!models[modelName]) {
      throw new Error(`Model ${modelName} not found`);
    }
    this.currentModel = modelName;
    this.logger.info(`Switched to model: ${modelName}`);
  }

  private getCacheKey(text: string): string {
    return `sentiment_${this.currentModel}_${text}`;
  }

  async analyzeTweets(tweets: string[]): Promise<SentimentResult[]> {
    const results: SentimentResult[] = [];
    const uncachedTweets: string[] = [];
    const tweetMap = new Map<string, number>();

    // Check cache first
    tweets.forEach((tweet, index) => {
      const cacheKey = this.getCacheKey(tweet);
      const cachedResult = this.cache.get<SentimentResult>(cacheKey);
      
      if (cachedResult) {
        results[index] = cachedResult;
      } else {
        uncachedTweets.push(tweet);
        tweetMap.set(tweet, index);
      }
    });

    if (uncachedTweets.length > 0) {
      try {
        const response = await this.retryWithBackoff(() => 
          axios.post(`${this.API_URL}/analyze`, {
            texts: uncachedTweets,
            model_name: this.currentModel
          })
        );

        response.data.forEach((analysis: any) => {
          const index = tweetMap.get(analysis.text);
          if (index === undefined) return;

          const result: SentimentResult = {
            text: analysis.text,
            sentiment: {
              score: analysis.sentiment.score,
              label: analysis.label as 'positive' | 'negative' | 'neutral',
              confidence: analysis.confidence
            }
          };

          results[index] = result;
          this.cache.set(this.getCacheKey(analysis.text), result);
        });
      } catch (error) {
        this.logger.error('Error analyzing tweets:', error);
        // Fill in neutral results for failed analyses
        uncachedTweets.forEach(tweet => {
          const index = tweetMap.get(tweet);
          if (index === undefined) return;

          results[index] = {
            text: tweet,
            sentiment: {
              score: 0,
              label: 'neutral',
              confidence: 0
            }
          };
        });
      }
    }

    return results;
  }

  clearCache(): void {
    this.cache.flushAll();
    this.logger.info('Sentiment analysis cache cleared');
  }
}
