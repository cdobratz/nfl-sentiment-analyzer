import { TwitterApi } from 'twitter-api-v2';
import { Logger } from 'winston';
import { injectable } from 'tsyringe';

@injectable()
export class TwitterService {
  private client: TwitterApi;
  private readonly DAILY_TWEET_LIMIT = 50;
  private readonly RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes in milliseconds
  private requestCount = 0;
  private windowStart: number = Date.now();

  constructor(private logger: Logger) {
    if (!process.env.TWITTER_BEARER_TOKEN) {
      throw new Error('Twitter bearer token is not configured');
    }
    this.client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
  }

  async collectDailyTweets(analysts: string[]): Promise<Array<{ text: string; author: string; timestamp: Date }>> {
    try {
      this.resetRateLimitIfNeeded();
      
      if (this.requestCount >= this.DAILY_TWEET_LIMIT) {
        this.logger.warn('Daily tweet limit reached');
        return [];
      }

      const tweets: Array<{ text: string; author: string; timestamp: Date }> = [];

      for (const analyst of analysts) {
        if (this.requestCount >= this.DAILY_TWEET_LIMIT) break;

        try {
          // Get user ID from username
          const userTweets = await this.client.v2.userByUsername(analyst);
          if (!userTweets.data) {
            this.logger.error(`User not found: ${analyst}`);
            continue;
          }

          // Get recent tweets from the user
          const userTimeline = await this.client.v2.userTimeline(userTweets.data.id, {
            max_results: 10,
            'tweet.fields': ['created_at', 'text', 'public_metrics'],
            exclude: ['retweets', 'replies']
          });

          // Process tweets
          const timelineTweets = await userTimeline.fetchNext();
          for (const tweet of timelineTweets) {
            if (this.requestCount >= this.DAILY_TWEET_LIMIT) break;

            if (!tweet.created_at) {
              this.logger.warn(`Tweet from ${analyst} missing creation date, skipping`);
              continue;
            }

            tweets.push({
              text: tweet.text,
              author: analyst,
              timestamp: new Date(tweet.created_at)
            });

            this.requestCount++;
          }

          // Add delay between requests to respect rate limits
          await this.delay(1000);

        } catch (error) {
          this.logger.error(`Error fetching tweets for ${analyst}:`, error);
          continue;
        }
      }

      return tweets;

    } catch (error) {
      this.logger.error('Error in collectDailyTweets:', error);
      throw error;
    }
  }

  private resetRateLimitIfNeeded(): void {
    const now = Date.now();
    if (now - this.windowStart >= this.RATE_LIMIT_WINDOW) {
      this.requestCount = 0;
      this.windowStart = now;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
