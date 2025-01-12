import { describe, it, beforeEach, jest, expect } from '@jest/globals';
import { container } from 'tsyringe';
import { DataCollectionController } from '../../app/controllers/data-collection.controller';
import { ESPNService } from '../../app/services/espn.service';
import { TwitterService } from '../../app/services/twitter.service';
import { FileUploadService } from '../../app/services/file-upload.service';
import { Logger } from 'winston';

describe('DataCollectionController', () => {
  let dataCollectionController: DataCollectionController;
  let mockESPNService: jest.Mocked<ESPNService>;
  let mockTwitterService: jest.Mocked<TwitterService>;
  let mockFileUploadService: jest.Mocked<FileUploadService>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    // Create mock services
    mockESPNService = {
      getGameDetails: jest.fn(),
      getTeamStats: jest.fn(),
      getGameOdds: jest.fn(),
      getHistoricalGames: jest.fn(),
    } as any;

    mockTwitterService = {
      getGameRelatedTweets: jest.fn(),
      getAnalystOpinions: jest.fn(),
    } as any;

    mockFileUploadService = {
      processExcelFile: jest.fn(),
      processJsonFile: jest.fn(),
    } as any;

    mockLogger = {
      error: jest.fn(),
      info: jest.fn(),
    } as any;

    // Register mocks with the container
    container.registerInstance(ESPNService, mockESPNService);
    container.registerInstance(TwitterService, mockTwitterService);
    container.registerInstance(FileUploadService, mockFileUploadService);
    container.registerInstance('Logger', mockLogger);

    dataCollectionController = container.resolve(DataCollectionController);
  });

  describe('collectGameData', () => {
    const mockGameId = 'test-game-123';
    const mockGameDetails = {
      gameId: mockGameId,
      homeTeam: { id: 'home-1', name: 'Home Team' },
      awayTeam: { id: 'away-1', name: 'Away Team' },
    };

    it('should collect and combine all game data successfully', async () => {
      // Setup mock returns
      mockESPNService.getGameDetails.mockResolvedValue(mockGameDetails);
      mockESPNService.getTeamStats.mockResolvedValue({ stats: 'test' });
      mockESPNService.getGameOdds.mockResolvedValue({ odds: 'test' });
      mockTwitterService.getGameRelatedTweets.mockResolvedValue([{ id: '1', text: 'test tweet' }]);
      mockTwitterService.getAnalystOpinions.mockResolvedValue([{ id: '2', text: 'analyst tweet' }]);

      const result = await dataCollectionController.collectGameData(mockGameId);

      expect(result).toHaveProperty('gameDetails');
      expect(result).toHaveProperty('teamStats');
      expect(result).toHaveProperty('odds');
      expect(result).toHaveProperty('socialData');
      
      expect(mockESPNService.getGameDetails).toHaveBeenCalledWith(mockGameId);
      expect(mockTwitterService.getGameRelatedTweets).toHaveBeenCalledWith(
        mockGameId,
        expect.any(Object)
      );
    });

    it('should handle ESPN API errors gracefully', async () => {
      mockESPNService.getGameDetails.mockRejectedValue(new Error('ESPN API Error'));

      await expect(dataCollectionController.collectGameData(mockGameId))
        .rejects
        .toThrow('Error collecting game data');
      
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('processUploadedFile', () => {
    const mockFile = {
      buffer: Buffer.from('test'),
      originalname: 'test.xlsx',
    } as Express.Multer.File;

    it('should process Excel files correctly', async () => {
      mockFileUploadService.processExcelFile.mockResolvedValue([{ test: 'data' }]);

      const result = await dataCollectionController.processUploadedFile(mockFile);

      expect(result).toHaveLength(1);
      expect(mockFileUploadService.processExcelFile).toHaveBeenCalledWith(mockFile.buffer);
    });

    it('should process JSON files correctly', async () => {
      const jsonFile = { ...mockFile, originalname: 'test.json' };
      mockFileUploadService.processJsonFile.mockResolvedValue([{ test: 'data' }]);

      const result = await dataCollectionController.processUploadedFile(jsonFile);

      expect(result).toHaveLength(1);
      expect(mockFileUploadService.processJsonFile).toHaveBeenCalledWith(jsonFile.buffer);
    });

    it('should reject unsupported file types', async () => {
      const invalidFile = { ...mockFile, originalname: 'test.txt' };

      await expect(dataCollectionController.processUploadedFile(invalidFile))
        .rejects
        .toThrow('Unsupported file format');
    });
  });

  describe('collectHistoricalData', () => {
    it('should collect historical data for the specified date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const mockGames = [
        { gameId: 'game-1' },
        { gameId: 'game-2' },
      ];

      mockESPNService.getHistoricalGames.mockResolvedValue(mockGames);
      mockESPNService.getGameDetails.mockResolvedValue({ gameDetails: 'test' });
      mockESPNService.getTeamStats.mockResolvedValue({ stats: 'test' });
      mockESPNService.getGameOdds.mockResolvedValue({ odds: 'test' });

      const result = await dataCollectionController.collectHistoricalData(startDate, endDate);

      expect(result).toHaveLength(2);
      expect(mockESPNService.getHistoricalGames).toHaveBeenCalledWith(startDate, endDate);
    });
  });
});
