import 'reflect-metadata';
import { config } from 'dotenv';
import { SentimentService } from '../services/sentiment.service';
import { createLogger, format, transports } from 'winston';

// Load environment variables
config();

// Create a test logger
const logger = createLogger({
  level: 'debug',
  format: format.combine(
    format.colorize(),
    format.simple()
  ),
  transports: [new transports.Console()]
});

describe('Sentiment Analysis Integration Tests', () => {
  let sentimentService: SentimentService;

  beforeAll(() => {
    sentimentService = new SentimentService(logger);
  });

  it('should list available models', async () => {
    const models = await sentimentService.listAvailableModels();
    expect(models).toBeDefined();
    expect(models['bertweet-base']).toBeDefined();
    expect(models['bertweet-base'].description).toBeDefined();
  });

  it('should analyze positive sentiment', async () => {
    const tweets = ['Amazing game by the Patriots! Best performance of the season!'];
    const results = await sentimentService.analyzeTweets(tweets);

    expect(results).toHaveLength(1);
    expect(results[0].sentiment.label).toBe('positive');
    expect(results[0].sentiment.score).toBeGreaterThan(0);
    expect(results[0].sentiment.confidence).toBeGreaterThan(0);
  });

  it('should analyze negative sentiment', async () => {
    const tweets = ['Terrible performance by the Jets. Worst game ever.'];
    const results = await sentimentService.analyzeTweets(tweets);

    expect(results).toHaveLength(1);
    expect(results[0].sentiment.label).toBe('negative');
    expect(results[0].sentiment.score).toBeLessThan(0);
    expect(results[0].sentiment.confidence).toBeGreaterThan(0);
  });

  it('should handle neutral text', async () => {
    const tweets = ['The game starts at 4 PM EST'];
    const results = await sentimentService.analyzeTweets(tweets);

    expect(results).toHaveLength(1);
    expect(results[0].sentiment.label).toBe('neutral');
    expect(Math.abs(results[0].sentiment.score)).toBeLessThan(0.3);
  });

  it('should analyze multiple tweets', async () => {
    const tweets = [
      'Great win by the Patriots!',
      'Disappointing loss for the Jets',
      'Game scheduled for Sunday',
      'Amazing touchdown pass!',
      'Defense looked terrible today'
    ];

    const results = await sentimentService.analyzeTweets(tweets);

    expect(results).toHaveLength(tweets.length);
    expect(new Set(results.map(r => r.sentiment.label)).size).toBeGreaterThan(1);
  });

  it('should handle empty input', async () => {
    const results = await sentimentService.analyzeTweets([]);
    expect(results).toHaveLength(0);
  });

  it('should use caching', async () => {
    const tweet = 'This is a test tweet for caching';
    
    // First call should hit the API
    const result1 = await sentimentService.analyzeTweets([tweet]);
    
    // Second call should use cache
    const start = Date.now();
    const result2 = await sentimentService.analyzeTweets([tweet]);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(50); // Cache hit should be very fast
    expect(result2[0].sentiment).toEqual(result1[0].sentiment);
  });

  it('should handle model switching', async () => {
    // This test assumes you have only one model now
    // but is ready for when you add more models
    await expect(
      sentimentService.setModel('nonexistent-model')
    ).rejects.toThrow();

    // Should not throw for existing model
    await expect(
      sentimentService.setModel('bertweet-base')
    ).resolves.not.toThrow();
  });

  it('should handle API errors gracefully', async () => {
    // Temporarily set invalid API URL
    process.env.ML_API_URL = 'http://localhost:9999';
    const badService = new SentimentService(logger);

    const tweets = ['Test tweet'];
    const results = await badService.analyzeTweets(tweets);

    expect(results).toHaveLength(1);
    expect(results[0].sentiment.label).toBe('neutral');
    expect(results[0].sentiment.confidence).toBe(0);

    // Restore API URL
    process.env.ML_API_URL = 'http://localhost:8000';
  });
});
