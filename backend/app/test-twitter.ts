import { TwitterService } from './services/twitter.service';
import { createLogger, transports } from 'winston';

const logger = createLogger({
  transports: [new transports.Console()]
});

const service = new TwitterService(logger, {
  bearerToken: process.env.TWITTER_BEARER_TOKEN
});

async function main() {
  try {
    const tweets = await service.getGameRelatedTweets('123', {
      home: 'Patriots',
      away: 'Jets'
    });

    console.log('Tweets:', tweets);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
