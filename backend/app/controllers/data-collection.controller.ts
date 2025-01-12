import { injectable } from 'tsyringe';
import { Logger } from 'winston';
import { ESPNService } from '../services/espn.service';
import { TwitterService } from '../services/twitter.service';
import { FileUploadService } from '../services/file-upload.service';
import { GameData } from '../types/game.types';

@injectable()
export class DataCollectionController {
  constructor(
    private logger: Logger,
    private espnService: ESPNService,
    private twitterService: TwitterService,
    private fileUploadService: FileUploadService
  ) {}

  async collectGameData(gameId: string): Promise<GameData> {
    try {
      // Get game details from ESPN
      const gameDetails = await this.espnService.getGameDetails(gameId);
      
      // Get team statistics
      const [homeTeamStats, awayTeamStats] = await Promise.all([
        this.espnService.getTeamStats(gameDetails.homeTeam.id),
        this.espnService.getTeamStats(gameDetails.awayTeam.id)
      ]);

      // Get game odds
      const odds = await this.espnService.getGameOdds(gameId);

      // Get social media sentiment
      const [gameTweets, analystOpinions] = await Promise.all([
        this.twitterService.getGameRelatedTweets(gameId, {
          home: gameDetails.homeTeam.name,
          away: gameDetails.awayTeam.name
        }),
        this.twitterService.getAnalystOpinions(gameId)
      ]);

      return {
        gameDetails,
        teamStats: {
          home: homeTeamStats,
          away: awayTeamStats
        },
        odds,
        socialData: {
          tweets: gameTweets,
          analystOpinions
        }
      };
    } catch (error) {
      this.logger.error('Error collecting game data:', error);
      throw error;
    }
  }

  async processUploadedFile(file: Express.Multer.File): Promise<GameData[]> {
    try {
      const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'xlsx') {
        return await this.fileUploadService.processExcelFile(file.buffer);
      } else if (fileExtension === 'json') {
        return await this.fileUploadService.processJsonFile(file.buffer);
      } else {
        throw new Error('Unsupported file format. Please upload .xlsx or .json files only.');
      }
    } catch (error) {
      this.logger.error('Error processing uploaded file:', error);
      throw error;
    }
  }

  async collectHistoricalData(startDate: string, endDate: string): Promise<GameData[]> {
    try {
      const games = await this.espnService.getHistoricalGames(startDate, endDate);
      
      // Collect detailed data for each game
      const gameData = await Promise.all(
        games.map(game => this.collectGameData(game.gameId))
      );

      return gameData;
    } catch (error) {
      this.logger.error('Error collecting historical data:', error);
      throw error;
    }
  }
}
