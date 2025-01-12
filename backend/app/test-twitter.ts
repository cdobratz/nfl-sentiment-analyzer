import 'reflect-metadata';
import { config } from 'dotenv';
import { TwitterService } from './services/twitter.service';
import winston from 'winston';

// Load environment variables
config();

// Create a basic logger
const logger = winston.createLogger({
  level: 'debug', // Set to debug to see cache events
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  ),
  transports: [new winston.transports.Console()]
});

async function testTwitterConnection() {
  const twitterService = new TwitterService(logger);

  try {
    // Test with a single analyst
    logger.info('Fetching tweets from Adam Schefter...');
    const tweets = await twitterService.collectDailyTweets(['AdamSchefter']);
    
    logger.info(`Successfully fetched ${tweets.length} tweets`);
    
    if (tweets.length > 0) {
      logger.info('Sample tweet:', {
        text: tweets[0].text,
        author: tweets[0].author,
        timestamp: tweets[0].timestamp,
        metrics: tweets[0].metrics
      });

      // Show engagement metrics
      const totalLikes = tweets.reduce((sum, tweet) => sum + (tweet.metrics?.like_count || 0), 0);
      const totalRetweets = tweets.reduce((sum, tweet) => sum + (tweet.metrics?.retweet_count || 0), 0);
      
      logger.info('Engagement Summary:', {
        totalTweets: tweets.length,
        totalLikes,
        totalRetweets,
        avgLikesPerTweet: (totalLikes / tweets.length).toFixed(2),
        avgRetweetsPerTweet: (totalRetweets / tweets.length).toFixed(2)
      });
    } else {
      logger.warn('No tweets were fetched. This could be due to rate limiting or no recent tweets.');
      logger.info('The data will be cached for 1 hour once successfully fetched.');
    }
  } catch (error) {
    if (error.code === 429) {
      logger.error('Rate limit exceeded. Please wait before trying again.');
      const resetTime = new Date(error.rateLimit.reset * 1000);
      logger.info(`Rate limit will reset at: ${resetTime.toLocaleString()}`);
      logger.info('Subsequent requests will use cached data if available.');
    } else {
      logger.error('Error fetching tweets:', error);
    }
  }
}

testTwitterConnection();
