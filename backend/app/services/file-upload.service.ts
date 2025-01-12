import { injectable } from 'tsyringe';
import { Logger } from 'winston';
import * as xlsx from 'xlsx';
import { validate } from 'jsonschema';
import { GameData } from '../types/game.types';

@injectable()
export class FileUploadService {
  constructor(private logger: Logger) {}

  async processExcelFile(buffer: Buffer): Promise<GameData[]> {
    try {
      const workbook = xlsx.read(buffer);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet);
      
      return this.validateAndTransformData(data);
    } catch (error) {
      this.logger.error('Error processing Excel file:', error);
      throw new Error('Invalid Excel file format');
    }
  }

  async processJsonFile(buffer: Buffer): Promise<GameData[]> {
    try {
      const data = JSON.parse(buffer.toString());
      return this.validateAndTransformData(data);
    } catch (error) {
      this.logger.error('Error processing JSON file:', error);
      throw new Error('Invalid JSON file format');
    }
  }

  private validateAndTransformData(data: any[]): GameData[] {
    const schema = {
      type: 'array',
      items: {
        type: 'object',
        required: ['gameId', 'homeTeam', 'awayTeam', 'date'],
        properties: {
          gameId: { type: 'string' },
          homeTeam: { type: 'string' },
          awayTeam: { type: 'string' },
          date: { type: 'string' },
          odds: {
            type: 'object',
            properties: {
              spread: { type: 'string' },
              overUnder: { type: 'number' }
            }
          }
        }
      }
    };

    const validation = validate(data, schema);
    if (!validation.valid) {
      throw new Error('Invalid data format: ' + validation.errors.join(', '));
    }

    return data as GameData[];
  }
}
