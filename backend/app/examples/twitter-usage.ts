import { Logger } from 'winston';
import { TwitterService } from '../services/twitter.service';
import { Tweet } from '../types/twitter.types';

async function main() {
  const logger = {
    info: (...args: any[]) => console.log(...args),
    error: (...args: any[]) => console.error(...args),
    warn: (...args: any[]) => console.warn(...args)
  } as Logger;

  const twitterService = new TwitterService(logger);

  try {
    console.log('Fetching game-related tweets...');
    const gameId = '401547665'; // Example game ID
    const teams = {
      home: 'Chiefs',
      away: 'Raiders'
    };

    const tweets = await twitterService.getGameRelatedTweets(gameId, teams);
    console.log(`Found ${tweets.length} tweets`);

    tweets.forEach((tweet: Tweet) => {
      console.log('\n---');
      console.log(`Tweet ID: ${tweet.id}`);
      console.log(`Text: ${tweet.text}`);
      console.log(`Author: ${tweet.authorId}`);
      console.log(`Created: ${tweet.createdAt}`);
      console.log('Metrics:', tweet.metrics);
    });

    console.log('\nFetching analyst opinions...');
    const analystTweets = await twitterService.getAnalystOpinions(gameId);
    console.log(`Found ${analystTweets.length} analyst tweets`);

    analystTweets.forEach((tweet: Tweet) => {
      console.log('\n---');
      console.log(`Tweet ID: ${tweet.id}`);
      console.log(`Text: ${tweet.text}`);
      console.log(`Author: ${tweet.authorId}`);
      console.log(`Created: ${tweet.createdAt}`);
      console.log('Metrics:', tweet.metrics);
    });

  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('Unknown error occurred');
    }
  }
}

main();
