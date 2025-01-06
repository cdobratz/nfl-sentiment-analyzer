import { injectable } from 'tsyringe';
import { Logger } from 'winston';
import { TwitterService } from './twitter.service';
import { ESPNService } from './espn.service';
import { SentimentService } from './sentiment.service';
import { cache } from '../utils/cache';
import { Tweet, SentimentResult, TopTweet, AnalystData } from '../types/twitter.types';

interface GameAnalysis {
  gameId: string;
  gameDetails: {
    homeTeam: string;
    awayTeam: string;
    date: string;
    odds?: {
      spread?: string;
      overUnder?: number;
    };
  };
  sentiment: {
    overall: number;
    homeTeam: number;
    awayTeam: number;
    confidence: number;
  };
  tweets: {
    total: number;
    positive: number;
    negative: number;
    neutral: number;
    topTweets: TopTweet[];
  };
  analysts: AnalystData[];
  lastUpdated: string;
}

@injectable()
export class DataIntegrationService {
  // List of trusted NFL analysts to track
  private readonly TRUSTED_ANALYSTS = [
    'AdamSchefter',    // ESPN Senior NFL Insider
    'RapSheet',        // NFL Network Insider
    'TomPelissero',    // NFL Network
    'JosinaAnderson',  // NFL Insider
    'MikeGarafolo',    // NFL Network
    'AlbertBreer',     // Sports Illustrated
    'JasonLaCanfora',  // CBS Sports
    'CharlesRobinson', // Yahoo Sports
    'JimTrotter_NFL',  // NFL Network
    'ProFootballTalk', // NBC Sports
    // Betting Analysts
    'MattMacKay',      // NFL Betting Analyst
    'JLoCovers',       // NFL Betting Expert
    'MurphCovers',     // NFL Betting Analyst
    'BetMGM',          // MGM Sportsbook
    'DKSportsbook'     // DraftKings Sportsbook
  ];

  constructor(
    private logger: Logger,
    private twitterService: TwitterService,
    private espnService: ESPNService,
    private sentimentService: SentimentService
  ) {}

  @cache(300) // 5 minutes cache
  async getGameAnalysis(gameId: string): Promise<GameAnalysis> {
    try {
      // Fetch game details from ESPN
      const gameDetails = await this.espnService.getGameDetails(gameId);

      // Collect tweets about the game
      const tweets = await this.twitterService.collectDailyTweets(this.TRUSTED_ANALYSTS);

      // Filter tweets relevant to this game
      const relevantTweets = this.filterGameRelevantTweets(
        tweets,
        gameDetails.homeTeam.name,
        gameDetails.awayTeam.name
      );

      // Analyze sentiment
      const sentimentResults = await this.sentimentService.analyzeTweets(
        relevantTweets.map(t => t.text)
      );

      // Process analyst-specific sentiment
      const analystSentiment = this.processAnalystSentiment(
        relevantTweets,
        sentimentResults
      );

      // Calculate sentiment counts
      const sentimentCounts = {
        positive: sentimentResults.filter(r => r.sentiment.label === 'positive').length,
        negative: sentimentResults.filter(r => r.sentiment.label === 'negative').length,
        neutral: sentimentResults.filter(r => r.sentiment.label === 'neutral').length
      };

      return {
        gameId,
        gameDetails: {
          homeTeam: gameDetails.homeTeam.name,
          awayTeam: gameDetails.awayTeam.name,
          date: gameDetails.date,
          odds: gameDetails.odds
        },
        sentiment: {
          overall: this.calculateOverallSentiment(sentimentResults),
          homeTeam: this.calculateTeamSentiment(sentimentResults, gameDetails.homeTeam.name),
          awayTeam: this.calculateTeamSentiment(sentimentResults, gameDetails.awayTeam.name),
          confidence: this.calculateConfidence(sentimentResults)
        },
        tweets: {
          total: relevantTweets.length,
          positive: sentimentCounts.positive,
          negative: sentimentCounts.negative,
          neutral: sentimentCounts.neutral,
          topTweets: this.getTopTweets(relevantTweets, sentimentResults)
        },
        analysts: analystSentiment,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error in getGameAnalysis for game ${gameId}:`, error);
      throw error;
    }
  }

  private filterGameRelevantTweets(
    tweets: Tweet[],
    homeTeam: string,
    awayTeam: string
  ): Tweet[] {
    const teamVariations = this.getTeamVariations(homeTeam, awayTeam);
    return tweets.filter(tweet => {
      const text = tweet.text.toLowerCase();
      return teamVariations.some(team => text.includes(team.toLowerCase()));
    });
  }

  private getTeamVariations(homeTeam: string, awayTeam: string): string[] {
    // Add common variations of team names (e.g., "Patriots" and "New England")
    const variations: string[] = [];
    [homeTeam, awayTeam].forEach(team => {
      variations.push(team);
      // Add team abbreviations and common nicknames
      // This could be expanded with a more comprehensive mapping
      if (team.includes(' ')) {
        variations.push(team.split(' ')[1]);
      }
    });
    return variations;
  }

  private calculateOverallSentiment(results: SentimentResult[]): number {
    return results.reduce((acc, curr) => acc + curr.sentiment.score, 0) / results.length;
  }

  private calculateTeamSentiment(results: SentimentResult[], teamName: string): number {
    const teamTweets = results.filter(r => 
      r.text.toLowerCase().includes(teamName.toLowerCase())
    );
    return teamTweets.length > 0
      ? teamTweets.reduce((acc, curr) => acc + curr.sentiment.score, 0) / teamTweets.length
      : 0;
  }

  private calculateConfidence(results: SentimentResult[]): number {
    return results.reduce((acc, curr) => acc + curr.sentiment.confidence, 0) / results.length;
  }

  private getTopTweets(tweets: Tweet[], sentimentResults: SentimentResult[]): TopTweet[] {
    return tweets
      .map((tweet, index) => ({
        text: tweet.text,
        sentiment: sentimentResults[index].sentiment.score,
        author: tweet.author
      }))
      .sort((a, b) => Math.abs(b.sentiment) - Math.abs(a.sentiment))
      .slice(0, 5);
  }

  private processAnalystSentiment(tweets: Tweet[], sentimentResults: SentimentResult[]): AnalystData[] {
    const analystData = new Map();

    tweets.forEach((tweet, index) => {
      if (!analystData.has(tweet.author)) {
        analystData.set(tweet.author, {
          handle: tweet.author,
          sentimentSum: 0,
          tweetCount: 0,
          influence: this.calculateInfluence(tweet)
        });
      }

      const data = analystData.get(tweet.author);
      data.sentimentSum += sentimentResults[index].sentiment.score;
      data.tweetCount += 1;
    });

    return Array.from(analystData.values())
      .map(data => ({
        handle: data.handle,
        sentiment: data.sentimentSum / data.tweetCount,
        tweetCount: data.tweetCount,
        influence: data.influence
      }))
      .sort((a, b) => b.influence - a.influence);
  }

  private calculateInfluence(tweet: Tweet): number {
    // Simple influence calculation based on engagement
    const likes = tweet.public_metrics?.like_count || 0;
    const retweets = tweet.public_metrics?.retweet_count || 0;
    const replies = tweet.public_metrics?.reply_count || 0;
    return likes + (retweets * 2) + (replies * 1.5);
  }
}
