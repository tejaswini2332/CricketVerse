/**
 * CricketVerse Hybrid Database & Cache Connector
 * Days 13-14: PostgreSQL Schema & Redis Leaderboard Cache Layer
 */

class InMemoryDatabase {
  constructor() {
    this.fixtures = [
      {
        match_id: 501,
        series_name: "T20 Championship 2026",
        match_name: "Grand Final: India vs Australia",
        venue: "Narendra Modi Stadium, Ahmedabad",
        match_date: new Date(Date.now() + 86400000).toISOString(),
        format: "T20",
        home_team: "India",
        away_team: "Australia",
        status: "LIVE",
        total_overs: 20,
        current_over: 14.2,
        score_summary: "148/3 (14.2 ov)",
      },
      {
        match_id: 502,
        series_name: "IPL Mega League 2026",
        match_name: "Qualifier 1: Mumbai vs Chennai",
        venue: "Wankhede Stadium, Mumbai",
        match_date: new Date(Date.now() + 172800000).toISOString(),
        format: "T20",
        home_team: "Mumbai Indians",
        away_team: "Chennai Super Kings",
        status: "UPCOMING",
        total_overs: 20,
        current_over: 0.0,
        score_summary: "Upcoming",
      },
    ];

    this.tournaments = [
      {
        id: 1,
        name: "Mega Championship Pool (100,000 CRIC)",
        match_id: 501,
        entry_fee: 50,
        max_participants: 500,
        current_participants: 342,
        total_escrow: 17100,
        status: "OPEN",
        first_prize: 8122,
        treasury_fee_bps: 500, // 5%
      },
      {
        id: 2,
        name: "High Rollers VIP Arena (500 CRIC)",
        match_id: 501,
        entry_fee: 500,
        max_participants: 50,
        current_participants: 41,
        total_escrow: 20500,
        status: "OPEN",
        first_prize: 9737,
        treasury_fee_bps: 500,
      },
    ];

    this.leaderboard = [
      { rank: 1, user: "0x7099...79C8", squadName: "Hitman Strikers", points: 412.5, prizeCRIC: 8122.5 },
      { rank: 2, user: "0x3C44...93BC", squadName: "Yorker Kings XI", points: 398.0, prizeCRIC: 4061.25 },
      { rank: 3, user: "0x90F7...2648", squadName: "Bleed Blue Warriors", points: 384.5, prizeCRIC: 2436.75 },
      { rank: 4, user: "0x15d3...6a7b", squadName: "Spin Blitzers", points: 371.0, prizeCRIC: 812.25 },
      { rank: 5, user: "0x9965...1957", squadName: "Death Over Specialists", points: 355.0, prizeCRIC: 812.25 },
    ];

    this.oracleLogs = [
      {
        requestId: "0x7a3f8902cba390d18204918ef93021fa44e782901a93821049c81290fab90123",
        matchId: 501,
        cardId: 1,
        playerName: "Virat Kohli",
        deltaRuns: 76,
        deltaWickets: 0,
        newStrikeRate: 145.0,
        newEconomy: 0.0,
        status: "FULFILLED",
        timestamp: new Date().toISOString(),
        txHash: "0x6f2b189c4901baef289047192837bcda124801938bfe81249019283ba4128f09",
      },
    ];
  }

  getTournaments() {
    return this.tournaments;
  }

  getTournamentById(id) {
    return this.tournaments.find((t) => t.id === parseInt(id));
  }

  joinTournament(id, participant) {
    const t = this.getTournamentById(id);
    if (!t) throw new Error("Tournament not found");
    if (t.status !== "OPEN") throw new Error("Tournament is not open");
    if (!participant?.user || !/^0x[0-9a-f]{40}$/i.test(participant.user)) throw new Error("A valid wallet address is required");
    if (!this.joinedWallets) this.joinedWallets = new Map();
    if (!this.joinedWallets.has(t.id)) this.joinedWallets.set(t.id, new Set());
    const joined = this.joinedWallets.get(t.id);
    const wallet = participant.user.toLowerCase();
    if (joined.has(wallet)) throw new Error("Wallet already joined this tournament");
    if (t.current_participants >= t.max_participants) throw new Error("Contest is full");
    joined.add(wallet);
    t.current_participants += 1;
    t.total_escrow += t.entry_fee;

    // Add to simulated Redis leaderboard
    const newEntry = {
      rank: this.leaderboard.length + 1,
      user: participant.user || "0xf39F...2266",
      squadName: participant.squadName || "Super XI",
      // Joining must not invent a score. Match scoring updates this after play.
      points: 0,
      prizeCRIC: 0,
    };
    this.leaderboard.push(newEntry);
    this.leaderboard.sort((a, b) => b.points - a.points);
    this.leaderboard.forEach((entry, idx) => (entry.rank = idx + 1));

    return { tournament: t, participant: newEntry };
  }

  getLeaderboard(tournamentId) {
    return this.leaderboard;
  }

  addOracleLog(log) {
    this.oracleLogs.unshift(log);
    if (this.oracleLogs.length > 20) this.oracleLogs.pop();
    return log;
  }

  getOracleLogs() {
    return this.oracleLogs;
  }
}

export const db = new InMemoryDatabase();
