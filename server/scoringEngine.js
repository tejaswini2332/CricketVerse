/**
 * CricketVerse Deterministic Fantasy Scoring Engine
 * Conforms strictly to the scoring rules defined in Section 5.4 of the Project Proposal:
 *  - Runs Scored: +1 Point per run
 *  - Boundary Bonus (4s): +1 Extra Point
 *  - Sixer Bonus (6s): +2 Extra Points
 *  - Wicket Taken: +20 Points
 *  - Catch Claimed: +8 Points
 *  - Half-Century (50 runs): +10 Milestone Bonus
 *  - Century (100 runs): +25 Milestone Bonus
 * 
 * Applies Dynamic NFT Rarity Multipliers:
 *  - Common: 1.0x
 *  - Uncommon: 1.1x
 *  - Rare: 1.25x
 *  - Epic: 1.5x
 *  - Legendary: 2.0x
 */

export const RARITY_MULTIPLIERS = {
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

/**
 * Calculate deterministic fantasy points for a player's match performance
 * @param {Object} perf - Player performance metrics
 * @param {number} perf.runs - Total runs scored
 * @param {number} perf.fours - Number of 4s hit
 * @param {number} perf.sixes - Number of 6s hit
 * @param {number} perf.wickets - Wickets taken
 * @param {number} perf.catches - Catches taken
 * @param {string} [rarity='Common'] - Card rarity tier
 * @returns {Object} Calculated points and itemized breakdown
 */
export function calculatePlayerPoints(perf, rarity = 'Common') {
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

/**
 * Validate a fantasy squad according to salary cap and composition constraints
 * @param {Array} selectedPlayerIds
 * @param {Array} allPlayers
 * @returns {Object} { isValid: boolean, error?: string, totalCredits: number }
 */
export function validateSquad(selectedPlayerIds, allPlayers) {
  if (!Array.isArray(selectedPlayerIds) || selectedPlayerIds.length !== 11) {
    return {
      isValid: false,
      error: `Squad must contain exactly 11 players. Current: ${selectedPlayerIds?.length || 0}`,
    };
  }

  if (new Set(selectedPlayerIds).size !== 11) {
    return { isValid: false, error: "Squad cannot contain duplicate players." };
  }

  const idMap = new Map(allPlayers.map((p) => [p.id, p]));
  const squad = selectedPlayerIds.map((id) => idMap.get(id)).filter(Boolean);

  if (squad.length !== 11) {
    return { isValid: false, error: "One or more selected players not found in registry" };
  }

  const totalCredits = squad.reduce((acc, p) => acc + (p.creditCost || 8.5), 0);
  if (totalCredits > 120) {
    return {
      isValid: false,
      error: `Salary cap exceeded! Max allowed: 120 credits, squad uses ${totalCredits} credits`,
      totalCredits,
    };
  }

  const roleCounts = squad.reduce((acc, p) => {
    acc[p.role] = (acc[p.role] || 0) + 1;
    return acc;
  }, {});

  if ((roleCounts["Wicketkeeper"] || 0) < 1) {
    return { isValid: false, error: "Squad must contain at least 1 Wicketkeeper" };
  }
  if ((roleCounts["Batsman"] || 0) < 3) {
    return { isValid: false, error: "Squad must contain at least 3 Batsmen" };
  }
  if ((roleCounts["Bowler"] || 0) < 3) {
    return { isValid: false, error: "Squad must contain at least 3 Bowlers" };
  }
  if ((roleCounts["All-Rounder"] || 0) < 1) {
    return { isValid: false, error: "Squad must contain at least 1 All-Rounder" };
  }

  return {
    isValid: true,
    totalCredits,
    roleCounts,
  };
}

/**
 * Dynamic Player Rarity Calculation Algorithm
 * Evaluates real-time cricket athletic stats (runs, wickets, strike rate, economy, matches)
 * to deterministically compute a Dynamic Performance Index (DPI: 0 - 100+) and classify the player's rarity tier:
 *  - Legendary: DPI >= 85
 *  - Epic: 70 <= DPI < 85
 *  - Rare: 55 <= DPI < 70
 *  - Uncommon: 40 <= DPI < 55
 *  - Common: DPI < 40
 *
 * @param {Object} player
 * @param {string} player.role - "Batsman", "Bowler", "All-Rounder", "Wicketkeeper"
 * @param {number} player.matches - Total matches played
 * @param {number} player.runs - Total runs scored
 * @param {number} player.wickets - Total wickets taken
 * @param {number} player.strikeRate - Batting strike rate
 * @param {number} [player.economy=0] - Bowling economy rate
 * @returns {Object} { rarity: string, dpi: number, role: string, runsPerMatch: number, wicketsPerMatch: number }
 */
export function calculateDynamicRarity(player) {
  const matches = Math.max(1, Number(player.matches || 0));
  const runs = Number(player.runs || 0);
  const wickets = Number(player.wickets || 0);
  const strikeRate = Number(player.strikeRate || 0);
  const economy = Number(player.economy || 0);
  const role = player.role || "Batsman";

  const runsPerMatch = runs / matches;
  const wicketsPerMatch = wickets / matches;

  let dpi = 0;

  if (role === "Batsman") {
    // 1. Scoring volume & consistency (up to 45 pts)
    const avgScore = Math.min(runsPerMatch / 45, 1.2) * 45;
    // 2. Strike Rate acceleration (up to 35 pts)
    const srScore = Math.min(strikeRate / 150, 1.2) * 35;
    // 3. Career volume (up to 20 pts)
    const careerScore = Math.min(runs / 3500, 1.0) * 20;

    dpi = avgScore + srScore + careerScore;
  } else if (role === "Bowler") {
    // 1. Strike lethality (up to 45 pts)
    const strikeScore = Math.min(wicketsPerMatch / 1.3, 1.2) * 45;
    // 2. Economic control (up to 35 pts)
    const econScore = economy > 0 ? Math.max(0, Math.min((9.5 - economy) / 3.5, 1.2)) * 35 : 20;
    // 3. Career wickets volume (up to 20 pts)
    const careerScore = Math.min(wickets / 80, 1.0) * 20;

    dpi = strikeScore + econScore + careerScore;
  } else if (role === "All-Rounder") {
    // Dual impact weighting (Batting + Bowling):
    const batContribution = (Math.min(runsPerMatch / 28, 1.2) * 25) + (Math.min(strikeRate / 140, 1.2) * 15);
    const bowlContribution = (Math.min(wicketsPerMatch / 0.9, 1.2) * 25) + (economy > 0 ? Math.max(0, (9.0 - economy) / 3.0) * 15 : 10);
    const careerVol = Math.min((runs + wickets * 25) / 2500, 1.0) * 20;

    dpi = batContribution + bowlContribution + careerVol;
  } else {
    // Wicketkeeper:
    const avgScore = Math.min(runsPerMatch / 40, 1.2) * 50;
    const srScore = Math.min(strikeRate / 140, 1.2) * 30;
    const careerScore = Math.min(runs / 3000, 1.0) * 20;

    dpi = avgScore + srScore + careerScore;
  }

  dpi = Math.round(dpi * 10) / 10;

  let rarity = "Common";
  if (dpi >= 85) {
    rarity = "Legendary";
  } else if (dpi >= 70) {
    rarity = "Epic";
  } else if (dpi >= 55) {
    rarity = "Rare";
  } else if (dpi >= 40) {
    rarity = "Uncommon";
  } else {
    rarity = "Common";
  }

  return {
    rarity,
    dpi,
    role,
    runsPerMatch: Math.round(runsPerMatch * 10) / 10,
    wicketsPerMatch: Math.round(wicketsPerMatch * 10) / 10,
  };
}
