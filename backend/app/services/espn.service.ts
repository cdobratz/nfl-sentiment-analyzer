import { injectable } from 'tsyringe';
import { Logger } from 'winston';
import axios from 'axios';
import { ESPNTeam, ESPNEvent, ESPNTeamResponse, ESPNEventResponse, GameDetails } from '../types/espn.types';

@injectable()
export class ESPNService {
  private readonly baseUrl = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
  private readonly teamsCache = new Map<string, ESPNTeam>();
  private readonly eventCache = new Map<string, ESPNEvent>();
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Gets all NFL teams
   */
  public async getTeams(): Promise<ESPNTeam[]> {
    try {
      const response = await axios.get<ESPNTeamResponse>(`${this.baseUrl}/teams`);
      const teams = response.data.sports[0].leagues[0].teams
        .map(t => this.transformTeamData(t.team));
      
      teams.forEach(team => {
        this.teamsCache.set(team.id, team);
      });

      return teams;
    } catch (error) {
      this.logger.error('Error fetching teams:', error);
      throw new Error('Failed to fetch teams');
    }
  }

  /**
   * Gets a team by its ID
   */
  public async getTeamById(teamId: string): Promise<ESPNTeam> {
    const cachedTeam = this.teamsCache.get(teamId);
    if (cachedTeam) {
      return cachedTeam;
    }

    try {
      const response = await axios.get<ESPNTeamResponse>(`${this.baseUrl}/teams/${teamId}`);
      const team = this.transformTeamData(response.data.sports[0].leagues[0].teams[0].team);
      this.teamsCache.set(teamId, team);
      return team;
    } catch (error) {
      this.logger.error(`Error fetching team ${teamId}:`, error);
      throw new Error(`Failed to fetch team ${teamId}`);
    }
  }

  /**
   * Gets events for a date range
   */
  public async getEvents(startDate: string, endDate: string): Promise<ESPNEvent[]> {
    try {
      const response = await axios.get<ESPNEventResponse>(`${this.baseUrl}/scoreboard`, {
        params: {
          limit: 100,
          dates: `${startDate}-${endDate}`
        }
      });

      const events = response.data.events;
      events.forEach(event => {
        this.eventCache.set(event.id, event);
      });

      return events;
    } catch (error) {
      this.logger.error('Error fetching events:', error);
      throw new Error('Failed to fetch events');
    }
  }

  /**
   * Gets an event by ID
   */
  public async getEventById(eventId: string): Promise<GameDetails | null> {
    try {
      const cachedEvent = this.eventCache.get(eventId);
      if (cachedEvent) {
        return this.transformToGameDetails(cachedEvent);
      }

      const response = await axios.get<ESPNEventResponse>(`${this.baseUrl}/summary?event=${eventId}`);
      if (!response.data.events?.[0]) {
        return null;
      }

      const event = response.data.events[0];
      this.eventCache.set(event.id, event);
      return this.transformToGameDetails(event);
    } catch (error) {
      this.logger.error(`Error fetching event ${eventId}:`, error);
      throw new Error(`Failed to fetch event ${eventId}`);
    }
  }

  private transformTeamData(team: any): ESPNTeam {
    return {
      id: team.id,
      name: team.name,
      abbreviation: team.abbreviation,
      displayName: team.displayName,
      shortDisplayName: team.shortDisplayName,
      color: team.color,
      alternateColor: team.alternateColor,
      logo: team.logo
    };
  }

  private transformToGameDetails(event: ESPNEvent): GameDetails {
    const competition = event.competitions[0];
    const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
    const awayTeam = competition.competitors.find(c => c.homeAway === 'away');

    if (!homeTeam || !awayTeam) {
      throw new Error('Invalid event data: missing team information');
    }

    return {
      id: event.id,
      date: event.date,
      name: event.name,
      homeTeam: {
        team: homeTeam.team,
        score: homeTeam.score,
        isWinner: homeTeam.winner
      },
      awayTeam: {
        team: awayTeam.team,
        score: awayTeam.score,
        isWinner: awayTeam.winner
      },
      venue: competition.venue ? {
        name: competition.venue.fullName,
        location: `${competition.venue.city}, ${competition.venue.state}`
      } : undefined,
      odds: competition.odds?.[0] ? {
        details: competition.odds[0].details,
        overUnder: competition.odds[0].overUnder
      } : undefined
    };
  }
}
