import { injectable, inject } from 'tsyringe';
import * as xlsx from 'xlsx';
import { Logger } from 'winston';
import { GameData } from '../types/game.types';

@injectable()
export class FileUploadService {
  constructor(@inject("Logger") private logger: Logger) {}

  async processExcelFile(buffer: Buffer): Promise<GameData[]> {
    try {
      const workbook = xlsx.read(buffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
      return this.validateAndTransformData(data);
    } catch (error) {
      this.logger.error('Error processing Excel file:', error);
      throw new Error('Invalid Excel file format');
    }
  }

  async processJsonFile(buffer: Buffer): Promise<GameData[]> {
    try {
      const data = JSON.parse(buffer.toString()) as Record<string, unknown>[];
      return this.validateAndTransformData(data);
    } catch (error) {
      this.logger.error('Error processing JSON file:', error);
      throw new Error('Invalid JSON file format');
    }
  }

  private validateAndTransformData(data: Record<string, unknown>[]): GameData[] {
    try {
      return data.map(item => {
        if (!this.isValidGameData(item)) {
          throw new Error('Invalid data format');
        }
        return {
          id: item.id as string,
          season: item.season as number,
          seasonType: item.seasonType as string,
          date: item.date as string,
          homeTeam: {
            id: (item.homeTeam as Record<string, unknown>).id as string,
            name: (item.homeTeam as Record<string, unknown>).name as string,
            score: (item.homeTeam as Record<string, unknown>).score as string,
            stats: (item.homeTeam as Record<string, unknown>).stats as Record<string, string | number>
          },
          awayTeam: {
            id: (item.awayTeam as Record<string, unknown>).id as string,
            name: (item.awayTeam as Record<string, unknown>).name as string,
            score: (item.awayTeam as Record<string, unknown>).score as string,
            stats: (item.awayTeam as Record<string, unknown>).stats as Record<string, string | number>
          },
          odds: {
            details: (item.odds as Record<string, unknown>).details as string,
            overUnder: (item.odds as Record<string, unknown>).overUnder as number,
            spread: (item.odds as Record<string, unknown>).spread as number
          },
          tweets: [],
          analystOpinions: [],
          gameDetails: {}
        };
      });
    } catch (error) {
      this.logger.error('Error validating and transforming data:', error);
      throw new Error('Invalid data format');
    }
  }

  private isValidGameData(data: Record<string, unknown>): boolean {
    return (
      typeof data.id === 'string' &&
      typeof data.season === 'number' &&
      typeof data.seasonType === 'string' &&
      typeof data.date === 'string' &&
      this.isValidTeam(data.homeTeam as Record<string, unknown>) &&
      this.isValidTeam(data.awayTeam as Record<string, unknown>) &&
      this.isValidOdds(data.odds as Record<string, unknown>)
    );
  }

  private isValidTeam(team: Record<string, unknown>): boolean {
    return (
      typeof team?.id === 'string' &&
      typeof team?.name === 'string' &&
      typeof team?.score === 'string' &&
      typeof team?.stats === 'object'
    );
  }

  private isValidOdds(odds: Record<string, unknown>): boolean {
    return (
      typeof odds?.details === 'string' &&
      typeof odds?.overUnder === 'number' &&
      typeof odds?.spread === 'number'
    );
  }
}
