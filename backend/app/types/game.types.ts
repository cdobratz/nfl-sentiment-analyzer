import { Tweet } from './twitter.types';

export interface TeamData {
  id: string;
  name: string;
  score: string;
  stats: any;
}

export interface GameData {
  id: string;
  season: number;
  seasonType: string;
  date: string;
  homeTeam: TeamData;
  awayTeam: TeamData;
  odds: {
    details: string;
    overUnder: number;
    spread: number;
  };
  tweets: Tweet[];
  analystOpinions: Tweet[];
  gameDetails: {
    venue?: string;
    attendance?: number;
    weather?: string;
    officials?: string[];
  };
}
