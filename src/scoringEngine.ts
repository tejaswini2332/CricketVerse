import { Player, PlayerRarity, PlayerRole, PlayerStats, PointsBreakdown } from "./types";

export const RARITY_MULTIPLIERS: Record<PlayerRarity, number> = {
  Common: 1.0,
  Uncommon: 1.1,
  Rare: 1.25,
  Epic: 1.5,
  Legendary: 2.0,
};

export const SCORING_RULES = {
  RUN_POINT: 1,
  FOUR_BONUS: 1,
  SIX_BONUS: 2,
  WICKET_POINT: 20,
  CATCH_POINT: 8,
  HALF_CENTURY_BONUS: 10,
  CENTURY_BONUS: 25,
};

export function calculatePlayerPoints(
  perf: Partial<PlayerStats>,
  rarity: PlayerRarity = "Common"
): { basePoints: number; multiplier: number; finalPoints: number; breakdown: PointsBreakdown } {
  const runs = Number(perf.runs || 0);
  const fours = Number(perf.fours || 0);
  const sixes = Number(perf.sixes || 0);
  const wickets = Number(perf.wickets || 0);
  const catches = Number(perf.catches || 0);

  const runPts = runs * SCORING_RULES.RUN_POINT;
  const fourPts = fours * SCORING_RULES.FOUR_BONUS;
  const sixPts = sixes * SCORING_RULES.SIX_BONUS;
  const wicketPts = wickets * SCORING_RULES.WICKET_POINT;
  const catchPts = catches * SCORING_RULES.CATCH_POINT;

  let milestonePts = 0;
  if (runs >= 100) {
    milestonePts = SCORING_RULES.CENTURY_BONUS;
  } else if (runs >= 50) {
    milestonePts = SCORING_RULES.HALF_CENTURY_BONUS;
  }

  const basePoints = runPts + fourPts + sixPts + wicketPts + catchPts + milestonePts;
  const multiplier = RARITY_MULTIPLIERS[rarity] || 1.0;
  const finalPoints = Math.round(basePoints * multiplier * 10) / 10;

  return {
    basePoints,
    multiplier,
    finalPoints,
    breakdown: {
      runPts,
      fourPts,
      sixPts,
      wicketPts,
      catchPts,
      milestonePts,
      runs,
      fours,
      sixes,
      wickets,
      catches,
    },
  };
}

export function validateSquad(
  selectedPlayerIds: number[],
  allPlayers: Player[]
): {
  isValid: boolean;
  error?: string;
  totalCredits: number;
  roleCounts?: Record<PlayerRole, number>;
} {
  if (!Array.isArray(selectedPlayerIds) || selectedPlayerIds.length !== 11) {
    return {
      isValid: false,
      error: `Squad must contain exactly 11 players. Current: ${selectedPlayerIds?.length || 0}`,
      totalCredits: 0,
    };
  }

  if (new Set(selectedPlayerIds).size !== 11) {
    return { isValid: false, error: "Squad cannot contain duplicate players.", totalCredits: 0 };
  }

  const idMap = new Map<number, Player>(allPlayers.map((p) => [p.id, p]));
  const squad = selectedPlayerIds.map((id) => idMap.get(id)).filter((p): p is Player => Boolean(p));

  if (squad.length !== 11) {
    return { isValid: false, error: "One or more selected players not found in registry", totalCredits: 0 };
  }

  const totalCredits = Number(squad.reduce((acc, p) => acc + (p.creditCost || 8.5), 0).toFixed(1));
  if (totalCredits > 120) {
    return {
      isValid: false,
      error: `Salary cap exceeded! Max allowed: 120 credits, squad uses ${totalCredits} credits`,
      totalCredits,
    };
  }

  const roleCounts: Record<PlayerRole, number> = {
    Batsman: 0,
    Bowler: 0,
    "All-Rounder": 0,
    Wicketkeeper: 0,
  };

  squad.forEach((p) => {
    roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;
  });

  if ((roleCounts["Wicketkeeper"] || 0) < 1) {
    return { isValid: false, error: "Squad must contain at least 1 Wicketkeeper", totalCredits, roleCounts };
  }
  if ((roleCounts["Batsman"] || 0) < 3) {
    return { isValid: false, error: "Squad must contain at least 3 Batsmen", totalCredits, roleCounts };
  }
  if ((roleCounts["Bowler"] || 0) < 3) {
    return { isValid: false, error: "Squad must contain at least 3 Bowlers", totalCredits, roleCounts };
  }
  if ((roleCounts["All-Rounder"] || 0) < 1) {
    return { isValid: false, error: "Squad must contain at least 1 All-Rounder", totalCredits, roleCounts };
  }

  return {
    isValid: true,
    totalCredits,
    roleCounts,
  };
}

export function calculateDynamicRarity(player: Partial<Player>): {
  rarity: PlayerRarity;
  dpi: number;
} {
  const matches = Math.max(1, Number(player.matches || 0));
  const runs = Number(player.runs || 0);
  const wickets = Number(player.wickets || 0);
  const strikeRate = Number(player.strikeRate || 0);
  const economy = Number(player.economy || 0);
  const role = player.role || "Batsman";

  const runsPerMatch = runs / matches;
  const wicketsPerMatch = wickets / matches;

  let score = 0;
  if (role === "Batsman") {
    score = runsPerMatch * 1.5 + (strikeRate - 100) * 0.5;
  } else if (role === "Bowler") {
    score = wicketsPerMatch * 30 + Math.max(0, 10 - economy) * 5;
  } else if (role === "All-Rounder") {
    score = runsPerMatch * 1.0 + wicketsPerMatch * 20 + Math.max(0, 10 - economy) * 3;
  } else if (role === "Wicketkeeper") {
    score = runsPerMatch * 1.4 + (strikeRate - 100) * 0.4;
  }

  const dpi = Math.min(100, Math.max(20, Math.round(score)));

  let rarity: PlayerRarity = "Common";
  if (dpi >= 85) rarity = "Legendary";
  else if (dpi >= 70) rarity = "Epic";
  else if (dpi >= 55) rarity = "Rare";
  else if (dpi >= 40) rarity = "Uncommon";

  return { rarity, dpi };
}

export function generateSvgAvatar(player: Partial<Player>): string {
  const id = player.id || 1;
  const name = player.name || "Cricketer";
  const role = player.role || "Batsman";
  const rarity = player.rarity || "Common";

  const parts = name.split(" ");
  const initials = parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();

  const roleColors: Record<PlayerRole, { bg1: string; bg2: string; accent: string; badge: string }> = {
    Batsman: { bg1: "#1e1b4b", bg2: "#312e81", accent: "#f59e0b", badge: "#ef4444" },
    Bowler: { bg1: "#082f49", bg2: "#075985", accent: "#38bdf8", badge: "#0284c7" },
    "All-Rounder": { bg1: "#064e3b", bg2: "#047857", accent: "#34d399", badge: "#10b981" },
    Wicketkeeper: { bg1: "#3b0764", bg2: "#6b21a8", accent: "#c084fc", badge: "#8b5cf6" },
  };
  const palette = roleColors[role] || roleColors["Batsman"];

  const tierColors: Record<PlayerRarity, string> = {
    Legendary: "#f59e0b",
    Epic: "#a855f7",
    Rare: "#3b82f6",
    Uncommon: "#10b981",
    Common: "#94a3b8",
  };
  const borderColor = tierColors[rarity] || "#94a3b8";

  return `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="100%" height="100%">
      <defs>
        <linearGradient id="bg_${id}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette.bg1}" />
          <stop offset="100%" stop-color="${palette.bg2}" />
        </linearGradient>
        <linearGradient id="jersey_${id}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#1e293b" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>
      </defs>
      <rect width="320" height="320" rx="16" fill="url(#bg_${id})" />
      <circle cx="160" cy="160" r="130" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2" />
      <circle cx="160" cy="160" r="95" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1.5" stroke-dasharray="4 4" />
      <path d="M 45 320 C 60 235, 110 215, 160 215 C 210 215, 260 235, 275 320 Z" fill="url(#jersey_${id})" stroke="${borderColor}" stroke-width="2" />
      <path d="M 125 215 L 160 255 L 195 215" fill="none" stroke="${palette.accent}" stroke-width="3" stroke-linecap="round" />
      <circle cx="160" cy="140" r="52" fill="#0f172a" stroke="${borderColor}" stroke-width="2" />
      <path d="M 115 130 C 115 92, 205 92, 205 130 C 205 140, 115 140, 115 130 Z" fill="${palette.bg2}" opacity="0.9" />
      <path d="M 108 130 Q 160 116 212 130" fill="none" stroke="${palette.accent}" stroke-width="3.5" stroke-linecap="round" />
      <circle cx="160" cy="150" r="30" fill="#1e293b" stroke="${palette.accent}" stroke-width="2" />
      <text x="160" y="159" fill="#f8fafc" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="900" text-anchor="middle" letter-spacing="1">${initials}</text>
      <rect x="202" y="18" width="100" height="24" rx="12" fill="${palette.badge}" />
      <text x="252" y="34" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="800" text-anchor="middle" letter-spacing="0.5">${role.toUpperCase()}</text>
      <text x="24" y="38" fill="rgba(255,255,255,0.4)" font-family="monospace" font-size="14" font-weight="700">#${id}</text>
    </svg>
  `)}`;
}

export function generateDynamicCardSvg(player: Player): string {
  let border = "#94A3B8";
  let primary = "#64748B";
  let glow = "rgba(100, 116, 139, 0.35)";

  if (player.rarity === "Legendary") {
    border = "#FBBF24"; primary = "#F59E0B"; glow = "rgba(245, 158, 11, 0.45)";
  } else if (player.rarity === "Epic") {
    border = "#A78BFA"; primary = "#8B5CF6"; glow = "rgba(139, 92, 246, 0.45)";
  } else if (player.rarity === "Rare") {
    border = "#38BDF8"; primary = "#0EA5E9"; glow = "rgba(14, 165, 233, 0.45)";
  } else if (player.rarity === "Uncommon") {
    border = "#34D399"; primary = "#10B981"; glow = "rgba(16, 185, 129, 0.45)";
  }

  let badges = "";
  if (player.runs >= 100) {
    badges += '<rect x="24" y="380" width="105" height="24" rx="12" fill="#FEF08A" stroke="#CA8A04" stroke-width="1.5"/><text x="76" y="396" fill="#854D0E" font-size="11" font-weight="bold" font-family="Arial, sans-serif" text-anchor="middle">CENTURION 100+</text>';
  } else if (player.runs >= 50) {
    badges += '<rect x="24" y="380" width="95" height="24" rx="12" fill="#FEF9C3" stroke="#EAB308" stroke-width="1.5"/><text x="71" y="396" fill="#A16207" font-size="11" font-weight="bold" font-family="Arial, sans-serif" text-anchor="middle">HALF-TON 50+</text>';
  }

  if (player.wickets >= 5) {
    badges += '<rect x="135" y="380" width="115" height="24" rx="12" fill="#FEE2E2" stroke="#DC2626" stroke-width="1.5"/><text x="192" y="396" fill="#991B1B" font-size="11" font-weight="bold" font-family="Arial, sans-serif" text-anchor="middle">5-WKT HAUL</text>';
  } else if (player.wickets >= 3) {
    badges += '<rect x="135" y="380" width="105" height="24" rx="12" fill="#FFEDD5" stroke="#EA580C" stroke-width="1.5"/><text x="187" y="396" fill="#9A3412" font-size="11" font-weight="bold" font-family="Arial, sans-serif" text-anchor="middle">3-WKT CRUSH</text>';
  }

  if (player.strikeRate >= 140) {
    badges += '<rect x="24" y="412" width="110" height="22" rx="11" fill="#E0E7FF" stroke="#4F46E5" stroke-width="1"/><text x="79" y="427" fill="#3730A3" font-size="10" font-weight="bold" font-family="Arial, sans-serif" text-anchor="middle">STRIKE MASTER</text>';
  }

  if (player.economy > 0 && player.economy <= 6.5) {
    badges += '<rect x="140" y="412" width="105" height="22" rx="11" fill="#DCFCE7" stroke="#16A34A" stroke-width="1"/><text x="192" y="427" fill="#166534" font-size="10" font-weight="bold" font-family="Arial, sans-serif" text-anchor="middle">ECONOMY KING</text>';
  }

  const roleCode = player.role === "Bowler" ? "BOWL" : player.role === "All-Rounder" ? "AR" : player.role === "Wicketkeeper" ? "WK" : "BAT";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 480" width="340" height="480">
    <defs>
      <linearGradient id="cardGrad_${player.id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0F172A"/>
        <stop offset="100%" stop-color="#1E293B"/>
      </linearGradient>
      <filter id="glow_${player.id}" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="${glow}"/>
      </filter>
    </defs>
    <rect x="10" y="10" width="320" height="460" rx="24" fill="url(#cardGrad_${player.id})" stroke="${border}" stroke-width="3" filter="url(#glow_${player.id})"/>
    <rect x="24" y="24" width="292" height="60" rx="14" fill="#0B1329" stroke="${border}" stroke-width="1"/>
    <text x="38" y="52" fill="#F8FAFC" font-size="18" font-weight="900" font-family="Arial, sans-serif">${player.name}</text>
    <text x="38" y="72" fill="${primary}" font-size="12" font-weight="bold" font-family="Arial, sans-serif">${player.role} | ${player.team}</text>
    <rect x="236" y="34" width="70" height="26" rx="8" fill="${primary}"/>
    <text x="271" y="52" fill="#FFFFFF" font-size="10" font-weight="900" font-family="Arial, sans-serif" text-anchor="middle">${player.rarity}</text>
    <rect x="24" y="96" width="292" height="150" rx="16" fill="#132238" stroke="#334155" stroke-width="1"/>
    <circle cx="170" cy="171" r="54" fill="#1E293B" stroke="${border}" stroke-width="2"/>
    <text x="170" y="178" fill="${primary}" font-size="18" font-weight="900" font-family="Arial, sans-serif" text-anchor="middle">${roleCode}</text>
    <rect x="24" y="258" width="292" height="106" rx="14" fill="#0B1329" stroke="#334155" stroke-width="1"/>
    <text x="44" y="284" fill="#94A3B8" font-size="11" font-family="Arial, sans-serif">MATCHES</text>
    <text x="44" y="306" fill="#F8FAFC" font-size="16" font-weight="bold" font-family="Arial, sans-serif">${player.matches}</text>
    <text x="120" y="284" fill="#94A3B8" font-size="11" font-family="Arial, sans-serif">RUNS</text>
    <text x="120" y="306" fill="#F8FAFC" font-size="16" font-weight="bold" font-family="Arial, sans-serif">${player.runs}</text>
    <text x="194" y="284" fill="#94A3B8" font-size="11" font-family="Arial, sans-serif">WICKETS</text>
    <text x="194" y="306" fill="#F8FAFC" font-size="16" font-weight="bold" font-family="Arial, sans-serif">${player.wickets}</text>
    <text x="260" y="284" fill="#94A3B8" font-size="11" font-family="Arial, sans-serif">STRIKE</text>
    <text x="260" y="306" fill="#F8FAFC" font-size="14" font-weight="bold" font-family="Arial, sans-serif">${player.strikeRate}</text>
    <text x="44" y="336" fill="#94A3B8" font-size="11" font-family="Arial, sans-serif">ECONOMY: ${player.economy}</text>
    ${badges}
  </svg>`;
}
