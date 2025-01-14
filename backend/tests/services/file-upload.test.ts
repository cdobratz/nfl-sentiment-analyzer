import { describe, it, beforeEach, jest, expect } from '@jest/globals';
import { FileUploadService } from '../../app/services/file-upload.service';
import { Logger } from 'winston';
import type { LeveledLogMethod } from 'winston';
import { GameData } from '../../app/types/game.types';

// Mock xlsx module
jest.mock('xlsx', () => ({
  read: jest.fn(),
  utils: {
    sheet_to_json: jest.fn()
  }
}));

// Import mocked xlsx
import * as xlsx from 'xlsx';

describe('FileUploadService', () => {
  let fileUploadService: FileUploadService;
  let mockLogger: Partial<Logger>;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn() as unknown as LeveledLogMethod,
      info: jest.fn() as unknown as LeveledLogMethod,
      debug: jest.fn() as unknown as LeveledLogMethod,
      warn: jest.fn() as unknown as LeveledLogMethod
    };

    // Create service directly instead of using container
    fileUploadService = new FileUploadService(mockLogger as Logger);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('processExcelFile', () => {
    it('should process Excel file and return game data', async () => {
      const mockBuffer = Buffer.from('test');
      const mockGameData = {
        gameId: 'game-1',
        homeTeam: 'Home Team',
        awayTeam: 'Away Team',
        date: '2024-01-01',
        odds: {
          spread: '-3.5',
          overUnder: 45.5
        }
      };

      // Mock xlsx functions
      (xlsx.read as jest.Mock).mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      });

      (xlsx.utils.sheet_to_json as jest.Mock).mockReturnValue([mockGameData]);

      const result = await fileUploadService.processExcelFile(mockBuffer);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockGameData);
      expect(xlsx.read).toHaveBeenCalledWith(mockBuffer);
      expect(xlsx.utils.sheet_to_json).toHaveBeenCalled();
    });

    it('should handle Excel processing errors', async () => {
      const mockBuffer = Buffer.from('test');

      // Mock xlsx functions to throw error
      (xlsx.read as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid Excel file');
      });

      await expect(fileUploadService.processExcelFile(mockBuffer))
        .rejects
        .toThrow('Invalid Excel file format');

      expect(mockLogger.error).toHaveBeenCalled();
      expect(xlsx.read).toHaveBeenCalledWith(mockBuffer);
    });

    it('should handle data validation errors', async () => {
      const mockBuffer = Buffer.from('test');
      const invalidData = [{
        homeTeam: 'Home Team', // Missing required fields
        awayTeam: 'Away Team'
      }];

      (xlsx.read as jest.Mock).mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      });

      (xlsx.utils.sheet_to_json as jest.Mock).mockReturnValue(invalidData);

      await expect(fileUploadService.processExcelFile(mockBuffer))
        .rejects
        .toThrow('Invalid Excel file format');

      expect(mockLogger.error).toHaveBeenCalled();
      expect(xlsx.read).toHaveBeenCalledWith(mockBuffer);
      expect(xlsx.utils.sheet_to_json).toHaveBeenCalled();
    });
  });

  describe('processJsonFile', () => {
    it('should process JSON file and return game data', async () => {
      const mockGameData = {
        gameId: 'game-1',
        homeTeam: 'Home Team',
        awayTeam: 'Away Team',
        date: '2024-01-01',
        odds: {
          spread: '-3.5',
          overUnder: 45.5
        }
      };

      const mockBuffer = Buffer.from(JSON.stringify([mockGameData]));

      const result = await fileUploadService.processJsonFile(mockBuffer);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockGameData);
    });

    it('should handle JSON processing errors', async () => {
      const mockBuffer = Buffer.from('invalid json');

      await expect(fileUploadService.processJsonFile(mockBuffer))
        .rejects
        .toThrow('Invalid JSON file format');

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle data validation errors', async () => {
      const invalidData = [{
        homeTeam: 'Home Team', // Missing required fields
        awayTeam: 'Away Team'
      }];

      const mockBuffer = Buffer.from(JSON.stringify(invalidData));

      await expect(fileUploadService.processJsonFile(mockBuffer))
        .rejects
        .toThrow('Invalid JSON file format');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
