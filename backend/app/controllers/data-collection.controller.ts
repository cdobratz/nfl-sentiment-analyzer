import { injectable, inject } from 'tsyringe';
import { Logger } from 'winston';
import { ESPNService } from '../services/espn.service';
import { TwitterService } from '../services/twitter.service';
import { DataIntegrationService } from '../services/data-integration.service';
import { ESPNGame } from '../types/espn.types';
import { TopTweet } from '../types/twitter.types';

@injectable()
export class DataCollectionController {
  constructor(
    @inject('Logger') private logger: Logger,
    private espnService: ESPNService,
    private twitterService: TwitterService,
    private dataIntegrationService: DataIntegrationService
  ) {}

  async collectGameData(gameId: string): Promise<{
    game: ESPNGame;
    topTweets: TopTweet[];
    analystOpinions: TopTweet[];
  }> {
    try {
      const result = await this.dataIntegrationService.getGameAnalysis(gameId);
      
      this.logger.info('Game data collection completed:', {
        gameId,
        topTweetsCount: result.topTweets.length,
        analystOpinionsCount: result.analystOpinions.length
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error collecting game data:', {
        gameId,
        error: errorMessage
      });
      throw error;
    }
  }

  async refreshGameData(gameId: string): Promise<void> {
    try {
      const game = await this.espnService.getGameDetails(gameId);
      await Promise.all([
        this.espnService.refreshGameDetails(gameId),
        this.twitterService.refreshGameTweets(gameId, {
          home: game.homeTeam.abbreviation,
          away: game.awayTeam.abbreviation
        })
      ]);

      this.logger.info('Game data refresh completed:', { gameId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error refreshing game data:', {
        gameId,
        error: errorMessage
      });
      throw error;
    }
  }
}
