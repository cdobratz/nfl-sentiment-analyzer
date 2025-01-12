export interface InjuryReport {
  team: {
    id: string;
    name: string;
    abbreviation: string;
  };
  injuries: Array<{
    status: string;
    date: string;
    athlete: {
      id: string;
      fullName: string;
      position: string;
    };
    type: {
      id: string;
      name: string;
      description: string;
    };
  }>;
}
