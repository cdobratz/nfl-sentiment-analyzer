import { Cache } from '../utils/cache';
import axios from 'axios';
import { Logger } from 'winston';
import { injectable } from 'tsyringe';
import { InjuryReport } from '../types/espn.types';

// Cache instance for ESPN data
const cache = new Cache();

// ESPN API endpoints
const ESPN_API_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const ESPN_SCOREBOARD_URL = `${ESPN_API_BASE}/scoreboard`;
const ESPN_NEWS_URL = `${ESPN_API_BASE}/news`;
const ESPN_STATS_URL = `${ESPN_API_BASE}/teams`;
const ESPN_ODDS_URL = `${ESPN_API_BASE}/odds`;

interface ESPNTeam {
  id: string;
  name: string;
  abbreviation: string;
  score: string;
}

interface ESPNGame {
  id: string;
  name: string;
  shortName: string;
  date: string;
  status: {
    type: {
      state: string;
      completed: boolean;
    };
  };
  competitions: Array<{
    competitors: Array<{
      team: ESPNTeam;
      score: string;
      homeAway: string;
    }>;
  }>;
}

interface ESPNNewsArticle {
  headline: string;
  description: string;
  published: string;
  links: {
    web: {
      href: string;
    };
  };
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
  private static instance: ESPNService;

  private constructor(private logger: Logger) {}

  public static getInstance(logger: Logger): ESPNService {
    if (!ESPNService.instance) {
      ESPNService.instance = new ESPNService(logger);
    }
    return ESPNService.instance;
  }

  /**
   * Get live NFL game scores
   */
  async getScores(): Promise<ESPNGame[]> {
    const cacheKey = 'espn_scores';
    const cachedData = cache.get<ESPNGame[]>(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await axios.get(ESPN_SCOREBOARD_URL);
      const games = response.data.events as ESPNGame[];
      cache.set(cacheKey, games);
      return games;
    } catch (error) {
      this.logger.error('Error fetching ESPN scores:', error);
      throw error;
    }
  }

  /**
   * Get latest NFL news articles
   */
  async getNews(): Promise<ESPNNewsArticle[]> {
    const cacheKey = 'espn_news';
    const cachedData = cache.get<ESPNNewsArticle[]>(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await axios.get(ESPN_NEWS_URL);
      const articles = response.data.articles as ESPNNewsArticle[];
      cache.set(cacheKey, articles);
      return articles;
    } catch (error) {
      this.logger.error('Error fetching ESPN news:', error);
      throw error;
    }
  }

  @cache(300) // 5 minutes cache
  async getCurrentWeekGames(): Promise<GameDetails[]> {
    try {
      const response = await axios.get(`${ESPN_API_BASE}/scoreboard`);
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
      const response = await axios.get(`${ESPN_API_BASE}/summary?event=${gameId}`);
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
        `${ESPN_API_BASE}/scoreboard?dates=${year}&week=${week}`
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
        `${ESPN_API_BASE}/teams/${teamId}/injuries`
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching injury report for team ${teamId}:`, error);
      throw new Error('Failed to fetch injury report');
    }
  }

  // Get team statistics with 1 hour cache
  @cache({ ttl: 3600 })
  async getTeamStats(teamId: string): Promise<any> {
    try {
      const response = await axios.get(`${ESPN_STATS_URL}/${teamId}/statistics`);
      return response.data;
    } catch (error) {
      this.logger.error('Error fetching team stats:', error);
      throw error;
    }
  }

  // Get game odds with 5 minute cache
  @cache({ ttl: 300 })
  async getGameOdds(gameId: string): Promise<any> {
    try {
      const response = await axios.get(`${ESPN_ODDS_URL}?gameId=${gameId}`);
      return response.data;
    } catch (error) {
      this.logger.error('Error fetching game odds:', error);
      throw error;
    }
  }

  // Get historical game data
  async getHistoricalGames(startDate: string, endDate: string): Promise<GameDetails[]> {
    try {
      const response = await axios.get(`${ESPN_SCOREBOARD_URL}`, {
        params: {
          dates: `${startDate}-${endDate}`,
          limit: 100
        }
      });
      return response.data.events.map(this.transformGameData);
    } catch (error) {
      this.logger.error('Error fetching historical games:', error);
      throw error;
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
