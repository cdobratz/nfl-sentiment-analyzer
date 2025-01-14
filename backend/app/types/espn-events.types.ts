import { ESPNTeam } from './espn.types';

export interface ESPNLeague {
  id: string;
  uid: string;
  name: string;
  abbreviation: string;
  slug: string;
  season: ESPNSeason;
  logos: ESPNLogo[];
  calendar: ESPNCalendarSection[];
}

export interface ESPNSeason {
  year: number;
  startDate: string;
  endDate: string;
  displayName: string;
  type?: {
    id: string;
    type: number;
    name: string;
    abbreviation: string;
  };
}

export interface ESPNLogo {
  href: string;
  width: number;
  height: number;
  alt: string;
  rel: string[];
  lastUpdated?: string;
}

export interface ESPNCalendarSection {
  label: string;
  value: string;
  startDate: string;
  endDate: string;
  entries: ESPNCalendarEntry[];
}

export interface ESPNCalendarEntry {
  label: string;
  alternateLabel: string;
  detail: string;
  value: string;
  startDate: string;
  endDate: string;
}

export interface ESPNEventResponse {
  leagues: ESPNLeague[];
  season: {
    type: number;
    year: number;
  };
  week: {
    number: number;
  };
  events: ESPNEvent[];
}

export interface ESPNEvent {
  id: string;
  uid: string;
  date: string;
  name: string;
  shortName: string;
  season: {
    year: number;
    type: number;
    slug: string;
  };
  week: {
    number: number;
  };
  competitions: ESPNCompetition[];
  links: ESPNEventLink[];
  status: ESPNEventStatus;
}

export interface ESPNEventLink {
  language: string;
  rel: string[];
  href: string;
  text: string;
  shortText: string;
  isExternal: boolean;
  isPremium: boolean;
}

export interface ESPNEventStatus {
  clock: number;
  displayClock: string;
  period: number;
  type: {
    id: string;
    name: string;
    state: string;
    completed: boolean;
    description: string;
    detail: string;
    shortDetail: string;
  };
}

export interface ESPNCompetition {
  id: string;
  uid: string;
  date: string;
  attendance?: number;
  type: {
    id: string;
    abbreviation: string;
  };
  timeValid: boolean;
  neutralSite: boolean;
  conferenceCompetition: boolean;
  playByPlayAvailable: boolean;
  recent: boolean;
  venue: ESPNVenue;
  competitors: ESPNCompetitor[];
  notes?: ESPNNote[];
  status: ESPNEventStatus;
  broadcasts?: ESPNBroadcast[];
  leaders?: ESPNLeader[];
  format?: {
    regulation: {
      periods: number;
    };
  };
  startDate: string;
  geoBroadcasts?: ESPNGeoBroadcast[];
  headlines?: ESPNHeadline[];
  officials?: ESPNOfficial[];
  odds?: ESPNOdds[];
}

export interface ESPNVenue {
  id: string;
  fullName: string;
  address: {
    city: string;
    state: string;
  };
  indoor: boolean;
  capacity?: number;
}

export interface ESPNCompetitor {
  id: string;
  uid: string;
  type: string;
  order: number;
  homeAway: string;
  winner?: boolean;
  team: ESPNTeam;
  score?: string;
  linescores?: { value: number }[];
  statistics: any[];
  records: ESPNRecord[];
}

export interface ESPNRecord {
  name: string;
  abbreviation?: string;
  type: string;
  summary: string;
}

export interface ESPNNote {
  type: string;
  headline: string;
}

export interface ESPNBroadcast {
  market: string;
  names: string[];
}

export interface ESPNLeader {
  name: string;
  displayName: string;
  shortDisplayName: string;
  abbreviation: string;
  leaders: ESPNLeaderItem[];
}

export interface ESPNLeaderItem {
  displayValue: string;
  value: number;
  athlete: ESPNAthlete;
  team: {
    id: string;
  };
}

export interface ESPNAthlete {
  id: string;
  fullName: string;
  displayName: string;
  shortName: string;
  links: ESPNEventLink[];
  headshot: string;
  jersey: string;
  position: {
    abbreviation: string;
  };
  team: {
    id: string;
  };
  active: boolean;
}

export interface ESPNGeoBroadcast {
  type: {
    id: string;
    shortName: string;
  };
  market: {
    id: string;
    type: string;
  };
  media: {
    shortName: string;
  };
  lang: string;
  region: string;
}

export interface ESPNHeadline {
  type: string;
  description: string;
  shortLinkText?: string;
}

export interface ESPNOfficial {
  id: string;
  name: string;
  role: string;
  experience?: number;
}

export interface ESPNOdds {
  provider: {
    id: string;
    name: string;
  };
  details: string;
  overUnder: number;
  spread: number;
  overOdds: number;
  underOdds: number;
  spreadOdds: number;
}
