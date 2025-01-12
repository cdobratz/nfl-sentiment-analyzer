import { injectable } from 'tsyringe';
import { Logger } from 'winston';
import axios from 'axios';
import NodeCache from 'node-cache';
import { ESPNGame, ESPNTeam, ESPNOdds, ESPNVenue, ESPNWeather, ESPNOfficial, ESPNNewsArticle, InjuryReport, GameDetails } from '../types/espn.types';

// ESPN API endpoints
const ESPN_API_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const ESPN_SCOREBOARD_URL = `${ESPN_API_BASE}/scoreboard`;
const ESPN_NEWS_URL = `${ESPN_API_BASE}/news`;
const ESPN_STATS_URL = `${ESPN_API_BASE}/teams`;
const ESPN_ODDS_URL = `${ESPN_API_BASE}/odds`;

@injectable()
export class ESPNService {
  private cache: NodeCache;
  private readonly baseUrl = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.cache = new NodeCache({ stdTTL: 300 }); // 5 minute cache
    this.logger = logger;
  }

  /**
   * Get live NFL game scores
   */
  async getScores(): Promise<ESPNGame[]> {
    const cacheKey = 'espn_scores';
    const cachedData = this.cache.get<ESPNGame[]>(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await axios.get(ESPN_SCOREBOARD_URL);
      const games = response.data.events as ESPNGame[];
      this.cache.set(cacheKey, games);
      return games;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error fetching ESPN scores:', errorMessage);
      throw error;
    }
  }

  /**
   * Get latest NFL news articles
   */
  async getNews(): Promise<ESPNNewsArticle[]> {
    const cacheKey = 'espn_news';
    const cachedData = this.cache.get<ESPNNewsArticle[]>(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await axios.get(ESPN_NEWS_URL);
      const articles = response.data.articles as ESPNNewsArticle[];
      this.cache.set(cacheKey, articles);
      return articles;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error fetching ESPN news:', errorMessage);
      throw error;
    }
  }

  async getGameDetails(gameId: string): Promise<ESPNGame> {
    const cacheKey = `game:${gameId}`;
    const cached = this.cache.get<ESPNGame>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.baseUrl}/summary`, {
        params: {
          event: gameId
        }
      });

      const game: ESPNGame = response.data;
      this.cache.set(cacheKey, game);
      return game;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error fetching game details:', {
        gameId,
        error: errorMessage
      });
      throw error;
    }
  }

  async getTeamDetails(teamId: string): Promise<ESPNTeam> {
    const cacheKey = `team:${teamId}`;
    const cached = this.cache.get<ESPNTeam>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.baseUrl}/teams/${teamId}`);
      const team: ESPNTeam = response.data;
      this.cache.set(cacheKey, team);
      return team;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error fetching team details:', {
        teamId,
        error: errorMessage
      });
      throw error;
    }
  }

  async getGameOdds(gameId: string): Promise<ESPNOdds[]> {
    const cacheKey = `odds:${gameId}`;
    const cached = this.cache.get<ESPNOdds[]>(cacheKey);
    if (cached) return cached;

    try {
      const game = await this.getGameDetails(gameId);
      const odds = game.competitions[0]?.odds || [];
      this.cache.set(cacheKey, odds);
      return odds;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error fetching game odds:', {
        gameId,
        error: errorMessage
      });
      throw error;
    }
  }

  async getGameVenue(gameId: string): Promise<ESPNVenue | null> {
    const cacheKey = `venue:${gameId}`;
    const cached = this.cache.get<ESPNVenue>(cacheKey);
    if (cached) return cached;

    try {
      const game = await this.getGameDetails(gameId);
      const venue = game.competitions[0]?.venue;
      if (venue) {
        this.cache.set(cacheKey, venue);
        return venue;
      }
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error fetching game venue:', {
        gameId,
        error: errorMessage
      });
      throw error;
    }
  }

  async getGameWeather(gameId: string): Promise<ESPNWeather | null> {
    const cacheKey = `weather:${gameId}`;
    const cached = this.cache.get<ESPNWeather>(cacheKey);
    if (cached) return cached;

    try {
      const game = await this.getGameDetails(gameId);
      const weather = game.competitions[0]?.weather;
      if (weather) {
        this.cache.set(cacheKey, weather);
        return weather;
      }
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error fetching game weather:', {
        gameId,
        error: errorMessage
      });
      throw error;
    }
  }

  async getGameOfficials(gameId: string): Promise<ESPNOfficial[]> {
    const cacheKey = `officials:${gameId}`;
    const cached = this.cache.get<ESPNOfficial[]>(cacheKey);
    if (cached) return cached;

    try {
      const game = await this.getGameDetails(gameId);
      const officials = game.competitions[0]?.officials || [];
      this.cache.set(cacheKey, officials);
      return officials;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error fetching game officials:', {
        gameId,
        error: errorMessage
      });
      throw error;
    }
  }

  async getGameDetailsOriginal(gameId: string): Promise<ESPNGame> {
    const cacheKey = `game:${gameId}`;
    const cachedGame = this.cache.get<ESPNGame>(cacheKey);

    if (cachedGame) {
      return cachedGame;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/scoreboard/${gameId}`);
      const game = this.transformGameData(response.data);
      this.cache.set(cacheKey, game);
      return game;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error fetching game details:', errorMessage);
      throw error;
    }
  }

  async getCurrentWeekGames(): Promise<GameDetails[]> {
    try {
      const response = await axios.get(`${ESPN_API_BASE}/scoreboard`);
      const games: ESPNGame[] = response.data.events;

      return games.map(game => this.transformGameDataForGameDetails(game));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error fetching current week games from ESPN:', errorMessage);
      throw error;
    }
  }

  async getTeamStats(teamId: string): Promise<any> {
    try {
      const cacheKey = `team_stats:${teamId}`;
      const cachedResult = this.cache.get<any>(cacheKey);

      if (cachedResult) {
        return cachedResult;
      }

      const response = await axios.get(`${this.baseUrl}/teams/${teamId}/statistics`);
      this.cache.set(cacheKey, response.data);
      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error fetching team stats:', errorMessage);
      throw error;
    }
  }

  async getInjuryReport(teamId: string): Promise<InjuryReport> {
    try {
      const cacheKey = `injury_report:${teamId}`;
      const cachedResult = this.cache.get<InjuryReport>(cacheKey);

      if (cachedResult) {
        return cachedResult;
      }

      const response = await axios.get(`${this.baseUrl}/teams/${teamId}/injuries`);
      this.cache.set(cacheKey, response.data);
      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error fetching injury report for team ${teamId}:`, errorMessage);
      throw error;
    }
  }

  async getWeeklySchedule(year: number, week: number): Promise<GameDetails[]> {
    try {
      const response = await axios.get(
        `${ESPN_API_BASE}/scoreboard?dates=${year}&week=${week}`
      );
      const games: ESPNGame[] = response.data.events;

      return games.map(game => this.transformGameDataForGameDetails(game));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error fetching schedule for week ${week}:`, errorMessage);
      throw error;
    }
  }

  async refreshGameDetails(gameId: string): Promise<void> {
    const cacheKey = `game:${gameId}`;
    this.cache.del(cacheKey);
    await this.getGameDetails(gameId);
  }

  async refreshTeamDetails(teamId: string): Promise<void> {
    const cacheKey = `team:${teamId}`;
    this.cache.del(cacheKey);
    await this.getTeamDetails(teamId);
  }

  private transformGameData(data: any): ESPNGame {
    const competition = data.competitions[0];
    const homeTeam = competition.competitors.find((c: any) => c.homeAway === 'home').team;
    const awayTeam = competition.competitors.find((c: any) => c.homeAway === 'away').team;

    return {
      id: data.id,
      date: data.date,
      name: data.name,
      shortName: data.shortName,
      season: {
        year: data.season.year,
        type: data.season.type
      },
      week: {
        number: data.week.number
      },
      competitions: data.competitions,
      status: {
        type: {
          id: data.status.type.id,
          name: data.status.type.name,
          state: data.status.type.state,
          completed: data.status.type.completed
        }
      },
      homeTeam,
      awayTeam
    };
  }

  private transformGameDataForGameDetails(game: ESPNGame): GameDetails {
    const competition = game.competitions[0];
    const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
    const awayTeam = competition.competitors.find(c => c.homeAway === 'away');

    if (!homeTeam || !awayTeam) {
      throw new Error('Unable to find home or away team in game data');
    }

    return {
      id: game.id,
      season: game.season.year,
      seasonType: game.season.type.toString(),
      date: game.date,
      homeTeam: {
        id: homeTeam.team.id,
        name: homeTeam.team.name,
        score: homeTeam.score || '0',
        stats: {}
      },
      awayTeam: {
        id: awayTeam.team.id,
        name: awayTeam.team.name,
        score: awayTeam.score || '0',
        stats: {}
      },
      odds: competition.odds?.[0] || { details: '', overUnder: 0, spread: 0 },
      venue: competition.venue?.fullName || '',
      attendance: competition.attendance || 0,
      weather: competition.weather?.displayValue || '',
      officials: competition.officials?.map(o => o.displayName) || []
    };
  }
}
