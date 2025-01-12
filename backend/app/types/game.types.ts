export interface GameData {
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
