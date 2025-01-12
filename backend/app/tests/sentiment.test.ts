import { SentimentService } from '../services/sentiment.service';
import { Logger, createLogger, transports } from 'winston';
import { SentimentResult } from '../types/twitter.types';

describe('SentimentService', () => {
  let service: SentimentService;
  let logger: Logger;

  beforeEach(() => {
    logger = createLogger({
      level: 'info',
      transports: [new transports.Console()]
    });
    service = new SentimentService(logger);
  });

  it('should analyze positive sentiment', async () => {
    const text = 'Amazing game by the Patriots! Best performance of the season!';
    const result = service.analyzeSentiment(text);
    expect(result.text).toBe(text);
    expect(result.sentiment.score).toBeGreaterThan(0);
    expect(result.sentiment.label).toBe('positive');
    expect(result.sentiment.confidence).toBeGreaterThan(0);
  });

  it('should analyze negative sentiment', async () => {
    const text = 'Terrible performance by the Jets. Worst game ever.';
    const result = service.analyzeSentiment(text);
    expect(result.text).toBe(text);
    expect(result.sentiment.score).toBeLessThan(0);
    expect(result.sentiment.label).toBe('negative');
    expect(result.sentiment.confidence).toBeGreaterThan(0);
  });

  it('should handle neutral text', async () => {
    const text = 'The game starts at 4 PM EST';
    const result = service.analyzeSentiment(text);
    expect(result.text).toBe(text);
    expect(result.sentiment.score).toBe(0);
    expect(result.sentiment.label).toBe('neutral');
    expect(result.sentiment.confidence).toBe(0);
  });

  it('should analyze multiple tweets', async () => {
    const tweets = [
      'Great touchdown by Brady!',
      'Defense looked terrible today',
      'Kickoff at 1 PM'
    ];

    const results = await service.analyzeTweets(tweets);
    expect(results).toHaveLength(tweets.length);
    expect(new Set(results.map(r => r.sentiment.label)).size).toBeGreaterThan(1);
  });

  it('should handle empty input', async () => {
    const results = await service.analyzeTweets([]);
    expect(results).toHaveLength(0);
  });

  it('should use cache for repeated analyses', async () => {
    const text = 'This is a test tweet for caching';
    
    // First call
    const result1 = service.analyzeSentiment(text);
    
    // Second call should use cache
    const start = Date.now();
    const result2 = service.analyzeSentiment(text);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(50); // Cache hit should be very fast
    expect(result2).toEqual(result1);
  });

  it('should clear cache', async () => {
    const text = 'Test tweet for cache clearing';
    
    // First call
    const result1 = service.analyzeSentiment(text);
    
    // Clear cache
    service.clearCache();
    
    // Second call should recompute
    const result2 = service.analyzeSentiment(text);
    
    expect(result2).toEqual(result1); // Results should be deterministic
  });
});
