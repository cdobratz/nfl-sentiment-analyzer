import axios from 'axios';
import { Logger } from 'winston';
import { injectable } from 'tsyringe';
import { cache } from '../utils/cache';
import { InjuryReport } from '../types/espn.types';

interface ESPNGame {
  id: string;
  name: string;
  date: string;
  season: {
    year: number;
    type: number;
  };
  week: {
    number: number;
  };
  competitions: Array<{
    id: string;
    competitors: Array<{
      id: string;
      homeAway: string;
      team: {
        id: string;
        name: string;
        abbreviation: string;
        displayName: string;
      };
      score?: string;
    }>;
    odds?: Array<{
      provider: {
        name: string;
        priority: number;
      };
      details: string;
      overUnder: number;
    }>;
    status: {
      type: {
        state: string;
      };
    };
  }>;
}

interface GameDetails {
  gameId: string;
  homeTeam: {
    id: string;
    name: string;
    abbreviation: string;
    score?: number;
  };
  awayTeam: {
    id: string;
    name: string;
    abbreviation: string;
    score?: number;
  };
  date: string;
  status: string;
  odds?: {
    spread?: string;
    overUnder?: number;
  };
  week: number;
  season: {
    year: number;
    type: string;
  };
}

@injectable()
export class ESPNService {
  private readonly BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
  private readonly CACHE_TTL = 5 * 60; // 5 minutes cache

  constructor(private logger: Logger) {}

  @cache(300) // 5 minutes cache
  async getCurrentWeekGames(): Promise<GameDetails[]> {
    try {
      const response = await axios.get(`${this.BASE_URL}/scoreboard`);
      const games: ESPNGame[] = response.data.events;

      return games.map(game => this.transformGameData(game));
    } catch (error) {
      this.logger.error('Error fetching current week games from ESPN:', error);
      throw new Error('Failed to fetch current week games');
    }
  }

  @cache(300)
  async getGameDetails(gameId: string): Promise<GameDetails> {
    try {
      const response = await axios.get(`${this.BASE_URL}/summary?event=${gameId}`);
      return this.transformGameData(response.data);
    } catch (error) {
      this.logger.error(`Error fetching game details for game ${gameId}:`, error);
      throw new Error('Failed to fetch game details');
    }
  }

  @cache(3600) // 1 hour cache
  async getWeeklySchedule(year: number, week: number): Promise<GameDetails[]> {
    try {
      const response = await axios.get(
        `${this.BASE_URL}/scoreboard?dates=${year}&week=${week}`
      );
      const games: ESPNGame[] = response.data.events;

      return games.map(game => this.transformGameData(game));
    } catch (error) {
      this.logger.error(`Error fetching schedule for week ${week}:`, error);
      throw new Error('Failed to fetch weekly schedule');
    }
  }

  @cache(60 * 60) // 1 hour cache
  async getInjuryReport(teamId: string): Promise<InjuryReport> {
    try {
      const response = await axios.get<InjuryReport>(
        `${this.BASE_URL}/teams/${teamId}/injuries`
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching injury report for team ${teamId}:`, error);
      throw new Error('Failed to fetch injury report');
    }
  }

  private transformGameData(game: ESPNGame): GameDetails {
    const competition = game.competitions[0];
    const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
    const awayTeam = competition.competitors.find(c => c.homeAway === 'away');
    
    if (!homeTeam || !awayTeam) {
      throw new Error(`Invalid game data: missing team information for game ${game.id}`);
    }
    
    const odds = competition.odds?.[0];

    return {
      gameId: game.id,
      homeTeam: {
        id: homeTeam.team.id,
        name: homeTeam.team.name,
        abbreviation: homeTeam.team.abbreviation,
        score: homeTeam.score ? parseInt(homeTeam.score) : undefined,
      },
      awayTeam: {
        id: awayTeam.team.id,
        name: awayTeam.team.name,
        abbreviation: awayTeam.team.abbreviation,
        score: awayTeam.score ? parseInt(awayTeam.score) : undefined,
      },
      date: game.date,
      status: competition.status.type.state,
      odds: odds ? {
        spread: odds.details,
        overUnder: odds.overUnder,
      } : undefined,
      week: game.week.number,
      season: {
        year: game.season.year,
        type: game.season.type === 2 ? 'regular' : 
          game.season.type === 3 ? 'post' : 'pre',
      },
    };
  }
}
