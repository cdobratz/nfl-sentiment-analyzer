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

export interface ESPNCompetitor {
  team: ESPNTeam;
  score: string;
  homeAway: string;
}

export interface ESPNVenue {
  id: string;
  fullName: string;
  address: {
    city: string;
    state: string;
  };
  capacity: number;
  indoor: boolean;
}

export interface ESPNOdds {
  details: string;
  overUnder: number;
  spread: number;
}

export interface ESPNWeather {
  displayValue: string;
  temperature: number;
  conditionId: string;
}

export interface ESPNOfficial {
  displayName: string;
  position: string;
}

export interface ESPNStatusType {
  id: string;
  name: string;
  state: string;
  completed: boolean;
}

export interface ESPNCompetition {
  id: string;
  competitors: ESPNCompetitor[];
  venue: ESPNVenue;
  attendance: number;
  weather: ESPNWeather;
  officials: ESPNOfficial[];
  odds: ESPNOdds[];
  status: {
    type: ESPNStatusType;
  };
}

export interface ESPNGame {
  id: string;
  date: string;
  name: string;
  shortName: string;
  season: {
    year: number;
    type: number;
  };
  week: {
    number: number;
  };
  competitions: ESPNCompetition[];
  status: {
    type: ESPNStatusType;
  };
  homeTeam: ESPNTeam;
  awayTeam: ESPNTeam;
}

export interface InjuryReport {
  team: ESPNTeam;
  players: {
    id: string;
    fullName: string;
    position: string;
    status: string;
    injury: {
      type: string;
      details: string;
    };
  }[];
}

export interface GameDetails {
  id: string;
  season: number;
  seasonType: string;
  date: string;
  homeTeam: {
    id: string;
    name: string;
    score: string;
    stats: any;
  };
  awayTeam: {
    id: string;
    name: string;
    score: string;
    stats: any;
  };
  odds: ESPNOdds;
  venue: string;
  attendance: number;
  weather: string;
  officials: string[];
}

export interface ESPNNewsArticle {
  headline: string;
  description: string;
  published: string;
  links: {
    web: {
      href: string;
    };
  };
}
