import { injectable } from 'tsyringe';
import { Logger } from 'winston';
import { TwitterApi, TweetV2, TweetSearchRecentV2Paginator } from 'twitter-api-v2';
import NodeCache from 'node-cache';
import { Tweet, TopTweet } from '../types/twitter.types';

interface TwitterServiceConfig {
  cacheTTL?: number;
  maxTweetsPerRequest?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
}

interface AnalystInfo {
  handle: string;
  name: string;
  organization: string;
  verified: boolean;
}

interface CustomMetrics {
  retweets: number;
  replies: number;
  likes: number;
  quotes: number;
}

interface TwitterSearchResponse {
  data: Array<{
    id: string;
    text: string;
    author_id: string;
    created_at: string;
    public_metrics?: {
      retweet_count: number;
      reply_count: number;
      like_count: number;
      quote_count: number;
    };
  }>;
  includes?: {
    users?: Array<{
      id: string;
      username: string;
      verified: boolean;
    }>;
  };
}

interface TwitterTimelineResponse {
  data: {
    id: string;
    text: string;
    author_id?: string;
    created_at?: string;
    edit_history_tweet_ids: string[];
    public_metrics?: {
      retweet_count: number;
      reply_count: number;
      like_count: number;
      quote_count: number;
    };
  }[];
  meta?: {
    oldest_id: string;
    newest_id: string;
    result_count: number;
    next_token?: string;
  };
}

const NFL_ANALYSTS: Record<string, AnalystInfo> = {
  'AdamSchefter': {
    handle: 'AdamSchefter',
    name: 'Adam Schefter',
    organization: 'ESPN',
    verified: true
  },
  'RapSheet': {
    handle: 'RapSheet',
    name: 'Ian Rapoport',
    organization: 'NFL Network',
    verified: true
  },
  'mortreport': {
    handle: 'mortreport',
    name: 'Chris Mortensen',
    organization: 'ESPN',
    verified: true
  },
  'TomPelissero': {
    handle: 'TomPelissero',
    name: 'Tom Pelissero',
    organization: 'NFL Network',
    verified: true
  }
};

@injectable()
export class TwitterService {
  private readonly twitterClient: TwitterApi;
  private readonly cache: NodeCache;
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY = 1000;

  constructor(
    private readonly logger: Logger,
    config?: {
      bearerToken?: string;
      apiKey?: string;
      apiSecret?: string;
    }
  ) {
    const bearerToken = config?.bearerToken || process.env.TWITTER_BEARER_TOKEN;
    const apiKey = config?.apiKey || process.env.TWITTER_API_KEY;
    const apiSecret = config?.apiSecret || process.env.TWITTER_API_SECRET;

    if (!bearerToken && (!apiKey || !apiSecret)) {
      throw new Error('Twitter credentials not provided');
    }

    this.twitterClient = bearerToken
      ? new TwitterApi(bearerToken)
      : new TwitterApi({ appKey: apiKey!, appSecret: apiSecret! });

    this.cache = new NodeCache({ stdTTL: 300 }); // Cache for 5 minutes
  }

  private handleError(error: unknown, context: string): never {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error';

    this.logger.error(`Twitter API Error: ${context}`, {
      error: errorMessage
    });
    throw new Error(`Twitter API Error: ${errorMessage}`);
  }

  private mapTwitterMetricsToCustomFormat(metrics: TweetV2['public_metrics'] | undefined | null): CustomMetrics {
    if (!metrics) {
      return {
        retweets: 0,
        replies: 0,
        likes: 0,
        quotes: 0
      };
    }

    return {
      retweets: metrics.retweet_count || 0,
      replies: metrics.reply_count || 0,
      likes: metrics.like_count || 0,
      quotes: metrics.quote_count || 0
    };
  }

  private async searchTweets(query: string): Promise<TweetV2[]> {
    try {
      const timelineResult = await this.twitterClient.v2.search(query, {
        'tweet.fields': [
          'author_id',
          'created_at',
          'public_metrics',
          'edit_history_tweet_ids',
          'entities',
          'lang',
          'possibly_sensitive'
        ],
        'user.fields': ['username', 'verified', 'profile_image_url'],
        'expansions': ['author_id', 'referenced_tweets.id'],
        max_results: 100
      });
  
      if (!timelineResult.data) {
        return [];
      }
  
      // Ensure we're working with an array of tweets
      const tweets = Array.isArray(timelineResult.data) ? timelineResult.data : [timelineResult.data];
      
      // Map the tweets to ensure they conform to TweetV2 interface
      return tweets.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        edit_history_tweet_ids: tweet.edit_history_tweet_ids ?? [tweet.id],
        author_id: tweet.author_id,
        created_at: tweet.created_at,
        public_metrics: tweet.public_metrics ?? {
          retweet_count: 0,
          reply_count: 0,
          like_count: 0,
          quote_count: 0,
          impression_count: 0
        },
        entities: tweet.entities ?? {
          annotations: [],
          urls: [],
          hashtags: [],
          cashtags: [],
          mentions: []
        },
        lang: tweet.lang ?? 'en',
        possibly_sensitive: tweet.possibly_sensitive ?? false
      }));
    } catch (error) {
      this.logger.error('Error searching tweets:', error);
      return [];
    }
  }


  async getGameRelatedTweets(gameId: string, teams: { home: string; away: string }): Promise<Tweet[]> {
    const cacheKey = `game_tweets:${gameId}`;
    const cached = this.cache.get<Tweet[]>(cacheKey);
    if (cached) return cached;

    try {
      const query = `(${teams.home} OR ${teams.away}) lang:en -is:retweet`;
      const tweets = await this.searchTweets(query);
      
      if (!tweets.length) {
        return [];
      }

      const transformedTweets = tweets.map(tweet => 
        this.convertTweetToInternalFormat(tweet)
      );

      this.cache.set(cacheKey, transformedTweets);
      return transformedTweets;
    } catch (error) {
      return this.handleError(error, `Failed to fetch game tweets for game ${gameId}`);
    }
  }

  async getAnalystOpinions(gameId: string): Promise<Tweet[]> {
    const cacheKey = `analyst_tweets:${gameId}`;
    const cached = this.cache.get<Tweet[]>(cacheKey);
    if (cached) return cached;

    try {
      const query = `game ${gameId} (from:AdamSchefter OR from:RapSheet)`;
      const tweets = await this.searchTweets(query);
      
      if (!tweets.length) {
        return [];
      }

      const transformedTweets = tweets.map(tweet => ({
        ...this.convertTweetToInternalFormat(tweet),
        isAnalyst: true
      }));

      this.cache.set(cacheKey, transformedTweets);
      return transformedTweets;
    } catch (error) {
      return this.handleError(error, `Failed to fetch analyst tweets for game ${gameId}`);
    }
  }

  private convertTweetToInternalFormat(tweet: TweetV2): Tweet {
    return {
      id: tweet.id,
      text: tweet.text,
      authorId: tweet.author_id || '',
      createdAt: tweet.created_at ? new Date(tweet.created_at) : new Date(),
      metrics: this.mapTwitterMetricsToCustomFormat(tweet.public_metrics),
      isAnalyst: false
    };
  }

  async refreshGameTweets(gameId: string, teams: { home: string; away: string }): Promise<void> {
    const cacheKey = `game_tweets:${gameId}`;
    this.cache.del(cacheKey);
    await this.getGameRelatedTweets(gameId, teams);
  }

  async refreshAnalystTweets(gameId: string): Promise<void> {
    const cacheKey = `analyst_tweets:${gameId}`;
    this.cache.del(cacheKey);
    await this.getAnalystOpinions(gameId);
  }

  clearCache(): void {
    this.cache.flushAll();
    this.logger.info('Twitter cache cleared');
  }
}
