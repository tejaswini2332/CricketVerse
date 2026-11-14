export type PlayerRole = "Batsman" | "Bowler" | "All-Rounder" | "Wicketkeeper";
export type PlayerRarity = "Legendary" | "Epic" | "Rare" | "Uncommon" | "Common";

export interface PlayerStats {
  runs: number;
  fours: number;
  sixes: number;
  wickets: number;
  catches: number;
}

export interface PointsBreakdown {
  runPts: number;
  fourPts: number;
  sixPts: number;
  wicketPts: number;
  catchPts: number;
  milestonePts: number;
  runs: number;
  fours: number;
  sixes: number;
  wickets: number;
  catches: number;
}

export interface Player {
  id: number;
  name: string;
  country?: string;
  team: string;
  role: PlayerRole;
  rarity: PlayerRarity;
  multiplier: number;
  creditCost: number;
  priceCRIC: number;
  matches: number;
  runs: number;
  wickets: number;
  strikeRate: number;
  economy: number;
  avatar: string;
  debutYear?: number;
  dpi?: number;
  stats?: PlayerStats;
  calculatedPoints?: number;
  basePoints?: number;
  breakdown?: PointsBreakdown;
  isLiveMatchPlayer?: boolean;
  liveMatchId?: number;
}

export interface LiveCompetitor {
  name: string;
  shortName: string;
  score: string;
  logo?: string;
  winner?: boolean;
}

export interface LiveMatch {
  id: number;
  leagueId: string;
  leagueName: string;
  teams: string;
  shortName: string;
  status: string;
  state: "in" | "pre" | "post";
  venue: string;
  eventType: string;
  summaryText: string;
  competitors: LiveCompetitor[];
  lastUpdated: string;
}

export interface AuctionItem {
  id: string;
  cardId: number;
  player: Player;
  seller: string;
  priceCRIC: number;
  createdAt: string;
  isTicket?: boolean;
  ticketId?: number;
}

export interface Ticket {
  id: string;
  tokenId: number;
  matchId: number;
  matchName: string;
  venue: string;
  stand: string;
  seat: string;
  faceValue: number;
  maxResalePrice: number;
  startTime: string;
  endTime: string;
  owner: string;
  status: "LIVE" | "UPCOMING" | "PAST";
  used?: boolean;
  nonce?: number;
  redeemedAt?: number;
  redeemedBy?: string;
}

export interface PollOption {
  text: string;
  votes: number;
}

export interface Poll {
  id: number;
  question: string;
  options: PollOption[];
  closeTime: string;
  totalVotes: number;
  creator: string;
  userVotedIndex?: number;
}

export interface TournamentEntry {
  rank: number;
  address: string;
  squadCommitment: string;
  points: number;
  payout: number;
}

export interface Tournament {
  id: number;
  name: string;
  matchId: number;
  entryFee: number;
  maxEntries: number;
  lockTime: string;
  poolCRIC: number;
  status: "OPEN" | "LOCKED" | "SETTLED";
  entriesCount: number;
  entries?: TournamentEntry[];
}

export interface DeliveryOutcome {
  type: string;
  runs: number;
  fours: number;
  sixes: number;
  wicket: number;
  text: string;
}

export interface OverSimulationResult {
  event: string;
  deliveries: string[];
  batter: {
    id: number;
    name: string;
    stats: PlayerStats;
    points: number;
  };
  bowler: {
    id: number;
    name: string;
    stats: PlayerStats;
    points: number;
  };
  timestamp: string;
}

export interface ToastMessage {
  id: string;
  text: string;
  isError?: boolean;
}

export interface PendingTx {
  type: "MINT_CARD" | "BUY_AUCTION" | "BUY_TICKET" | "ENTER_TOURNAMENT" | "CLAIM_FAUCET" | "CLAIM_ETH";
  title: string;
  description: string;
  amountCRIC: number;
  recipientAddress: string;
  itemImage?: string;
  details?: Record<string, string | number>;
  onConfirm: () => Promise<void>;
  onCancel?: () => void;
}
