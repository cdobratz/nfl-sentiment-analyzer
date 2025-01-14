// Basic types
export interface ESPNTeam {
  id: string;
  name: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  color: string;
  alternateColor: string;
  logo: string;
}

// API Response types
export interface ESPNTeamResponse {
  sports: {
    leagues: {
      teams: {
        team: ESPNTeam;
      }[];
    }[];
  }[];
}

export interface ESPNEventResponse {
  events: ESPNEvent[];
}

// Event types
export interface ESPNEvent {
  id: string;
  date: string;
  name: string;
  shortName: string;
  season: {
    year: number;
    type: number;
  };
  competitions: {
    id: string;
    date: string;
    competitors: {
      id: string;
      homeAway: 'home' | 'away';
      winner?: boolean;
      team: ESPNTeam;
      score?: string;
    }[];
    venue?: {
      fullName: string;
      city: string;
      state: string;
    };
    odds?: {
      details: string;
      overUnder: number;
    }[];
  }[];
}

// Simplified game details
export interface GameDetails {
  id: string;
  date: string;
  name: string;
  homeTeam: {
    team: ESPNTeam;
    score?: string;
    isWinner?: boolean;
  };
  awayTeam: {
    team: ESPNTeam;
    score?: string;
    isWinner?: boolean;
  };
  venue?: {
    name: string;
    location: string;
  };
  odds?: {
    details: string;
    overUnder: number;
  };
}
