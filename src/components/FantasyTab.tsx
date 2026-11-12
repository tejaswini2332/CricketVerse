import React, { useState } from "react";
import { useCricket } from "../context/CricketContext";
import { Player } from "../types";

export const FantasyTab: React.FC = () => {
  const {
    allLoadedPlayers,
    selectedPlayerIds,
    toggleSelectPlayer,
    autoPickBalancedSquad,
    clearSquad,
    todayMatches,
    selectedMatchId,
    setSelectedMatchId,
    matchCommentary,
    deliveriesLog,
    simulateOver,
    squadValidation,
  } = useCricket();

  const [searchFilter, setSearchFilter] = useState<string>("");

  const selectedSquad = selectedPlayerIds
    .map((id) => allLoadedPlayers.find((p) => p.id === id))
    .filter((p): p is Player => Boolean(p));

  const totalPoints = Number(
    selectedSquad.reduce((sum, p) => sum + (p.calculatedPoints || 0), 0).toFixed(1)
  );

  const availableRoster = allLoadedPlayers.filter((p) => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.team && p.team.toLowerCase().includes(q)) ||
      p.role.toLowerCase().includes(q)
    );
  });

  const salaryPercentage = Math.min(100, Math.round((squadValidation.totalCredits / 120) * 100));

  const roleCounts = squadValidation.roleCounts || {
    Wicketkeeper: 0,
    Batsman: 0,
    Bowler: 0,
    "All-Rounder": 0,
  };

  const selectedMatch = todayMatches.find((m) => m.id === selectedMatchId) || todayMatches[0];

  return (
    <section id="section-fantasy" className="view-panel active">
      <div className="fantasy-dashboard-layout">
        {/* Left: Squad Builder */}
        <div className="fantasy-builder-card">
          <div className="builder-header">
            <div>
              <span className="hero-kicker">SQUAD STRATEGY</span>
              <h2 className="title-md">Build Your Playing XI</h2>
              <p className="sub-sm">
                Assemble a winning 11-player lineup staying within the 120-credit salary cap.
              </p>
            </div>

            <div className="salary-cap-box">
              <span className="salary-label">Salary Cap</span>
              <div className="salary-meter">
                <div
                  id="salary-progress-bar"
                  className="salary-bar-fill"
                  style={{
                    width: `${salaryPercentage}%`,
                    backgroundColor: squadValidation.totalCredits > 120 ? "var(--ball-red)" : undefined,
                  }}
                ></div>
              </div>
              <span id="salary-credits-display" className="salary-number">
                {squadValidation.totalCredits} / 120 Credits ({salaryPercentage}%)
              </span>
            </div>
          </div>

          <div className="role-requirements-tracker" style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: "14px 0" }}>
            <span
              id="badge-wk"
              className={`role-req ${roleCounts["Wicketkeeper"] >= 1 ? "fulfilled" : ""}`}
            >
              WK: {roleCounts["Wicketkeeper"]}/1
            </span>
            <span
              id="badge-bat"
              className={`role-req ${roleCounts["Batsman"] >= 3 ? "fulfilled" : ""}`}
            >
              BAT: {roleCounts["Batsman"]}/3
            </span>
            <span
              id="badge-bowl"
              className={`role-req ${roleCounts["Bowler"] >= 3 ? "fulfilled" : ""}`}
            >
              BOWL: {roleCounts["Bowler"]}/3
            </span>
            <span
              id="badge-ar"
              className={`role-req ${roleCounts["All-Rounder"] >= 1 ? "fulfilled" : ""}`}
            >
              AR: {roleCounts["All-Rounder"]}/1
            </span>
            <span
              id="badge-total"
              className={`role-req total-badge ${selectedPlayerIds.length === 11 ? "fulfilled" : ""}`}
            >
              Playing XI: {selectedPlayerIds.length}/11
            </span>
          </div>

          {!squadValidation.isValid && squadValidation.error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: "8px 12px", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "12px" }}>
              ⚠️ {squadValidation.error}
            </div>
          )}

          <div className="roster-pool-controls">
            <input
              type="text"
              id="player-search"
              className="input-search"
              placeholder="Search players by name, role, team…"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
            <button
              id="auto-squad-btn"
              className="btn btn-sm btn-ghost"
              type="button"
              onClick={autoPickBalancedSquad}
            >
              Auto-Pick Balanced XI
            </button>
            <button
              id="clear-squad-btn"
              className="btn btn-sm btn-danger-outline"
              type="button"
              onClick={clearSquad}
            >
              Clear
            </button>
          </div>

          <div id="player-picker-list" className="player-picker-list" style={{ maxHeight: "560px", overflowY: "auto" }}>
            {availableRoster.slice(0, 80).map((player) => {
              const isSelected = selectedPlayerIds.includes(player.id);
              return (
                <div
                  key={player.id}
                  className={`picker-player-row ${isSelected ? "selected-row" : ""}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    marginBottom: "8px",
                    background: isSelected ? "var(--turf-green-light)" : "white",
                    border: `1px solid ${isSelected ? "var(--turf-green-border)" : "var(--card-border)"}`,
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <img
                      src={player.avatar}
                      alt={player.name}
                      style={{ width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(player.name)}`;
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-main)" }}>
                        {player.name}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
                        <span className={`rarity-tag-micro rarity-${player.rarity.toLowerCase()}`} style={{ marginRight: "6px" }}>
                          {player.rarity}
                        </span>
                        {player.role} · {player.team}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 800, color: "var(--turf-green-dark)", fontSize: "0.95rem" }}>
                        {player.creditCost || 8.5} cr
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                        {player.multiplier}x multi
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`btn btn-sm ${isSelected ? "btn-danger-outline" : "btn-primary"}`}
                      style={{ padding: "6px 14px" }}
                      onClick={() => toggleSelectPlayer(player.id)}
                    >
                      {isSelected ? "Remove" : "Pick"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Live Match Simulator */}
        <div className="fantasy-simulation-card">
          <div className="sim-header">
            <div>
              <span className="live-tag">LIVE MATCH</span>
              <h3 id="fantasy-match-title" className="title-md">
                {selectedMatch.teams}
              </h3>
            </div>
            <button
              id="simulate-over-btn"
              className="btn btn-primary pulse-btn"
              type="button"
              onClick={simulateOver}
              disabled={selectedPlayerIds.length !== 11}
              title={selectedPlayerIds.length !== 11 ? "Select 11 players first" : "Simulate an over"}
            >
              Simulate 6-Ball Over
            </button>
          </div>

          <div className="roster-pool-controls" style={{ marginTop: "12px" }}>
            <label htmlFor="matchday-match-select" className="sub-sm" style={{ fontWeight: 700 }}>
              Select Fixture:
            </label>
            <select
              id="matchday-match-select"
              className="form-control"
              value={selectedMatchId}
              onChange={(e) => setSelectedMatchId(Number(e.target.value))}
            >
              {todayMatches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.teams} · {m.status} ({m.venue})
                </option>
              ))}
            </select>
            <span id="matchday-api-status" className="sub-sm text-dim" role="status" style={{ display: "block", marginTop: "4px" }}>
              Live Score Feed Connected · Deterministic Point Engine Ready
            </span>
          </div>

          {/* Scoring Matrix */}
          <div className="scoring-rules-banner" style={{ margin: "14px 0" }}>
            <div className="rule-chip">Run: <b>+1</b></div>
            <div className="rule-chip">Four (4s): <b>+1</b></div>
            <div className="rule-chip">Six (6s): <b>+2</b></div>
            <div className="rule-chip">Wicket: <b>+20</b></div>
            <div className="rule-chip">Catch: <b>+8</b></div>
            <div className="rule-chip">Fifty: <b>+10</b></div>
            <div className="rule-chip">Century: <b>+25</b></div>
          </div>

          {/* Commentary Feed */}
          <div className="telemetry-feed-box" style={{ marginBottom: "16px" }}>
            <div className="feed-header">MATCH TELEMETRY & COMMENTARY</div>
            <div id="latest-commentary" className="commentary-content" style={{ fontWeight: 600, color: "var(--cricket-navy-dark)", marginBottom: "8px" }}>
              {matchCommentary}
            </div>
            <div style={{ maxHeight: "120px", overflowY: "auto", fontSize: "0.82rem", color: "var(--text-muted)" }}>
              {deliveriesLog.map((del, i) => (
                <div key={i} style={{ padding: "3px 0", borderBottom: "1px dashed #e2e8f0" }}>
                  🏏 {del}
                </div>
              ))}
            </div>
          </div>

          {/* Squad Leaderboard & Points Breakdown */}
          <div className="squad-points-overview">
            <div className="points-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontWeight: 800, fontSize: "1.1rem" }}>Fantasy XI Scorecard</span>
              <span id="squad-total-points" className="total-pts-badge" style={{ fontSize: "1.2rem", fontWeight: 900, background: "var(--turf-green)", color: "white", padding: "4px 14px", borderRadius: "12px" }}>
                {totalPoints} Pts
              </span>
            </div>

            {selectedSquad.length === 0 ? (
              <div className="empty-state" style={{ padding: "24px" }}>
                Pick players on the left to inspect real-time fantasy score breakdown.
              </div>
            ) : (
              <div id="selected-squad-breakdown" className="squad-pts-list" style={{ maxHeight: "300px", overflowY: "auto" }}>
                {selectedSquad.map((player) => {
                  const pts = player.calculatedPoints || 0;
                  const stats = player.stats || { runs: 0, fours: 0, sixes: 0, wickets: 0, catches: 0 };
                  return (
                    <div
                      key={player.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 12px",
                        background: "white",
                        borderRadius: "8px",
                        marginBottom: "6px",
                        border: "1px solid var(--card-border)",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{player.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                          {stats.runs} runs ({stats.fours}x4, {stats.sixes}x6) · {stats.wickets} wkt · {player.multiplier}x multi
                        </div>
                      </div>
                      <div style={{ fontWeight: 800, color: "var(--cricket-navy-mid)", fontSize: "1.05rem" }}>
                        {pts} pts
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
