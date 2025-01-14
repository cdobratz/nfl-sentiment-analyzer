import { injectable } from 'tsyringe';
import { Logger } from 'winston';
import { Tweet, TopTweet } from '../types/twitter.types';
import { SentimentAnalyzer } from '../ml/sentiment-analyzer';
import { ESPNService } from './espn.service';
import { TwitterService } from './twitter.service';
import { ESPNGame, ESPNCompetitor } from '../types/espn.types';
import NodeCache from 'node-cache';

interface TweetAnalysis {
  tweet: Tweet;
  sentiment: number;
  confidence: number;
  engagement: number;
  keywords: Array<{ word: string; score: number }>;
  entities: Array<{ name: string; type: string }>;
  isPositive: boolean;
  isNegative: boolean;
  isNeutral: boolean;
  sentimentStrength: 'extreme' | 'strong' | 'moderate' | 'mild';
  sentimentMetrics: {
    rawScore: number;
    normalizedScore: number;
    confidence: number;
    reliability: number;
  };
}

const SENTIMENT_THRESHOLDS = {
  POSITIVE: 0.3,
  NEGATIVE: -0.3,
  HIGH_CONFIDENCE: 0.8,
  EXTREME_SENTIMENT: 0.7,
  STRONG_SENTIMENT: 0.5,
  MODERATE_SENTIMENT: 0.3,
  RELIABILITY_THRESHOLD: 0.75
};

// Common football-related terms for better entity recognition
const FOOTBALL_ENTITIES = {
  TEAMS: ['Patriots', 'Bills', 'Jets', 'Dolphins', 'Ravens', 'Bengals', 'Browns', 'Steelers', 
          'Titans', 'Colts', 'Texans', 'Jaguars', 'Chiefs', 'Raiders', 'Chargers', 'Broncos',
          'Cowboys', 'Eagles', 'Giants', 'Commanders', 'Packers', 'Vikings', 'Lions', 'Bears',
          'Buccaneers', 'Saints', 'Falcons', 'Panthers', '49ers', 'Rams', 'Seahawks', 'Cardinals'],
  POSITIONS: ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'],
  STATS: ['touchdown', 'interception', 'sack', 'fumble', 'yards', 'points', 'field goal'],
  EVENTS: ['draft', 'training camp', 'preseason', 'playoff', 'super bowl', 'pro bowl']
};

@injectable()
export class DataIntegrationService {
  private cache: NodeCache;
  private sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
    total: number;
  } = {
    positive: 0,
    negative: 0,
    neutral: 0,
    total: 0
  };

  constructor(
    private logger: Logger,
    private espnService: ESPNService,
    private twitterService: TwitterService,
    private sentimentAnalyzer: SentimentAnalyzer
  ) {
    this.cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache
  }

  private async getGameTweets(gameId: string, game: ESPNGame): Promise<Tweet[]> {
    const competition = game.competitions[0];
    if (!competition) {
      throw new Error('No competition data found for game');
    }

    const homeTeam = competition.competitors.find((c: ESPNCompetitor) => c.homeAway === 'home')?.team;
    const awayTeam = competition.competitors.find((c: ESPNCompetitor) => c.homeAway === 'away')?.team;

    if (!homeTeam || !awayTeam) {
      throw new Error('Unable to find home or away team in game data');
    }

    return this.twitterService.getGameRelatedTweets(gameId, {
      home: homeTeam.name,
      away: awayTeam.name
    });
  }

  private calculateEngagement(tweet: Tweet): number {
    const { metrics } = tweet;
    return (
      metrics.retweets * 2 +
      metrics.replies * 1.5 +
      metrics.likes +
      metrics.quotes * 1.5
    );
  }

  private extractKeywords(text: string): Array<{ word: string; score: number }> {
    // Convert to lowercase and remove special characters
    const cleanText = text.toLowerCase().replace(/[^\w\s#@]/g, '');
    
    // Split into words and filter out common words and short terms
    const words = cleanText.split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'have', 'from', 'they', 'will'].includes(word));

    // Extract hashtags and mentions with higher weight
    const tags = (text.match(/#\w+|@\w+/g) || [])
      .map(tag => ({ word: tag, score: 2 })); // Hashtags and mentions get higher score

    // Score words based on football relevance
    const scoredWords = words.map(word => {
      let score = 1;
      
      // Increase score for football-related terms
      if (FOOTBALL_ENTITIES.STATS.some(stat => word.includes(stat.toLowerCase()))) {
        score += 0.5;
      }
      if (FOOTBALL_ENTITIES.POSITIONS.some(pos => word.toLowerCase() === pos.toLowerCase())) {
        score += 1;
      }
      
      return { word, score };
    });

    // Combine and sort by score
    return [...tags, ...scoredWords]
      .reduce((acc, { word, score }) => {
        const existing = acc.find(item => item.word === word);
        if (existing) {
          existing.score += score;
        } else {
          acc.push({ word, score });
        }
        return acc;
      }, [] as Array<{ word: string; score: number }>)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Keep top 10 keywords
  }

  private extractEntities(text: string): Array<{ name: string; type: string }> {
    const entities: Array<{ name: string; type: string }> = [];

    // Extract team names
    FOOTBALL_ENTITIES.TEAMS.forEach(team => {
      if (text.includes(team)) {
        entities.push({ name: team, type: 'TEAM' });
      }
    });

    // Extract positions
    FOOTBALL_ENTITIES.POSITIONS.forEach(position => {
      const regex = new RegExp(`\\b${position}\\b`, 'i');
      if (regex.test(text)) {
        entities.push({ name: position, type: 'POSITION' });
      }
    });

    // Extract player names (basic implementation)
    const playerNames = text.match(/[A-Z][a-z]+(?:\s[A-Z][a-z]+)*(?=\s(?:is|was|has|will|says|reports))/g) || [];
    playerNames.forEach(name => {
      if (!FOOTBALL_ENTITIES.TEAMS.includes(name)) {
        entities.push({ name, type: 'PLAYER' });
      }
    });

    // Extract stats
    FOOTBALL_ENTITIES.STATS.forEach(stat => {
      const regex = new RegExp(`\\b${stat}\\b`, 'i');
      if (regex.test(text)) {
        entities.push({ name: stat, type: 'STAT' });
      }
    });

    return entities.slice(0, 5); // Limit to top 5 entities
  }

  private calculateSentimentStrength(sentiment: number): 'extreme' | 'strong' | 'moderate' | 'mild' {
    const absoluteSentiment = Math.abs(sentiment);
    if (absoluteSentiment > SENTIMENT_THRESHOLDS.EXTREME_SENTIMENT) return 'extreme';
    if (absoluteSentiment > SENTIMENT_THRESHOLDS.STRONG_SENTIMENT) return 'strong';
    if (absoluteSentiment > SENTIMENT_THRESHOLDS.MODERATE_SENTIMENT) return 'moderate';
    return 'mild';
  }

  private calculateReliability(
    sentiment: number,
    confidence: number,
    engagement: number
  ): number {
    // Weighted reliability score based on multiple factors
    const sentimentWeight = 0.4;
    const confidenceWeight = 0.4;
    const engagementWeight = 0.2;

    // Normalize engagement to 0-1 range (assuming max engagement of 1000)
    const normalizedEngagement = Math.min(engagement / 1000, 1);

    // Calculate reliability score
    return (
      (Math.abs(sentiment) * sentimentWeight) +
      (confidence * confidenceWeight) +
      (normalizedEngagement * engagementWeight)
    );
  }

  private normalizeSentiment(score: number): number {
    // Convert sentiment to a 0-1 range
    return (score + 1) / 2;
  }

  private updateSentimentDistribution(sentiment: number) {
    this.sentimentDistribution.total++;
    if (sentiment >= SENTIMENT_THRESHOLDS.POSITIVE) {
      this.sentimentDistribution.positive++;
    } else if (sentiment <= SENTIMENT_THRESHOLDS.NEGATIVE) {
      this.sentimentDistribution.negative++;
    } else {
      this.sentimentDistribution.neutral++;
    }
  }

  private async analyzeTweet(tweet: Tweet): Promise<TweetAnalysis> {
    try {
      const [sentimentResult, keywords, entities] = await Promise.all([
        this.sentimentAnalyzer.analyze(tweet.text),
        Promise.resolve(this.extractKeywords(tweet.text)),
        Promise.resolve(this.extractEntities(tweet.text))
      ]);

      const sentiment = sentimentResult.score;
      const engagement = this.calculateEngagement(tweet);
      const reliability = this.calculateReliability(
        sentiment,
        sentimentResult.confidence,
        engagement
      );

      // Update sentiment distribution
      this.updateSentimentDistribution(sentiment);

      // Calculate sentiment metrics
      const sentimentMetrics = {
        rawScore: sentiment,
        normalizedScore: this.normalizeSentiment(sentiment),
        confidence: sentimentResult.confidence,
        reliability
      };

      const sentimentStrength = this.calculateSentimentStrength(sentiment);

      // Log significant sentiment patterns
      if (sentimentResult.confidence > SENTIMENT_THRESHOLDS.HIGH_CONFIDENCE &&
          reliability > SENTIMENT_THRESHOLDS.RELIABILITY_THRESHOLD) {
        
        const logLevel = sentimentStrength === 'extreme' ? 'warn' : 'info';
        this.logger[logLevel](`${sentimentStrength} sentiment detected:`, {
          tweetId: tweet.id,
          sentiment: sentimentMetrics,
          text: tweet.text,
          analyst: tweet.analystInfo?.name,
          keywords: keywords.map(k => `${k.word} (${k.score.toFixed(2)})`).join(', '),
          entities: entities.map(e => `${e.name} (${e.type})`).join(', '),
          distribution: {
            ...this.sentimentDistribution,
            positiveRatio: this.sentimentDistribution.positive / this.sentimentDistribution.total,
            negativeRatio: this.sentimentDistribution.negative / this.sentimentDistribution.total
          }
        });
      }

      const analysis: TweetAnalysis = {
        tweet,
        sentiment,
        confidence: sentimentResult.confidence,
        engagement,
        keywords,
        entities,
        isPositive: sentiment >= SENTIMENT_THRESHOLDS.POSITIVE,
        isNegative: sentiment <= SENTIMENT_THRESHOLDS.NEGATIVE,
        isNeutral: sentiment > SENTIMENT_THRESHOLDS.NEGATIVE && 
                   sentiment < SENTIMENT_THRESHOLDS.POSITIVE,
        sentimentStrength,
        sentimentMetrics
      };

      // Log analysis summary
      this.logger.debug('Tweet analysis completed:', {
        tweetId: tweet.id,
        isAnalyst: tweet.isAnalyst,
        sentiment: analysis.sentimentMetrics,
        strength: analysis.sentimentStrength,
        keywordCount: analysis.keywords.length,
        entityCount: analysis.entities.length,
        reliability
      });

      return analysis;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error in tweet analysis:', {
        tweetId: tweet.id,
        author: tweet.authorId,
        isAnalyst: tweet.isAnalyst,
        error: errorMessage,
        text: tweet.text.substring(0, 100),
        timestamp: new Date().toISOString(),
        sentimentDistribution: this.sentimentDistribution
      });
      throw error;
    }
  }

  async processGameTweets(tweets: Tweet[]): Promise<TopTweet[]> {
    const results: TweetAnalysis[] = [];
    const batchSize = 10;

    for (let i = 0; i < tweets.length; i += batchSize) {
      const batch = tweets.slice(i, i + batchSize);
      const batchPromises = batch.map(tweet => 
        this.analyzeTweet(tweet).catch(error => {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error('Error analyzing tweet:', {
            tweetId: tweet.id,
            error: errorMessage
          });
          return null;
        })
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter((result): result is TweetAnalysis => result !== null));
    }

    return results
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 10)
      .map(analysis => ({
        ...analysis.tweet,
        sentiment: analysis.sentiment,
        confidence: analysis.confidence,
        keywords: analysis.keywords.map(k => k.word),
        entities: analysis.entities.map(e => e.name),
        isPositive: analysis.isPositive,
        isNegative: analysis.isNegative,
        isNeutral: analysis.isNeutral,
        sentimentStrength: analysis.sentimentStrength
      }));
  }

  async processAnalystTweets(tweets: Tweet[]): Promise<TopTweet[]> {
    const results = await this.processGameTweets(tweets);
    return results.map(tweet => ({
      ...tweet,
      isAnalyst: true
    }));
  }

  async getGameAnalysis(gameId: string): Promise<{
    game: ESPNGame;
    topTweets: TopTweet[];
    analystOpinions: TopTweet[];
  }> {
    try {
      const cacheKey = `game_analysis:${gameId}`;
      const cachedResult = this.cache.get<{
        game: ESPNGame;
        topTweets: TopTweet[];
        analystOpinions: TopTweet[];
      }>(cacheKey);

      if (cachedResult) {
        return cachedResult;
      }

      // First get game details
      const game = await this.espnService.getGameDetails(gameId);

      // Then get tweets with team information
      const [tweets, analystTweets] = await Promise.all([
        this.twitterService.getGameRelatedTweets(gameId, {
          home: game.homeTeam.abbreviation,
          away: game.awayTeam.abbreviation
        }),
        this.twitterService.getAnalystOpinions(gameId)
      ]);

      const [topTweets, analystOpinions] = await Promise.all([
        this.processGameTweets(tweets),
        this.processAnalystTweets(analystTweets)
      ]);

      const result = {
        game,
        topTweets,
        analystOpinions
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error getting game analysis:', {
        gameId,
        error: errorMessage
      });
      throw error;
    }
  }
}
