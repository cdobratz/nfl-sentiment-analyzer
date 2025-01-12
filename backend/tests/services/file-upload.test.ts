import { describe, it, beforeEach, jest, expect } from '@jest/globals';
import { container } from 'tsyringe';
import { FileUploadService } from '../../app/services/file-upload.service';
import { Logger } from 'winston';
import * as xlsx from 'xlsx';

jest.mock('xlsx');

describe('FileUploadService', () => {
  let fileUploadService: FileUploadService;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn(),
      info: jest.fn(),
    } as any;

    container.registerInstance('Logger', mockLogger);
    fileUploadService = container.resolve(FileUploadService);
  });

  describe('processExcelFile', () => {
    const mockValidData = [
      {
        gameId: 'game-1',
        homeTeam: 'Team A',
        awayTeam: 'Team B',
        date: '2024-01-01',
      },
    ];

    it('should process valid Excel files correctly', async () => {
      (xlsx.read as jest.Mock).mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      });

      (xlsx.utils.sheet_to_json as jest.Mock).mockReturnValue(mockValidData);

      const result = await fileUploadService.processExcelFile(Buffer.from('test'));

      expect(result).toEqual(mockValidData);
      expect(xlsx.read).toHaveBeenCalled();
      expect(xlsx.utils.sheet_to_json).toHaveBeenCalled();
    });

    it('should handle invalid Excel files', async () => {
      (xlsx.read as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid Excel file');
      });

      await expect(fileUploadService.processExcelFile(Buffer.from('test')))
        .rejects
        .toThrow('Invalid Excel file format');
    });
  });

  describe('processJsonFile', () => {
    const mockValidJson = [
      {
        gameId: 'game-1',
        homeTeam: 'Team A',
        awayTeam: 'Team B',
        date: '2024-01-01',
      },
    ];

    it('should process valid JSON files correctly', async () => {
      const result = await fileUploadService.processJsonFile(
        Buffer.from(JSON.stringify(mockValidJson))
      );

      expect(result).toEqual(mockValidJson);
    });

    it('should handle invalid JSON files', async () => {
      await expect(fileUploadService.processJsonFile(Buffer.from('invalid json')))
        .rejects
        .toThrow('Invalid JSON file format');
    });

    it('should validate JSON data structure', async () => {
      const invalidData = [{
        // Missing required fields
        team: 'Team A',
      }];

      await expect(
        fileUploadService.processJsonFile(Buffer.from(JSON.stringify(invalidData)))
      ).rejects.toThrow('Invalid data format');
    });
  });
});
