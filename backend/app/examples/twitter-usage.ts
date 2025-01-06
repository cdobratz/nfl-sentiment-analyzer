import { TwitterService } from '../services/twitter.service';
import { Logger } from 'winston';

// Example usage of TwitterService
async function example() {
  // Create a logger (you should use your actual logger configuration)
  const logger = {
    info: console.log,
    error: console.error,
    warn: console.warn
  } as Logger;

  // Initialize the service
  const twitterService = new TwitterService(logger);

  try {
    // Get tweets from NFL analysts
    const analysts = [
      'AdamSchefter',    // ESPN
      'RapSheet',        // NFL Network
      'TomPelissero',    // NFL Network
      'JosinaAnderson'   // NFL Insider
    ];

    const tweets = await twitterService.collectDailyTweets(analysts);
    
    // Process the tweets
    tweets.forEach(tweet => {
      console.log(`
        Author: ${tweet.author}
        Tweet: ${tweet.text}
        Posted at: ${tweet.timestamp}
      `);
    });
  } catch (error) {
    console.error('Error fetching tweets:', error);
  }
}

// Run the example
example();
