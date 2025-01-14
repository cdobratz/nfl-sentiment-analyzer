import { describe, it, beforeEach, jest, expect } from '@jest/globals';
import { container } from 'tsyringe';
import { DataCollectionController } from '../../app/controllers/data-collection.controller';
import { ESPNService } from '../../app/services/espn.service';
import { TwitterService } from '../../app/services/twitter.service';
import { DataIntegrationService } from '../../app/services/data-integration.service';
import { Logger } from 'winston';
import { ESPNGame, ESPNTeam, ESPNOdds } from '../../app/types/espn.types';
import { Tweet, TopTweet } from '../../app/types/twitter.types';
import type { LeveledLogMethod } from 'winston';

describe('DataCollectionController', () => {
  let dataCollectionController: DataCollectionController;
  let mockESPNService: jest.Mocked<ESPNService>;
  let mockTwitterService: jest.Mocked<TwitterService>;
  let mockDataIntegrationService: jest.Mocked<DataIntegrationService>;
  let mockLogger: Partial<Logger>;

  beforeEach(() => {
    // Create mock services
    mockESPNService = {
      getGameDetails: jest.fn(),
      getTeamStats: jest.fn(),
      getGameOdds: jest.fn(),
      getScores: jest.fn(),
      getNews: jest.fn(),
      getTeamDetails: jest.fn(),
      getGameVenue: jest.fn(),
      getGameWeather: jest.fn(),
      getGameOfficials: jest.fn(),
      refreshGameDetails: jest.fn(),
      cache: {} as any,
      getCurrentWeekGames: jest.fn(),
      getInjuryReport: jest.fn(),
      getWeeklySchedule: jest.fn(),
      getGameDetailsOriginal: jest.fn()
    } as unknown as jest.Mocked<ESPNService>;

    mockTwitterService = {
      getGameRelatedTweets: jest.fn(),
      getAnalystOpinions: jest.fn(),
      refreshGameTweets: jest.fn(),
      refreshAnalystTweets: jest.fn(),
      clearCache: jest.fn(),
      twitterClient: {} as any,
      cache: {} as any,
      MAX_RETRIES: 3,
      INITIAL_RETRY_DELAY: 1000
    } as unknown as jest.Mocked<TwitterService>;

    mockDataIntegrationService = {
      getGameAnalysis: jest.fn(),
      refreshGameData: jest.fn()
    } as unknown as jest.Mocked<DataIntegrationService>;

    mockLogger = {
      error: jest.fn() as unknown as LeveledLogMethod,
      info: jest.fn() as unknown as LeveledLogMethod,
      debug: jest.fn() as unknown as LeveledLogMethod,
      warn: jest.fn() as unknown as LeveledLogMethod
    };

    // Register mocks with the container
    container.registerInstance(ESPNService, mockESPNService);
    container.registerInstance(TwitterService, mockTwitterService);
    container.registerInstance(DataIntegrationService, mockDataIntegrationService);
    container.registerInstance('Logger', mockLogger as Logger);

    dataCollectionController = container.resolve(DataCollectionController);
  });

  describe('collectGameData', () => {
    const mockGameId = 'test-game-123';
    const mockGameDetails: ESPNGame = {
      id: mockGameId,
      date: '2025-01-14T00:00:00Z',
      name: 'Test Game',
      shortName: 'TEST vs TEST',
      season: { year: 2025, type: 1 },
      week: { number: 1 },
      competitions: [{
        id: 'comp-1',
        competitors: [],
        venue: {
          id: 'venue-1',
          fullName: 'Test Stadium',
          address: { city: 'Test City', state: 'TS' },
          capacity: 70000,
          indoor: false
        },
        attendance: 65000,
        weather: {
          displayValue: 'Clear',
          temperature: 72,
          conditionId: 'clear'
        },
        officials: [],
        odds: [],
        status: { type: { id: '1', name: 'STATUS', state: 'pre', completed: false } }
      }],
      status: { type: { id: '1', name: 'STATUS', state: 'pre', completed: false } },
      homeTeam: {
        id: 'home-1',
        name: 'Home Team',
        abbreviation: 'HOME',
        displayName: 'Home Team',
        shortDisplayName: 'HOME',
        color: '#000000',
        alternateColor: '#ffffff',
        logo: 'home.png'
      },
      awayTeam: {
        id: 'away-1',
        name: 'Away Team',
        abbreviation: 'AWAY',
        displayName: 'Away Team',
        shortDisplayName: 'AWAY',
        color: '#ffffff',
        alternateColor: '#000000',
        logo: 'away.png'
      }
    };

    const mockTopTweet: TopTweet = {
      id: '1',
      text: 'test tweet',
      authorId: 'author1',
      createdAt: new Date(),
      metrics: {
        retweets: 0,
        replies: 0,
        likes: 0,
        quotes: 0
      },
      isAnalyst: false,
      sentiment: 0.8,
      confidence: 0.9,
      keywords: ['game', 'football'],
      entities: ['team', 'player'],
      isPositive: true,
      isNegative: false,
      isNeutral: false,
      sentimentStrength: 'strong'
    };

    it('should collect and combine all game data successfully', async () => {
      const mockResult = {
        game: mockGameDetails,
        topTweets: [mockTopTweet],
        analystOpinions: [{
          ...mockTopTweet,
          isAnalyst: true,
          analystInfo: {
            handle: '@analyst',
            name: 'Test Analyst',
            organization: 'Test Org',
            verified: true
          }
        }]
      };

      mockDataIntegrationService.getGameAnalysis.mockResolvedValue(mockResult);

      const result = await dataCollectionController.collectGameData(mockGameId);

      expect(result).toEqual(mockResult);
      expect(mockDataIntegrationService.getGameAnalysis).toHaveBeenCalledWith(mockGameId);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockDataIntegrationService.getGameAnalysis.mockRejectedValue(new Error('API Error'));

      await expect(dataCollectionController.collectGameData(mockGameId))
        .rejects
        .toThrow('API Error');
      
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('refreshGameData', () => {
    const mockGameId = 'test-game-123';

    it('should refresh game data successfully', async () => {
      mockESPNService.getGameDetails.mockResolvedValue({
        homeTeam: { abbreviation: 'HOME' },
        awayTeam: { abbreviation: 'AWAY' }
      } as ESPNGame);

      await dataCollectionController.refreshGameData(mockGameId);

      expect(mockESPNService.refreshGameDetails).toHaveBeenCalledWith(mockGameId);
      expect(mockTwitterService.refreshGameTweets).toHaveBeenCalledWith(
        mockGameId,
        { home: 'HOME', away: 'AWAY' }
      );
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle refresh errors gracefully', async () => {
      mockESPNService.getGameDetails.mockRejectedValue(new Error('Refresh Error'));

      await expect(dataCollectionController.refreshGameData(mockGameId))
        .rejects
        .toThrow('Refresh Error');
      
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
