// Map of NBA Team IDs to Logo URLs and Primary Colors
// Logos from NBA CDN: https://cdn.nba.com/logos/nba/{teamId}/primary/L/logo.svg

export interface TeamBranding {
  id: number;
  triCode: string;
  name: string;
  logo: string;
  color: string;
}

export const NBA_TEAMS: Record<string, TeamBranding> = {
  // Hawks
  "1610612737": { id: 1610612737, triCode: "ATL", name: "Atlanta Hawks", logo: "https://cdn.nba.com/logos/nba/1610612737/primary/L/logo.svg", color: "#E03A3E" },
  // Celtics
  "1610612738": { id: 1610612738, triCode: "BOS", name: "Boston Celtics", logo: "https://cdn.nba.com/logos/nba/1610612738/primary/L/logo.svg", color: "#007A33" },
  // Nets
  "1610612751": { id: 1610612751, triCode: "BKN", name: "Brooklyn Nets", logo: "https://cdn.nba.com/logos/nba/1610612751/primary/L/logo.svg", color: "#000000" },
  // Hornets
  "1610612766": { id: 1610612766, triCode: "CHA", name: "Charlotte Hornets", logo: "https://cdn.nba.com/logos/nba/1610612766/primary/L/logo.svg", color: "#1D1160" },
  // Bulls
  "1610612741": { id: 1610612741, triCode: "CHI", name: "Chicago Bulls", logo: "https://cdn.nba.com/logos/nba/1610612741/primary/L/logo.svg", color: "#CE1141" },
  // Cavaliers
  "1610612739": { id: 1610612739, triCode: "CLE", name: "Cleveland Cavaliers", logo: "https://cdn.nba.com/logos/nba/1610612739/primary/L/logo.svg", color: "#860038" },
  // Mavericks
  "1610612742": { id: 1610612742, triCode: "DAL", name: "Dallas Mavericks", logo: "https://cdn.nba.com/logos/nba/1610612742/primary/L/logo.svg", color: "#00538C" },
  // Nuggets
  "1610612743": { id: 1610612743, triCode: "DEN", name: "Denver Nuggets", logo: "https://cdn.nba.com/logos/nba/1610612743/primary/L/logo.svg", color: "#0E2240" },
  // Pistons
  "1610612765": { id: 1610612765, triCode: "DET", name: "Detroit Pistons", logo: "https://cdn.nba.com/logos/nba/1610612765/primary/L/logo.svg", color: "#C8102E" },
  // Warriors
  "1610612744": { id: 1610612744, triCode: "GSW", name: "Golden State Warriors", logo: "https://cdn.nba.com/logos/nba/1610612744/primary/L/logo.svg", color: "#1D428A" },
  // Rockets
  "1610612745": { id: 1610612745, triCode: "HOU", name: "Houston Rockets", logo: "https://cdn.nba.com/logos/nba/1610612745/primary/L/logo.svg", color: "#CE1141" },
  // Pacers
  "1610612754": { id: 1610612754, triCode: "IND", name: "Indiana Pacers", logo: "https://cdn.nba.com/logos/nba/1610612754/primary/L/logo.svg", color: "#002D62" },
  // Clippers
  "1610612746": { id: 1610612746, triCode: "LAC", name: "LA Clippers", logo: "https://cdn.nba.com/logos/nba/1610612746/primary/L/logo.svg", color: "#C8102E" },
  // Lakers
  "1610612747": { id: 1610612747, triCode: "LAL", name: "Los Angeles Lakers", logo: "https://cdn.nba.com/logos/nba/1610612747/primary/L/logo.svg", color: "#552583" },
  // Grizzlies
  "1610612763": { id: 1610612763, triCode: "MEM", name: "Memphis Grizzlies", logo: "https://cdn.nba.com/logos/nba/1610612763/primary/L/logo.svg", color: "#5D76A9" },
  // Heat
  "1610612748": { id: 1610612748, triCode: "MIA", name: "Miami Heat", logo: "https://cdn.nba.com/logos/nba/1610612748/primary/L/logo.svg", color: "#98002E" },
  // Bucks
  "1610612749": { id: 1610612749, triCode: "MIL", name: "Milwaukee Bucks", logo: "https://cdn.nba.com/logos/nba/1610612749/primary/L/logo.svg", color: "#00471B" },
  // Timberwolves
  "1610612750": { id: 1610612750, triCode: "MIN", name: "Minnesota Timberwolves", logo: "https://cdn.nba.com/logos/nba/1610612750/primary/L/logo.svg", color: "#0C2340" },
  // Pelicans
  "1610612740": { id: 1610612740, triCode: "NOP", name: "New Orleans Pelicans", logo: "https://cdn.nba.com/logos/nba/1610612740/primary/L/logo.svg", color: "#0C2340" },
  // Knicks
  "1610612752": { id: 1610612752, triCode: "NYK", name: "New York Knicks", logo: "https://cdn.nba.com/logos/nba/1610612752/primary/L/logo.svg", color: "#006BB6" },
  // Thunder
  "1610612760": { id: 1610612760, triCode: "OKC", name: "Oklahoma City Thunder", logo: "https://cdn.nba.com/logos/nba/1610612760/primary/L/logo.svg", color: "#007AC1" },
  // Magic
  "1610612753": { id: 1610612753, triCode: "ORL", name: "Orlando Magic", logo: "https://cdn.nba.com/logos/nba/1610612753/primary/L/logo.svg", color: "#0077C0" },
  // 76ers
  "1610612755": { id: 1610612755, triCode: "PHI", name: "Philadelphia 76ers", logo: "https://cdn.nba.com/logos/nba/1610612755/primary/L/logo.svg", color: "#006BB6" },
  // Suns
  "1610612756": { id: 1610612756, triCode: "PHX", name: "Phoenix Suns", logo: "https://cdn.nba.com/logos/nba/1610612756/primary/L/logo.svg", color: "#1D1160" },
  // Trail Blazers
  "1610612757": { id: 1610612757, triCode: "POR", name: "Portland Trail Blazers", logo: "https://cdn.nba.com/logos/nba/1610612757/primary/L/logo.svg", color: "#E03A3E" },
  // Kings
  "1610612758": { id: 1610612758, triCode: "SAC", name: "Sacramento Kings", logo: "https://cdn.nba.com/logos/nba/1610612758/primary/L/logo.svg", color: "#5A2D81" },
  // Spurs
  "1610612759": { id: 1610612759, triCode: "SAS", name: "San Antonio Spurs", logo: "https://cdn.nba.com/logos/nba/1610612759/primary/L/logo.svg", color: "#C4CED4" },
  // Raptors
  "1610612761": { id: 1610612761, triCode: "TOR", name: "Toronto Raptors", logo: "https://cdn.nba.com/logos/nba/1610612761/primary/L/logo.svg", color: "#CE1141" },
  // Jazz
  "1610612762": { id: 1610612762, triCode: "UTA", name: "Utah Jazz", logo: "https://cdn.nba.com/logos/nba/1610612762/primary/L/logo.svg", color: "#002B5C" },
  // Wizards
  "1610612764": { id: 1610612764, triCode: "WAS", name: "Washington Wizards", logo: "https://cdn.nba.com/logos/nba/1610612764/primary/L/logo.svg", color: "#002B5C" }
};

export const getTeam = (id: number | string): TeamBranding | undefined => {
  return NBA_TEAMS[String(id)];
};
