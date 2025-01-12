import { injectable } from 'tsyringe';
import { Logger } from 'winston';
import { TwitterApi } from 'twitter-api-v2';
import NodeCache from 'node-cache';
import { Tweet } from '../types/twitter.types';

@injectable()
export class TwitterService {
  private client: TwitterApi;
  private cache: NodeCache;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  
  // Cache configuration
  private readonly CACHE_TTL = 60 * 60; // 1 hour cache
  private readonly CACHE_CHECK_PERIOD = 120; // Check for expired entries every 2 minutes
  private readonly CACHE_ERROR_TTL = 30 * 60; // Cache errors for 30 minutes
  
  // Rate limiting configuration
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY = 1000; // 1 second
  private readonly DAILY_TWEET_LIMIT = 50;
  private requestCount = 0;

  private readonly NFL_HASHTAGS = [
    'NFL', 'NFLTwitter', 'NFLUpdates', 'GameDay', 'NFLGameDay',
    'FantasyFootball', 'NFLStats', 'NFLHighlights'
  ];

  private readonly NFL_ACCOUNTS = [
    'AdamSchefter', 'RapSheet', 'TomPelissero', 'NFLNetwork',
    'ProFootballTalk', 'NFL', 'ESPNNFL', 'NFLonCBS', 'NFLonFOX'
  ];

  constructor(private logger: Logger) {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    if (!bearerToken) {
      throw new Error('Twitter bearer token is not configured');
    }

    this.client = new TwitterApi(bearerToken);
    
    // Initialize cache with checkperiod and error handling
    this.cache = new NodeCache({ 
      stdTTL: this.CACHE_TTL,
      checkperiod: this.CACHE_CHECK_PERIOD,
      errorOnMissing: false,
      useClones: false
    });

    // Log cache events for monitoring
    this.cache.on('set', (key) => {
      this.logger.debug(`Cache set: ${key}`);
    });

    this.cache.on('expired', (key) => {
      this.logger.debug(`Cache expired: ${key}`);
    });

    this.cache.on('flush', () => {
      this.logger.debug('Cache flushed');
    });
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    retryCount = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error.code === 429 && retryCount < this.MAX_RETRIES) {
        const delay = this.INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        const resetTime = error.rateLimit?.reset 
          ? new Date(error.rateLimit.reset * 1000).toLocaleString()
          : 'unknown';
        
        this.logger.warn(
          `Rate limited. Retrying in ${delay}ms... Rate limit resets at ${resetTime}. ` +
          `Remaining daily limit: ${error.rateLimit?.day?.remaining || 'unknown'}`
        );
        
        await this.sleep(delay);
        return this.retryWithBackoff(operation, retryCount + 1);
      }
      throw error;
    }
  }

  private async addToQueue<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await this.retryWithBackoff(operation);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
          // Add a small delay between requests to avoid rate limits
          await this.sleep(1100); // Twitter's rate limit is 1 request/second
        } catch (error) {
          this.logger.error('Error processing request:', error);
        }
      }
    }

    this.isProcessingQueue = false;
  }

  private getCacheKey(username: string): string {
    return `twitter_user_${username.toLowerCase()}`;
  }

  private getErrorCacheKey(username: string): string {
    return `twitter_error_${username.toLowerCase()}`;
  }

  async collectDailyTweets(analysts: string[]): Promise<Tweet[]> {
    const allTweets: Tweet[] = [];
    this.requestCount = 0;

    for (const analyst of analysts) {
      try {
        const cacheKey = this.getCacheKey(analyst);
        const errorCacheKey = this.getErrorCacheKey(analyst);
        
        // Check if we have a cached error for this analyst
        const cachedError = this.cache.get(errorCacheKey);
        if (cachedError) {
          this.logger.warn(`Skipping ${analyst} due to recent error: ${cachedError}`);
          continue;
        }

        // Check for cached tweets
        const cachedTweets = this.cache.get<Tweet[]>(cacheKey);
        if (cachedTweets) {
          this.logger.info(`Using cached tweets for ${analyst} (${cachedTweets.length} tweets)`);
          allTweets.push(...cachedTweets);
          continue;
        }

        const tweets = await this.addToQueue(async () => {
          const userResponse = await this.client.v2.userByUsername(analyst);
          if (!userResponse.data) {
            throw new Error(`User not found: ${analyst}`);
          }

          const userTimeline = await this.client.v2.userTimeline(userResponse.data.id, {
            max_results: 10,
            'tweet.fields': ['created_at', 'text', 'public_metrics'],
            exclude: ['retweets', 'replies']
          });

          const timelineTweets = await userTimeline.fetchNext();
          const tweets: Tweet[] = [];
          
          for (const tweet of timelineTweets) {
            tweets.push({
              text: tweet.text,
              author: analyst,
              timestamp: new Date(tweet.created_at || Date.now()),
              metrics: tweet.public_metrics || {
                like_count: 0,
                retweet_count: 0,
                reply_count: 0
              }
            });
          }
          
          return tweets;
        });

        if (tweets.length > 0) {
          this.logger.info(`Caching ${tweets.length} tweets for ${analyst}`);
          this.cache.set(cacheKey, tweets);
          allTweets.push(...tweets);
        } else {
          this.logger.warn(`No tweets found for ${analyst}`);
        }

        this.requestCount += tweets.length;
        if (this.requestCount >= this.DAILY_TWEET_LIMIT) {
          this.logger.warn('Daily tweet limit reached');
          break;
        }
      } catch (error) {
        this.logger.error(`Error fetching tweets for ${analyst}:`, error);
        
        // Cache the error to prevent repeated failed requests
        const errorCacheKey = this.getErrorCacheKey(analyst);
        this.cache.set(errorCacheKey, error.message, this.CACHE_ERROR_TTL);
        
        // Continue with next analyst
        continue;
      }
    }

    return allTweets;
  }

  async getGameRelatedTweets(gameId: string, teams: { home: string, away: string }): Promise<Tweet[]> {
    const cacheKey = `game_tweets_${gameId}`;
    const cachedTweets = this.cache.get<Tweet[]>(cacheKey);
    
    if (cachedTweets) {
      return cachedTweets;
    }

    try {
      const searchQuery = `(${teams.home} OR ${teams.away}) (${this.NFL_HASHTAGS.join(' OR ')}) -is:retweet lang:en`;
      const tweets = await this.client.v2.search({
        query: searchQuery,
        'tweet.fields': ['created_at', 'public_metrics', 'entities'],
        'user.fields': ['username', 'verified'],
        max_results: 100
      });

      const processedTweets = tweets.data.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        created_at: tweet.created_at,
        metrics: tweet.public_metrics,
        author: tweet.author_id
      }));

      this.cache.set(cacheKey, processedTweets);
      return processedTweets;
    } catch (error) {
      this.logger.error(`Error fetching game tweets for ${gameId}:`, error);
      throw error;
    }
  }

  async getAnalystOpinions(gameId: string): Promise<Tweet[]> {
    const cacheKey = `analyst_tweets_${gameId}`;
    const cachedTweets = this.cache.get<Tweet[]>(cacheKey);
    
    if (cachedTweets) {
      return cachedTweets;
    }

    try {
      const searchQuery = `from:${this.NFL_ACCOUNTS.join(' OR from:')} -is:retweet`;
      const tweets = await this.client.v2.search({
        query: searchQuery,
        'tweet.fields': ['created_at', 'public_metrics', 'entities'],
        'user.fields': ['username', 'verified'],
        max_results: 50
      });

      const processedTweets = tweets.data.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        created_at: tweet.created_at,
        metrics: tweet.public_metrics,
        author: tweet.author_id,
        isAnalyst: true
      }));

      this.cache.set(cacheKey, processedTweets);
      return processedTweets;
    } catch (error) {
      this.logger.error('Error fetching analyst opinions:', error);
      throw error;
    }
  }

  // Utility method to clear cache if needed
  clearCache(): void {
    this.cache.flushAll();
    this.logger.info('Cache cleared');
  }
}
