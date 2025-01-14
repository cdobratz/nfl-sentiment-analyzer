import { describe, it, beforeEach, jest, expect } from '@jest/globals';
import { DataCollectionController } from '../../app/controllers/data-collection.controller';
import { ESPNService } from '../../app/services/espn.service';
import { TwitterService } from '../../app/services/twitter.service';
import { DataIntegrationService } from '../../app/services/data-integration.service';
import { Logger } from 'winston';
import type { LeveledLogMethod } from 'winston';
import { ESPNGame, ESPNTeam } from '../../app/types/espn.types';
import { TopTweet } from '../../app/types/twitter.types';

describe('DataCollectionController', () => {
  let controller: DataCollectionController;
  let mockESPNService: jest.Mocked<ESPNService>;
  let mockTwitterService: jest.Mocked<TwitterService>;
  let mockDataIntegrationService: jest.Mocked<DataIntegrationService>;
  let mockLogger: Partial<Logger>;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn() as unknown as LeveledLogMethod,
      info: jest.fn() as unknown as LeveledLogMethod,
      debug: jest.fn() as unknown as LeveledLogMethod,
      warn: jest.fn() as unknown as LeveledLogMethod
    };

    mockESPNService = {
      getScores: jest.fn(),
      getGameDetails: jest.fn(),
      getTeams: jest.fn(),
      getTeamById: jest.fn()
    } as unknown as jest.Mocked<ESPNService>;

    mockTwitterService = {
      getGameRelatedTweets: jest.fn(),
      searchTweets: jest.fn()
    } as unknown as jest.Mocked<TwitterService>;

    mockDataIntegrationService = {
      getGameAnalysis: jest.fn(),
      getGameDetails: jest.fn()
    } as unknown as jest.Mocked<DataIntegrationService>;

    controller = new DataCollectionController(
      mockLogger as Logger,
      mockESPNService,
      mockTwitterService,
      mockDataIntegrationService
    );
  });

  describe('collectGameData', () => {
    it('should collect game data successfully', async () => {
      const mockTeam: ESPNTeam = {
        id: 'team1',
        name: 'Test Team',
        abbreviation: 'TST',
        displayName: 'Test Team',
        shortDisplayName: 'Test',
        color: '#000000',
        alternateColor: '#FFFFFF',
        logo: 'https://example.com/logo.png'
      };

      const mockGame: ESPNGame = {
        id: 'game1',
        date: '2024-01-01',
        name: 'Test Game',
        shortName: 'Test vs Test',
        season: {
          year: 2024,
          type: 2
        },
        week: {
          number: 1
        },
        competitions: [{
          id: 'comp1',
          competitors: [
            { id: 'comp1', homeAway: 'home', team: mockTeam },
            { id: 'comp2', homeAway: 'away', team: mockTeam }
          ],
          venue: {
            id: 'venue1',
            fullName: 'Test Stadium',
            address: {
              city: 'Test City',
              state: 'TS'
            },
            capacity: 50000,
            indoor: true
          },
          status: {
            type: {
              id: 'status1',
              name: 'Final',
              state: 'post',
              completed: true
            }
          }
        }],
        status: {
          type: {
            id: 'status1',
            name: 'Final',
            state: 'post',
            completed: true
          }
        },
        homeTeam: mockTeam,
        awayTeam: mockTeam
      };

      const mockTweets: TopTweet[] = [{
        id: 'tweet1',
        text: 'Great game!',
        authorId: 'user1',
        authorName: 'Test User',
        authorUsername: 'testuser',
        verified: false,
        createdAt: '2024-01-01T00:00:00Z',
        retweetCount: 0,
        replyCount: 0,
        likeCount: 0,
        quoteCount: 0,
        sentiment: {
          score: 0.8,
          label: 'positive',
          confidence: 0.9
        }
      }];

      mockESPNService.getScores.mockResolvedValue([mockGame]);
      mockDataIntegrationService.getGameAnalysis.mockResolvedValue({
        game: mockGame,
        topTweets: mockTweets,
        analystOpinions: mockTweets
      });

      const result = await controller.collectGameData('game1');

      expect(result).toBeDefined();
      expect(mockESPNService.getScores).toHaveBeenCalled();
      expect(mockDataIntegrationService.getGameAnalysis).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle errors when collecting game data', async () => {
      mockESPNService.getScores.mockRejectedValue(new Error('API Error'));

      await expect(controller.collectGameData('game1')).rejects.toThrow('Failed to collect game data');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('refreshGameData', () => {
    it('should refresh game data successfully', async () => {
      const gameId = 'game1';
      const mockTeam: ESPNTeam = {
        id: 'team1',
        name: 'Test Team',
        abbreviation: 'TST',
        displayName: 'Test Team',
        shortDisplayName: 'Test',
        color: '#000000',
        alternateColor: '#FFFFFF',
        logo: 'https://example.com/logo.png'
      };

      const mockGame: ESPNGame = {
        id: gameId,
        date: '2024-01-01',
        name: 'Test Game',
        shortName: 'Test vs Test',
        season: {
          year: 2024,
          type: 2
        },
        week: {
          number: 1
        },
        competitions: [{
          id: 'comp1',
          competitors: [
            { id: 'comp1', homeAway: 'home', team: mockTeam },
            { id: 'comp2', homeAway: 'away', team: mockTeam }
          ],
          venue: {
            id: 'venue1',
            fullName: 'Test Stadium',
            address: {
              city: 'Test City',
              state: 'TS'
            },
            capacity: 50000,
            indoor: true
          },
          status: {
            type: {
              id: 'status1',
              name: 'Final',
              state: 'post',
              completed: true
            }
          }
        }],
        status: {
          type: {
            id: 'status1',
            name: 'Final',
            state: 'post',
            completed: true
          }
        },
        homeTeam: mockTeam,
        awayTeam: mockTeam
      };

      const mockTweets: TopTweet[] = [{
        id: 'tweet1',
        text: 'Great game!',
        authorId: 'user1',
        authorName: 'Test User',
        authorUsername: 'testuser',
        verified: false,
        createdAt: '2024-01-01T00:00:00Z',
        retweetCount: 0,
        replyCount: 0,
        likeCount: 0,
        quoteCount: 0,
        sentiment: {
          score: 0.8,
          label: 'positive',
          confidence: 0.9
        }
      }];

      mockDataIntegrationService.getGameDetails.mockResolvedValue({
        game: mockGame,
        topTweets: mockTweets,
        analystOpinions: mockTweets
      });

      const result = await controller.refreshGameData(gameId);

      expect(result).toBeDefined();
      expect(mockDataIntegrationService.getGameDetails).toHaveBeenCalledWith(gameId);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle errors when refreshing game data', async () => {
      const gameId = 'game1';
      mockDataIntegrationService.getGameDetails.mockRejectedValue(new Error('API Error'));

      await expect(controller.refreshGameData(gameId)).rejects.toThrow('Failed to refresh game data');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
