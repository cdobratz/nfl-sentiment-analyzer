import { describe, it, beforeEach, jest, expect } from '@jest/globals';
import { ESPNService } from '../../app/services/espn.service';
import { Logger } from 'winston';
import type { LeveledLogMethod } from 'winston';
import axios from 'axios';
import { ESPNEvent, ESPNEventResponse } from '../../app/types/espn-events.types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ESPNService - Events', () => {
  let service: ESPNService;
  let mockLogger: Partial<Logger>;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn() as unknown as LeveledLogMethod,
      info: jest.fn() as unknown as LeveledLogMethod,
      debug: jest.fn() as unknown as LeveledLogMethod,
      warn: jest.fn() as unknown as LeveledLogMethod
    };

    service = new ESPNService(mockLogger as Logger);
  });

  describe('getEvents', () => {
    it('should fetch events successfully', async () => {
      const mockEvent: ESPNEvent = {
        id: '401671878',
        uid: 's:20~l:28~e:401671878',
        date: '2025-01-11T21:30Z',
        name: 'Los Angeles Chargers at Houston Texans',
        shortName: 'LAC @ HOU',
        season: {
          year: 2024,
          type: 3,
          slug: 'post-season'
        },
        week: {
          number: 1
        },
        competitions: [{
          id: '401671878',
          uid: 's:20~l:28~e:401671878~c:401671878',
          date: '2025-01-11T21:30Z',
          startDate: '2025-01-11T21:30Z',
          attendance: 71408,
          type: {
            id: '1',
            abbreviation: 'STD'
          },
          timeValid: true,
          neutralSite: false,
          conferenceCompetition: false,
          playByPlayAvailable: true,
          recent: false,
          venue: {
            id: '3891',
            fullName: 'NRG Stadium',
            address: {
              city: 'Houston',
              state: 'TX'
            },
            indoor: true
          },
          competitors: [],
          status: {
            clock: 0,
            displayClock: '0:00',
            period: 4,
            type: {
              id: '3',
              name: 'STATUS_FINAL',
              state: 'post',
              completed: true,
              description: 'Final',
              detail: 'Final',
              shortDetail: 'Final'
            }
          }
        }],
        status: {
          clock: 0,
          displayClock: '0:00',
          period: 4,
          type: {
            id: '3',
            name: 'STATUS_FINAL',
            state: 'post',
            completed: true,
            description: 'Final',
            detail: 'Final',
            shortDetail: 'Final'
          }
        },
        links: []
      };

      const mockResponse: ESPNEventResponse = {
        leagues: [],
        season: {
          type: 3,
          year: 2024
        },
        week: {
          number: 1
        },
        events: [mockEvent]
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const events = await service.getEvents();

      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('401671878');
      expect(events[0].name).toBe('Los Angeles Chargers at Houston Texans');
      expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/scoreboard'));
    });

    it('should handle errors when fetching events', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      await expect(service.getEvents()).rejects.toThrow('Failed to fetch NFL events');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getEventById', () => {
    it('should fetch event by ID successfully', async () => {
      const mockEvent: ESPNEvent = {
        id: '401671878',
        uid: 's:20~l:28~e:401671878',
        date: '2025-01-11T21:30Z',
        name: 'Los Angeles Chargers at Houston Texans',
        shortName: 'LAC @ HOU',
        season: {
          year: 2024,
          type: 3,
          slug: 'post-season'
        },
        week: {
          number: 1
        },
        competitions: [{
          id: '401671878',
          uid: 's:20~l:28~e:401671878~c:401671878',
          date: '2025-01-11T21:30Z',
          startDate: '2025-01-11T21:30Z',
          attendance: 71408,
          type: {
            id: '1',
            abbreviation: 'STD'
          },
          timeValid: true,
          neutralSite: false,
          conferenceCompetition: false,
          playByPlayAvailable: true,
          recent: false,
          venue: {
            id: '3891',
            fullName: 'NRG Stadium',
            address: {
              city: 'Houston',
              state: 'TX'
            },
            indoor: true
          },
          competitors: [],
          status: {
            clock: 0,
            displayClock: '0:00',
            period: 4,
            type: {
              id: '3',
              name: 'STATUS_FINAL',
              state: 'post',
              completed: true,
              description: 'Final',
              detail: 'Final',
              shortDetail: 'Final'
            }
          }
        }],
        status: {
          clock: 0,
          displayClock: '0:00',
          period: 4,
          type: {
            id: '3',
            name: 'STATUS_FINAL',
            state: 'post',
            completed: true,
            description: 'Final',
            detail: 'Final',
            shortDetail: 'Final'
          }
        },
        links: []
      };

      const mockResponse: ESPNEventResponse = {
        leagues: [],
        season: {
          type: 3,
          year: 2024
        },
        week: {
          number: 1
        },
        events: [mockEvent]
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const event = await service.getEventById('401671878');

      expect(event.id).toBe('401671878');
      expect(event.name).toBe('Los Angeles Chargers at Houston Texans');
      expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/scoreboard/401671878'));
    });

    it('should return cached event if available', async () => {
      const mockEvent: ESPNEvent = {
        id: '401671878',
        uid: 's:20~l:28~e:401671878',
        date: '2025-01-11T21:30Z',
        name: 'Los Angeles Chargers at Houston Texans',
        shortName: 'LAC @ HOU',
        season: {
          year: 2024,
          type: 3,
          slug: 'post-season'
        },
        week: {
          number: 1
        },
        competitions: [],
        status: {
          clock: 0,
          displayClock: '0:00',
          period: 4,
          type: {
            id: '3',
            name: 'STATUS_FINAL',
            state: 'post',
            completed: true,
            description: 'Final',
            detail: 'Final',
            shortDetail: 'Final'
          }
        },
        links: []
      };

      const mockResponse: ESPNEventResponse = {
        leagues: [],
        season: {
          type: 3,
          year: 2024
        },
        week: {
          number: 1
        },
        events: [mockEvent]
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      // First call to populate cache
      await service.getEventById('401671878');

      // Second call should use cache
      const event = await service.getEventById('401671878');

      expect(event.id).toBe('401671878');
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle errors when fetching event by ID', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      await expect(service.getEventById('401671878')).rejects.toThrow('Failed to fetch event 401671878');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getCurrentSeasonAndWeek', () => {
    it('should fetch current season and week successfully', async () => {
      const mockResponse: ESPNEventResponse = {
        leagues: [],
        season: {
          type: 3,
          year: 2024
        },
        week: {
          number: 1
        },
        events: []
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await service.getCurrentSeasonAndWeek();

      expect(result).toEqual({
        season: 2024,
        week: 1,
        type: 3
      });
      expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/scoreboard'));
    });

    it('should handle errors when fetching season and week', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      await expect(service.getCurrentSeasonAndWeek()).rejects.toThrow('Failed to fetch current season and week information');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
