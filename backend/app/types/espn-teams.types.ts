export interface ESPNTeamResponse {
  sports: Array<{
    id: string;
    uid: string;
    name: string;
    slug: string;
    leagues: Array<{
      id: string;
      uid: string;
      name: string;
      abbreviation: string;
      shortName: string;
      slug: string;
      teams: Array<{
        team: ESPNTeamDetails;
      }>;
    }>;
  }>;
}

export interface ESPNTeamDetails {
  id: string;
  uid: string;
  slug: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  name: string;
  nickname: string;
  location: string;
  color: string;
  alternateColor: string;
  isActive: boolean;
  isAllStar: boolean;
  logos: Array<{
    href: string;
    alt: string;
    rel: string[];
    width: number;
    height: number;
  }>;
  links: Array<{
    language: string;
    rel: string[];
    href: string;
    text: string;
    shortText: string;
    isExternal: boolean;
    isPremium: boolean;
    isHidden: boolean;
  }>;
}
