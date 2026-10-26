import fs from "fs";
import "dotenv/config";
import express from "express";
import cors from "cors";
// Using built‑in global fetch (Node ≥18) – no external dependency needed
import { fileURLToPath } from "url";
import path from "path";
import { JsonRpcProvider, isAddress, parseEther, formatEther } from "ethers";
import { calculatePlayerPoints, validateSquad, calculateDynamicRarity, RARITY_MULTIPLIERS, SCORING_RULES } from "./scoringEngine.js";
import { INITIAL_PLAYERS } from "./seedData.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));
app.use("/artifacts", express.static(path.join(__dirname, "../artifacts")));

// Explicit, local-only gas top-up for classroom demos. The user still signs all
// feature transactions in their wallet; this only moves test ETH on Hardhat.
// Explicit, local‑only gas top‑up for classroom demos. The user still signs all
// feature transactions in their wallet; this only moves test ETH on Hardhat.
const demoGasClaims = new Map();
app.post("/api/demo/gas", async (req, res) => {
  // No host/origin validation – allow any caller (e.g., curl)



  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "../public/contracts-config.json"), "utf8"));
    if (Number(manifest.chainId) !== 31337) return res.status(404).json({ error: "Demo gas is only available on local Hardhat." });
    const recipient = String(req.body?.address || "");
    if (!isAddress(recipient)) return res.status(400).json({ error: "Connect a valid wallet address first." });

    const rpcUrl = process.env.HARDHAT_RPC || "http://127.0.0.1:8545";
    const rpcHost = new URL(rpcUrl).hostname.toLowerCase();
    if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(rpcHost)) {
      return res.status(503).json({ error: "The demo gas faucet requires a loopback Hardhat RPC." });
    }
    const provider = new JsonRpcProvider(rpcUrl, 31337, { staticNetwork: true });
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== 31337) return res.status(503).json({ error: "The configured RPC is not the local Hardhat chain." });

    const balance = await provider.getBalance(recipient);
    const targetBalance = parseEther("20");
    if (balance >= targetBalance) {
      return res.json({ funded: false, balanceEth: formatEther(balance), message: "This wallet already has enough local ETH for demo gas." });
    }

    const now = Date.now();
    const previousClaim = demoGasClaims.get(recipient.toLowerCase()) || 0;
    if (now - previousClaim < 60_000) return res.status(429).json({ error: "Please wait a minute before requesting demo gas again." });

    const signer = await provider.getSigner(0);
    if ((await signer.getAddress()).toLowerCase() === recipient.toLowerCase()) {
      return res.json({ funded: false, balanceEth: formatEther(balance), message: "This organizer wallet is already funded for demo gas." });
    }
    demoGasClaims.set(recipient.toLowerCase(), now);
    try {
      const amount = targetBalance - balance;
      const tx = await signer.sendTransaction({ to: recipient, value: amount });
      const receipt = await tx.wait();
      return res.json({ funded: true, amountEth: formatEther(amount), txHash: tx.hash, blockNumber: receipt.blockNumber });
    } catch (error) {
      demoGasClaims.delete(recipient.toLowerCase());
      throw error;
    }
  } catch (error) {
    console.error("Local demo gas request failed:", error.message);
    return res.status(503).json({ error: "Could not fund this wallet. Make sure the local Hardhat node is running." });
  }
});

app.get("/vendor/ethers.min.js", (req, res) => {
  res.sendFile(path.join(__dirname, "../node_modules/ethers/dist/ethers.umd.min.js"));
});

// Load extensive 2000-2026 cricket database (4,800+ players)
let players = [];
try {
  const datasetPath = path.join(__dirname, "data/players_2000_2026.json");
  if (fs.existsSync(datasetPath)) {
    const rawData = fs.readFileSync(datasetPath, "utf-8");
    players = JSON.parse(rawData);
    console.log(`Loaded ${players.length} cricketers (2000-2026 era)`);
  } else {
    players = JSON.parse(JSON.stringify(INITIAL_PLAYERS));
  }
} catch (e) {
  players = JSON.parse(JSON.stringify(INITIAL_PLAYERS));
}

// 1. Health check & architecture status
app.get("/api/health", (req, res) => {
  let manifest = {};
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "contracts-config.json"), "utf8"));
  } catch {}
  res.json({
    status: "online",
    system: "CricketVerse Web3 Engine",
    phase: "Sprint 1 (Days 1–10)",
    network: manifest.network || "No deployment manifest",
    chainId: manifest.chainId || null,
    blockchain: {
      mode: "browser-wallet",
      transactionSigning: "EIP-1193 wallet",
      details: "This health endpoint reports app configuration; it does not probe the browser wallet or RPC node.",
    },
    contracts: manifest.contracts || {},
    scoringRules: SCORING_RULES,
  });
});

// 2. Player card catalog with search, role/rarity filtering & pagination across 4,800+ players
app.get("/api/players", (req, res) => {
  const { search, role, rarity, page, limit } = req.query;

  let filtered = players;

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.team && p.team.toLowerCase().includes(q)) ||
        (p.country && p.country.toLowerCase().includes(q))
    );
  }

  if (role && role !== "all") {
    filtered = filtered.filter((p) => p.role.toLowerCase() === role.toLowerCase());
  }

  if (rarity && rarity !== "all") {
    filtered = filtered.filter((p) => p.rarity.toLowerCase() === rarity.toLowerCase());
  }

  const total = filtered.length;

  if (page && limit) {
    const p = Math.max(1, Number(page));
    const l = Math.max(1, Number(limit));
    const start = (p - 1) * l;
    const pageItems = filtered.slice(start, start + l);

    const enriched = pageItems.map((item) => {
      const stats = item.stats || { runs: item.runs % 100, fours: Math.floor((item.runs % 100) / 10), sixes: Math.floor((item.runs % 100) / 25), wickets: item.wickets % 5, catches: 1 };
      const calc = calculatePlayerPoints(stats, item.rarity);
      return {
        ...item,
        calculatedPoints: calc.finalPoints,
        basePoints: calc.basePoints,
        breakdown: calc.breakdown,
      };
    });

    return res.json({
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
      players: enriched,
    });
  }

  // Cap initial unbounded query to top 150 for ultra-fast response
  const sliced = filtered.slice(0, 150);
  const enriched = sliced.map((item) => {
    const stats = item.stats || { runs: item.runs % 100, fours: Math.floor((item.runs % 100) / 10), sixes: Math.floor((item.runs % 100) / 25), wickets: item.wickets % 5, catches: 1 };
    const calc = calculatePlayerPoints(stats, item.rarity);
    return {
      ...item,
      calculatedPoints: calc.finalPoints,
      basePoints: calc.basePoints,
      breakdown: calc.breakdown,
    };
  });
  res.json(enriched);
});

// Compact, lazy-loaded player pool for the fantasy squad builder.
app.get("/api/players/fantasy-pool", (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=300");
  res.json(players.map((player) => ({
    id: player.id,
    name: player.name,
    role: player.role,
    rarity: player.rarity,
    creditCost: player.creditCost || 8.5,
    avatar: player.avatar,
    calculatedPoints: 0,
  })));
});
// In-memory caches for external CricketData API responses (expires after 30s).
const cricketCache = new Map();
const CRICKET_API_BASE = "https://api.cricapi.com/v1";

async function cricketApi(endpoint, params = {}) {
  const apiKey = process.env.CRICKET_API_KEY;
  if (!apiKey) throw new Error("CRICKET_API_KEY is not configured");
  const url = new URL(`${CRICKET_API_BASE}/${endpoint}`);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("offset", "0");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Cricket API returned HTTP ${response.status}`);
  const json = await response.json();
  if (json.status !== "success") throw new Error(json.reason || "Cricket API request failed");
  return json.data;
}

async function cachedCricket(key, fetcher) {
  const cached = cricketCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.data;
  const data = await fetcher();
  cricketCache.set(key, { data, expires: Date.now() + 30_000 });
  return data;
}

app.get("/api/cricket/status", async (_req, res) => {
  if (!process.env.CRICKET_API_KEY) return res.json({ connected: false, reason: "CRICKET_API_KEY is not configured" });
  try {
    const matches = await cachedCricket("status-current-matches", () => cricketApi("currentMatches"));
    res.json({ connected: true, provider: "CricAPI / CricketData", checkedAt: new Date().toISOString(), currentMatches: Array.isArray(matches) ? matches.length : 0 });
  } catch (error) {
    res.status(502).json({ connected: false, provider: "CricAPI / CricketData", reason: error.message });
  }
});

/**
 * GET /api/matches/today
 * Returns matches scheduled for the requested date (UTC, YYYY-MM-DD).
 */
app.get("/api/matches/today", async (req, res) => {
  const today = String(req.query.date || new Date().toISOString().slice(0, 10));
  const cacheKey = `matches-${today}`;
  try {
    const rawMatches = await cachedCricket(cacheKey, async () => {
      const [current, upcoming] = await Promise.all([
        cricketApi("currentMatches"),
        cricketApi("matches"),
      ]);
      return [...(Array.isArray(current) ? current : []), ...(Array.isArray(upcoming) ? upcoming : [])];
    });
    const matches = [...new Map(rawMatches
      .filter((m) => String(m.date || m.dateTimeGMT || "").slice(0, 10) === today)
      .map((m) => [m.id, {
        id: m.id,
        teams: m.name || `${m.teamInfo?.[0]?.name || m.teams?.[0] || "Team 1"} vs ${m.teamInfo?.[1]?.name || m.teams?.[1] || "Team 2"}`,
        startTime: m.dateTimeGMT || m.date || null,
        status: m.status || "Scheduled",
      }])).values()];
    res.json(matches);
  } catch (e) {
    console.error("Error fetching today's matches:", e.message);
    res.status(502).json({ error: e.message || "Failed to retrieve match schedule" });
  }
});

/**
 * GET /api/match/:id/playingXI
 * Returns the match squad from the provider, capped to the 22 on-field players.
 */
app.get("/api/match/:id/playingXI", async (req, res) => {
  const matchId = req.params.id;
  const cacheKey = `xi-${matchId}`;
  try {
    const squads = await cachedCricket(cacheKey, () => cricketApi("match_squad", { id: matchId }));
    const matchPlayers = (Array.isArray(squads) ? squads : []).flatMap((team) => {
      const playersInTeam = team.players || [];
      const confirmedXI = playersInTeam.filter((p) => p.playingXI === true || p.isPlaying === true || p.playing === true);
      if (confirmedXI.length >= 11) return confirmedXI.slice(0, 11);
      if (playersInTeam.length === 11) return playersInTeam;
      throw new Error("The API returned a full squad but no confirmed playing XI. Try again after lineups are announced or use a feed that exposes the starting XI.");
    });
    const normalized = matchPlayers
      .filter((p) => p.name)
      .map((p, index) => {
        const registryPlayer = players.find((candidate) => candidate.name.toLowerCase() === p.name.toLowerCase());
        const role = /wicket.?keeper|keeper/i.test(p.role || "") ? "Wicketkeeper"
          : /all.?round/i.test(p.role || "") ? "All-Rounder"
            : /bowl/i.test(p.role || "") ? "Bowler" : /bat/i.test(p.role || "") ? "Batsman"
              : registryPlayer?.role || "Batsman";
        return {
          id: `${matchId}:${p.id || p.name}:${index}`,
          providerId: p.id || null,
          name: p.name,
          role,
          rarity: registryPlayer?.rarity || "Common",
          creditCost: registryPlayer?.creditCost || 8.5,
          avatar: p.playerImg || registryPlayer?.avatar || null,
          calculatedPoints: 0,
        };
      });
    const unique = [...new Map(normalized.map((p) => [p.name.toLowerCase(), p])).values()].slice(0, 22);
    if (unique.length !== 22) return res.status(502).json({ error: `Provider returned ${unique.length} unique squad players; Matchday XI requires 22.` });
    res.json(unique);
  } catch (e) {
    console.error("Error fetching playing XI:", e.message);
    res.status(502).json({ error: e.message || "Failed to retrieve playing XI" });
  }
});

app.get("/api/match/:id/points", async (req, res) => {
  const matchId = req.params.id;
  try {
    const pointsData = await cachedCricket(`points-${matchId}`, () => cricketApi("match_points", { id: matchId }));
    const byName = new Map();
    for (const inning of pointsData?.innings || []) {
      for (const category of ["batting", "bowling", "catching"]) {
        for (const player of inning[category] || []) {
          const key = String(player.name || "").trim().toLowerCase();
          if (key) byName.set(key, (byName.get(key) || 0) + Number(player.points || 0));
        }
      }
    }
    res.json({ matchId, status: pointsData?.status || "Live", points: Object.fromEntries(byName), updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Error fetching live match points:", error.message);
    res.status(502).json({ error: error.message || "Failed to retrieve live match points" });
  }
});

// 2.1 Dynamic SVG Avatar Endpoint for all cricketers in the database
app.get("/api/avatar/:id.svg", (req, res) => {
  const id = Number(req.params.id);
  const player = players.find((p) => p.id === id) || {
    id: id || 1,
    name: "Cricketer",
    role: "Batsman",
    rarity: "Common",
  };

  const parts = player.name.split(" ");
  const initials = parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : player.name.slice(0, 2).toUpperCase();

  const roleColors = {
    Batsman: { bg1: "#1e1b4b", bg2: "#312e81", accent: "#f59e0b", badge: "#ef4444" },
    Bowler: { bg1: "#082f49", bg2: "#075985", accent: "#38bdf8", badge: "#0284c7" },
    "All-Rounder": { bg1: "#064e3b", bg2: "#047857", accent: "#34d399", badge: "#10b981" },
    Wicketkeeper: { bg1: "#3b0764", bg2: "#6b21a8", accent: "#c084fc", badge: "#8b5cf6" },
  };
  const palette = roleColors[player.role] || roleColors["Batsman"];

  const tierColors = {
    Legendary: "#f59e0b",
    Epic: "#a855f7",
    Rare: "#3b82f6",
    Uncommon: "#10b981",
    Common: "#94a3b8",
  };
  const borderColor = tierColors[player.rarity] || "#94a3b8";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="100%" height="100%">
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
    <text x="252" y="34" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="800" text-anchor="middle" letter-spacing="0.5">${player.role.toUpperCase()}</text>

    <text x="24" y="38" fill="rgba(255,255,255,0.4)" font-family="monospace" font-size="14" font-weight="700">#${player.id}</text>
  </svg>`;

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(svg);
});

// Fallback image route
app.get("/images/players/avatar_placeholder.png", (req, res) => {
  res.redirect("/api/avatar/1.svg");
});

// 3. Deterministic scoring calculation endpoint
app.post("/api/fantasy/calculate", (req, res) => {
  const { runs, fours, sixes, wickets, catches, rarity } = req.body;
  const result = calculatePlayerPoints(
    { runs, fours, sixes, wickets, catches },
    rarity || "Common"
  );
  res.json(result);
});

// 4. Validate Squad against Salary Cap
app.post("/api/fantasy/validate-squad", (req, res) => {
  const { playerIds } = req.body;
  const validation = validateSquad(playerIds, players);
  res.json(validation);
});

// 5. Simulate one six-ball over for the submitted fantasy XI.
app.post("/api/fantasy/simulate-over", (req, res) => {
  const selectedIds = Array.isArray(req.body?.playerIds) ? [...new Set(req.body.playerIds.map(Number))] : [];
  const validation = validateSquad(selectedIds, players);
  if (!validation.isValid) return res.status(400).json({ error: validation.error || "Select a valid Playing XI before simulating." });
  const matchSquad = selectedIds.map((id) => players.find((player) => player.id === id));
  const batters = matchSquad.filter((player) => ["Batsman", "Wicketkeeper", "All-Rounder"].includes(player.role));
  const bowlers = matchSquad.filter((player) => ["Bowler", "All-Rounder"].includes(player.role));
  if (!batters.length || !bowlers.length) return res.status(400).json({ error: "The selected XI needs a batter and a bowler." });
  const batter = batters[Math.floor(Math.random() * batters.length)];
  const distinctBowlers = bowlers.filter((player) => player.id !== batter.id);
  const bowlerPool = distinctBowlers.length ? distinctBowlers : bowlers;
  const bowler = bowlerPool[Math.floor(Math.random() * bowlerPool.length)];
  const matchStats = (player) => {
    if (!player.matchStats) player.matchStats = { runs: 0, fours: 0, sixes: 0, wickets: 0, catches: 0 };
    return player.matchStats;
  };

  const outcomes = [
    { type: "DOT", runs: 0, fours: 0, sixes: 0, wicket: 0, text: "Dot ball! Crisp defensive drive." },
    { type: "SINGLE", runs: 1, fours: 0, sixes: 0, wicket: 0, text: "Tapped into the gap for a quick single." },
    { type: "DOUBLE", runs: 2, fours: 0, sixes: 0, wicket: 0, text: "Excellent running between the wickets, 2 runs!" },
    { type: "FOUR", runs: 4, fours: 1, sixes: 0, wicket: 0, text: "FOUR! Glorious cover drive piercing the infield!" },
    { type: "SIX", runs: 6, fours: 0, sixes: 1, wicket: 0, text: "SIX! Launched into the 2nd tier with pure timing!" },
    { type: "WICKET", runs: 0, fours: 0, sixes: 0, wicket: 1, text: "WICKET! Clean bowled with an unplayable yorker!" },
  ];

  const batterStats = matchStats(batter);
  const bowlerStats = matchStats(bowler);
  const overEvents = [];
  let totalRuns = 0;
  for (let ball = 0; ball < 6; ball++) {
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
    batterStats.runs += outcome.runs;
    batterStats.fours += outcome.fours;
    batterStats.sixes += outcome.sixes;
    bowlerStats.wickets += outcome.wicket;
    totalRuns += outcome.runs;
    overEvents.push(`${ball + 1}. ${outcome.text}`);
  }

  const batterCalc = calculatePlayerPoints(batterStats, batter.rarity);
  const bowlerCalc = calculatePlayerPoints(bowlerStats, bowler.rarity);

  res.json({
    event: `Over complete · ${totalRuns} runs · ${bowlerStats.wickets} wickets`,
    deliveries: overEvents,
    batter: {
      id: batter.id,
      name: batter.name,
      stats: batterStats,
      points: batterCalc.finalPoints,
    },
    bowler: {
      id: bowler.id,
      name: bowler.name,
      stats: bowlerStats,
      points: bowlerCalc.finalPoints,
    },
    timestamp: new Date().toISOString(),
  });
});

// Legacy demo mutation endpoints only changed server memory and accepted caller-supplied wallets.
// Keep them explicitly closed so they cannot be mistaken for blockchain transactions.
app.use(["/api/tickets", "/api/marketplace", "/api/user", "/api/tournaments", "/api/oracle"], (req, res) => {
  res.status(410).json({ error: "This demo endpoint is disabled. Use a wallet-signed on-chain transaction." });
});

// 13. Phase 2: Dynamic On-Chain SVG Card Renderer (Days 15-16)
app.get("/api/cards/:id/svg", (req, res) => {
  const { id } = req.params;
  const player = players.find((p) => p.id === Number(id)) || players[0];

  // SVG palette based on rarity
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

  // Dynamic milestone badges
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

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 480" width="340" height="480">
    <defs>
      <linearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0F172A"/>
        <stop offset="100%" stop-color="#1E293B"/>
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="${glow}"/>
      </filter>
    </defs>
    <rect x="10" y="10" width="320" height="460" rx="24" fill="url(#cardGrad)" stroke="${border}" stroke-width="3" filter="url(#glow)"/>
    <rect x="24" y="24" width="292" height="60" rx="14" fill="#0B1329" stroke="${border}" stroke-width="1"/>
    <text x="38" y="52" fill="#F8FAFC" font-size="18" font-weight="900" font-family="Arial, sans-serif">${player.name}</text>
    <text x="38" y="72" fill="${primary}" font-size="12" font-weight="bold" font-family="Arial, sans-serif">${player.role} | ${player.team}</text>
    <rect x="236" y="34" width="70" height="26" rx="8" fill="${primary}"/>
    <text x="271" y="52" fill="#FFFFFF" font-size="10" font-weight="900" font-family="Arial, sans-serif" text-anchor="middle">${player.rarity}</text>
    <rect x="24" y="96" width="292" height="150" rx="16" fill="#132238" stroke="#334155" stroke-width="1"/>
    <circle cx="170" cy="171" r="54" fill="#1E293B" stroke="${border}" stroke-width="2"/>
    <text x="170" y="178" fill="${primary}" font-size="18" font-weight="900" font-family="Arial, sans-serif" text-anchor="middle">${player.role === 'Bowler' ? 'BOWL' : player.role === 'All-Rounder' ? 'AR' : player.role === 'Wicketkeeper' ? 'WK' : 'BAT'}</text>
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

  res.setHeader("Content-Type", "image/svg+xml");
  res.send(svg);
});

// Start Express server
app.listen(PORT, () => {
  console.log(`CricketVerse Web3 Engine active at http://localhost:${PORT}`);
});
