import React, { useState } from "react";
import { useCricket, DEPLOYED_CONTRACTS } from "../context/CricketContext";
import { Player } from "../types";
import {
  generateSvgAvatar,
  generateZkSquadProof,
  verifyZkSquadProof,
  ZkSquadProof,
  ZkVerificationResult,
} from "../scoringEngine";

export const FantasyTab: React.FC = () => {
  const {
    allLoadedPlayers,
    selectedPlayerIds,
    toggleSelectPlayer,
    autoPickBalancedSquad,
    loadLiveMatchXI,
    clearSquad,
    todayMatches,
    selectedMatchId,
    setSelectedMatchId,
    matchCommentary,
    deliveriesLog,
    simulateOver,
    isLoadingLiveMatches,
    lastFeedSync,
    refreshLiveMatches,
    squadValidation,
    setPendingTx,
    showToast,
  } = useCricket();

  const [searchFilter, setSearchFilter] = useState<string>("");
  const [onlyLiveMatchPlayers, setOnlyLiveMatchPlayers] = useState<boolean>(false);

  // Zero-Knowledge Proof State for Playing XI
  const [zkProof, setZkProof] = useState<ZkSquadProof | null>(null);
  const [zkVerification, setZkVerification] = useState<ZkVerificationResult | null>(null);
  const [isProving, setIsProving] = useState<boolean>(false);
  const [showZkModal, setShowZkModal] = useState<boolean>(false);
  const [isZkCommitted, setIsZkCommitted] = useState<boolean>(false);
  const [copiedWitness, setCopiedWitness] = useState<boolean>(false);

  const selectedSquad = selectedPlayerIds
    .map((id) => allLoadedPlayers.find((p) => p.id === id))
    .filter((p): p is Player => Boolean(p));

  const totalPoints = Number(
    selectedSquad.reduce((sum, p) => sum + (p.calculatedPoints || 0), 0).toFixed(1)
  );

  const selectedMatch = todayMatches.find((m) => m.id === selectedMatchId) || todayMatches[0];
  const liveMatchPlayersCount = allLoadedPlayers.filter((p) => p.liveMatchId === selectedMatch?.id).length;

  const availableRoster = allLoadedPlayers
    .filter((p) => {
      if (onlyLiveMatchPlayers && selectedMatch && p.liveMatchId !== selectedMatch.id) {
        return false;
      }
      if (!searchFilter) return true;
      const q = searchFilter.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.team && p.team.toLowerCase().includes(q)) ||
        p.role.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      // Prioritize players from the currently selected live match at the top of the list
      const aInMatch = a.liveMatchId === selectedMatch?.id ? 1 : 0;
      const bInMatch = b.liveMatchId === selectedMatch?.id ? 1 : 0;
      if (aInMatch !== bInMatch) return bInMatch - aInMatch;
      return (b.calculatedPoints || 0) - (a.calculatedPoints || 0);
    });

  const salaryPercentage = Math.min(100, Math.round((squadValidation.totalCredits / 120) * 100));

  const roleCounts = squadValidation.roleCounts || {
    Wicketkeeper: 0,
    Batsman: 0,
    Bowler: 0,
    "All-Rounder": 0,
  };

  const handleGenerateZkProof = () => {
    if (selectedSquad.length !== 11) {
      showToast("Select exactly 11 players before generating ZK Proof.", true);
      return;
    }
    if (!squadValidation.isValid) {
      showToast(squadValidation.error || "Squad violates tournament salary cap or role regulations.", true);
      return;
    }

    setIsProving(true);
    setZkVerification(null);
    setIsZkCommitted(false);

    setTimeout(() => {
      const result = generateZkSquadProof(selectedSquad, selectedMatchId);
      setIsProving(false);
      if (result.error || !result.proof) {
        showToast(result.error || "ZK Proof generation failed.", true);
      } else {
        setZkProof(result.proof);
        showToast("⚡ ZK-SNARK Squad Proof generated! (BN254 curve, Groth16)");
      }
    }, 320);
  };

  const handleVerifyZkProof = () => {
    if (!zkProof) return;
    const verification = verifyZkSquadProof(zkProof);
    setZkVerification(verification);
    if (verification.isValid) {
      showToast("✓ ZK Proof mathematically verified! Bilinear pairing check passed.");
    } else {
      showToast(verification.message, true);
    }
  };

  const handleCommitZkProof = () => {
    if (!zkProof) return;
    setPendingTx({
      title: "Commit ZK Squad Proof On-Chain",
      description: `Cryptographically seal 11-player lineup on Cancun EVM (Commitment: ${zkProof.commitmentHash.slice(0, 10)}…)`,
      amountCRIC: 10,
      recipientAddress: DEPLOYED_CONTRACTS.contracts.TournamentPool,
      type: "ENTER_TOURNAMENT",
      details: {
        "Protocol": zkProof.protocol,
        "Circuit": zkProof.circuit,
        "Curve": zkProof.curve,
        "Commitment Hash": zkProof.commitmentHash,
        "Salary Cap": `${zkProof.constraintsSummary.totalCredits} / 120 cr`,
        "Playing XI Size": "11 Players (Secret)",
      },
      onConfirm: async () => {
        setIsZkCommitted(true);
        showToast("✓ ZK Proof commitment registered on blockchain block!");
      },
    });
    setIsZkCommitted(true);
  };

  const handleCopyProof = () => {
    if (!zkProof) return;
    navigator.clipboard.writeText(JSON.stringify(zkProof, null, 2));
    setCopiedWitness(true);
    showToast("Copied ZK Proof JSON to clipboard!");
    setTimeout(() => setCopiedWitness(false), 2000);
  };

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

          <div className="roster-pool-controls" style={{ flexWrap: "wrap" }}>
            <input
              type="text"
              id="player-search"
              className="input-search"
              style={{ minWidth: "200px", textAlign: "left" }}
              placeholder="Search players by name, role, team…"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
            <button
              id="load-live-xi-btn"
              className="btn btn-sm btn-primary"
              type="button"
              onClick={loadLiveMatchXI}
              title="Populate Playing XI from the selected live fixture's active scorecard"
            >
              ⚡ Load Live Match XI
            </button>
            <button
              id="auto-squad-btn"
              className="btn btn-sm btn-ghost"
              type="button"
              onClick={autoPickBalancedSquad}
            >
              Auto-Pick XI
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

          {liveMatchPlayersCount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", padding: "8px 12px", background: "#f0fdf4", border: "1px solid var(--turf-green-border)", borderRadius: "8px", fontSize: "0.8rem" }}>
              <span style={{ color: "var(--turf-green-dark)", fontWeight: 700 }}>
                🟢 {liveMatchPlayersCount} active players synced from {selectedMatch?.shortName} live scorecard
              </span>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                style={{ padding: "3px 10px", fontSize: "0.75rem", minHeight: "28px" }}
                onClick={() => setOnlyLiveMatchPlayers(!onlyLiveMatchPlayers)}
              >
                {onlyLiveMatchPlayers ? "Show All Available Players" : "Filter: This Match Only"}
              </button>
            </div>
          )}

          <div id="player-picker-list" className="player-picker-list" style={{ maxHeight: "560px", overflowY: "auto" }}>
            {availableRoster.slice(0, 80).map((player) => {
              const isSelected = selectedPlayerIds.includes(player.id);
              const isFromCurrentMatch = player.liveMatchId === selectedMatch?.id;
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
                    border: `1px solid ${isSelected ? "var(--turf-green-border)" : isFromCurrentMatch ? "#93c5fd" : "var(--card-border)"}`,
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <img
                      src={player.avatar}
                      alt={player.name}
                      style={{ width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = generateSvgAvatar(player);
                      }}
                    />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-main)" }}>
                          {player.name}
                        </span>
                        {isFromCurrentMatch && (
                          <span style={{ fontSize: "0.64rem", fontWeight: 800, padding: "2px 6px", borderRadius: "4px", background: "#dbeafe", color: "#1d4ed8", textTransform: "uppercase" }}>
                            LIVE IN MATCH
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: "2px" }}>
                        <span className={`rarity-tag-micro rarity-${player.rarity.toLowerCase()}`} style={{ marginRight: "6px" }}>
                          {player.rarity}
                        </span>
                        {player.role} · {player.team}
                        {player.stats && (player.stats.runs > 0 || player.stats.wickets > 0) && (
                          <span style={{ marginLeft: "6px", color: "var(--turf-green-dark)", fontWeight: 700 }}>
                            ({player.stats.runs}r, {player.stats.wickets}w · {player.calculatedPoints || 0} pts)
                          </span>
                        )}
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

        {/* Right: Live Match Simulator & Real-Time API Feed */}
        <div className="fantasy-simulation-card">
          <div className="sim-header" style={{ alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "220px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                <span className="live-tag" style={{ marginBottom: 0 }}>
                  <span className="pulse-dot-green" style={{ width: "7px", height: "7px", marginRight: "4px" }}></span>
                  {selectedMatch?.state === "in" ? "LIVE API FEED" : selectedMatch?.state === "post" ? "OFFICIAL RESULT" : "UPCOMING FIXTURE"}
                </span>
                {selectedMatch?.leagueName && (
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--cricket-blue-accent)", background: "#eff6ff", padding: "3px 8px", borderRadius: "6px", border: "1px solid #bfdbfe" }}>
                    {selectedMatch.leagueName} · {selectedMatch.eventType}
                  </span>
                )}
              </div>
              <h3 id="fantasy-match-title" className="title-md" style={{ lineHeight: 1.25 }}>
                {selectedMatch?.teams || "Live Cricket Match"}
              </h3>
              {selectedMatch?.venue && (
                <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: "3px" }}>
                  📍 {selectedMatch.venue}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => refreshLiveMatches(true)}
                disabled={isLoadingLiveMatches}
                title="Fetch latest live scores and player scorecards from ESPN Cricket API"
              >
                {isLoadingLiveMatches ? "Syncing…" : "↻ Sync Live API"}
              </button>
              <button
                id="simulate-over-btn"
                className="btn btn-primary btn-sm pulse-btn"
                type="button"
                onClick={simulateOver}
                disabled={selectedPlayerIds.length !== 11}
                title={selectedPlayerIds.length !== 11 ? "Select 11 players first" : "Simulate an over"}
              >
                Simulate 6-Ball Over
              </button>
            </div>
          </div>

          {/* Live Team Scoreboard Banner */}
          {selectedMatch?.competitors && selectedMatch.competitors.length > 0 && (
            <div
              style={{
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                color: "#f8fafc",
                borderRadius: "12px",
                padding: "14px 16px",
                marginBottom: "14px",
                border: "1px solid #334155",
                boxShadow: "0 4px 14px rgba(15, 23, 42, 0.12)",
              }}
            >
              <div style={{ display: "grid", gap: "10px" }}>
                {selectedMatch.competitors.map((comp, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingBottom: idx === 0 && selectedMatch.competitors.length > 1 ? "8px" : "0",
                      borderBottom: idx === 0 && selectedMatch.competitors.length > 1 ? "1px solid rgba(255,255,255,0.1)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {comp.logo ? (
                        <img
                          src={comp.logo}
                          alt={comp.shortName}
                          style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#fff", padding: "2px", objectFit: "contain" }}
                        />
                      ) : (
                        <span style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#334155", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 800 }}>
                          {comp.shortName.slice(0, 3)}
                        </span>
                      )}
                      <div>
                        <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "#ffffff" }}>
                          {comp.name}
                        </span>
                        {comp.winner && (
                          <span style={{ marginLeft: "6px", fontSize: "0.7rem", color: "#4ade80", fontWeight: 800 }}>
                            ★ WON
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "0.96rem", color: "#38bdf8" }}>
                      {comp.score || "Yet to bat"}
                    </div>
                  </div>
                ))}
              </div>
              {selectedMatch.summaryText && (
                <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px dashed rgba(255,255,255,0.15)", fontSize: "0.78rem", color: "#cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                  <span>📢 {selectedMatch.summaryText}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "#94a3b8" }}>
                    Updated {lastFeedSync}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="fixture-selector-box">
            <label htmlFor="matchday-match-select" className="form-label">
              Select Live Global Fixture ({todayMatches.length} Active Matches)
            </label>
            <select
              id="matchday-match-select"
              className="form-control"
              value={selectedMatchId}
              onChange={(e) => setSelectedMatchId(Number(e.target.value))}
            >
              {todayMatches.map((m) => (
                <option key={m.id} value={m.id}>
                  [{m.leagueName}] {m.teams} — {m.status}
                </option>
              ))}
            </select>
            <span id="matchday-api-status" className="sub-sm text-dim" role="status" style={{ display: "block", marginTop: "2px", fontSize: "0.78rem" }}>
              🟢 ESPN Cricket Live API Connected ({todayMatches.length} fixtures) · Auto-syncing every 25s
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
            <div className="feed-header">LIVE MATCH TELEMETRY & COMMENTARY</div>
            <div id="latest-commentary" className="commentary-content" style={{ fontWeight: 600, color: "var(--cricket-navy-dark)", marginBottom: "8px" }}>
              {matchCommentary}
            </div>
            <div style={{ maxHeight: "130px", overflowY: "auto", fontSize: "0.82rem", color: "var(--text-muted)" }}>
              {deliveriesLog.map((del, i) => (
                <div key={i} style={{ padding: "4px 0", borderBottom: "1px dashed #e2e8f0" }}>
                  🏏 {del}
                </div>
              ))}
            </div>
          </div>

          {/* Squad Leaderboard & Points Breakdown */}
          <div className="squad-points-overview" style={{ background: "#ffffff", border: "1px solid var(--card-border)", borderRadius: "14px", padding: "16px", boxShadow: "var(--shadow-card)" }}>
            <div className="points-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--cricket-navy-dark)" }}>
                  Fantasy XI Scorecard
                </span>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "2px 8px", borderRadius: "12px", background: selectedSquad.length === 11 ? "#dcfce7" : "#f1f5f9", color: selectedSquad.length === 11 ? "#166534" : "#475569" }}>
                  {selectedSquad.length}/11 Selected
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {selectedSquad.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                    onClick={clearSquad}
                  >
                    Reset XI
                  </button>
                )}
                <span id="squad-total-points" className="total-pts-badge" style={{ fontSize: "1.05rem", fontWeight: 900, background: "var(--turf-green)", color: "white", padding: "3px 12px", borderRadius: "10px" }}>
                  {totalPoints} Pts
                </span>
              </div>
            </div>

            {selectedSquad.length === 0 ? (
              <div style={{ background: "#f8fafc", border: "1.5px dashed #cbd5e1", borderRadius: "12px", padding: "24px 20px", textAlign: "center" }}>
                <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🏏</div>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--cricket-navy-dark)", marginBottom: "4px" }}>
                  No Players in Your Playing XI Yet
                </h4>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", maxWidth: "340px", margin: "0 auto 16px", lineHeight: 1.4 }}>
                  Select players individually from the roster, or field a lineup with a single click below:
                </p>
                <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={loadLiveMatchXI}
                    title="Populate from active live match scorecard"
                  >
                    ⚡ Load Live Match XI
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={autoPickBalancedSquad}
                  >
                    Auto-Pick Balanced XI
                  </button>
                </div>
              </div>
            ) : (
              <div id="selected-squad-breakdown" className="squad-pts-list" style={{ maxHeight: "320px", overflowY: "auto", display: "grid", gap: "6px" }}>
                {selectedSquad.map((player) => {
                  const pts = player.calculatedPoints || 0;
                  const stats = player.stats || { runs: 0, fours: 0, sixes: 0, wickets: 0, catches: 0 };
                  const isLive = player.liveMatchId === selectedMatch?.id;
                  return (
                    <div
                      key={player.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 12px",
                        background: isLive ? "#f0fdf4" : "#ffffff",
                        borderRadius: "8px",
                        border: `1px solid ${isLive ? "var(--turf-green-border)" : "var(--card-border)"}`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <img
                          src={player.avatar}
                          alt={player.name}
                          style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = generateSvgAvatar(player);
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "6px" }}>
                            <span>{player.name}</span>
                            {isLive && (
                              <span style={{ fontSize: "0.62rem", color: "#1d4ed8", background: "#dbeafe", padding: "1px 5px", borderRadius: "4px", fontWeight: 800 }}>
                                LIVE
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                            {player.role} · {stats.runs}r ({stats.fours}x4, {stats.sixes}x6) · {stats.wickets}w · {player.multiplier}x
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 800, color: "var(--cricket-navy-dark)", fontSize: "0.95rem" }}>
                          {pts} pts
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleSelectPlayer(player.id)}
                          style={{ background: "none", border: "none", color: "#ef4444", fontSize: "0.7rem", cursor: "pointer", padding: "2px", fontWeight: 600 }}
                          title="Remove player"
                        >
                          Remove ×
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Zero-Knowledge (ZK) Playing XI Verification Panel */}
          <div
            id="zk-squad-verifier"
            style={{
              marginTop: "16px",
              background: "#ffffff",
              border: "1.5px solid #e2e8f0",
              borderRadius: "14px",
              padding: "16px",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#4338ca", background: "#e0e7ff", padding: "2px 8px", borderRadius: "6px" }}>
                    ZERO-KNOWLEDGE PROOF
                  </span>
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#047857", background: "#d1fae5", padding: "2px 6px", borderRadius: "6px" }}>
                    Groth16 / BN254
                  </span>
                </div>
                <h4 style={{ fontSize: "1.02rem", fontWeight: 900, color: "var(--cricket-navy-dark)", margin: "4px 0 2px" }}>
                  ZK Playing XI Proof & Seal
                </h4>
              </div>

              <div style={{ textAlign: "right" }}>
                {zkProof ? (
                  <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "#16a34a", fontWeight: 700, background: "#f0fdf4", padding: "3px 8px", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
                    ✓ Witness Synthesized ({zkProof.generationDurationMs}ms)
                  </span>
                ) : (
                  <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                    Lineup Privacy Guard
                  </span>
                )}
              </div>
            </div>

            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "12px", lineHeight: 1.4 }}>
              Prove your 11-player lineup mathematically complies with the 120-credit cap and role quotas without exposing your tactical picks to competitors before match start.
            </p>

            {!zkProof ? (
              <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "10px", padding: "14px", textAlign: "center" }}>
                <div style={{ fontSize: "0.82rem", color: "var(--text-dim)", marginBottom: "10px" }}>
                  {selectedSquad.length === 11
                    ? "Your 11-player squad is ready! Generate a zero-knowledge commitment to seal your strategy."
                    : `Pick ${11 - selectedSquad.length} more player${11 - selectedSquad.length === 1 ? "" : "s"} to synthesize ZK constraint proof.`}
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ minWidth: "220px", padding: "8px 16px" }}
                  onClick={handleGenerateZkProof}
                  disabled={selectedSquad.length !== 11 || isProving}
                >
                  {isProving ? "Synthesizing R1CS Witness over BN254…" : "⚡ Generate ZK Proof for Playing XI"}
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                {/* Cryptographic Commitment Banner */}
                <div style={{ background: "#0f172a", color: "#f8fafc", borderRadius: "10px", padding: "12px", fontFamily: "var(--font-mono)", fontSize: "0.76rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", color: "#94a3b8", fontSize: "0.7rem", textTransform: "uppercase" }}>
                    <span>Poseidon / Keccak-256 Squad Commitment:</span>
                    <button
                      type="button"
                      onClick={handleCopyProof}
                      style={{ background: "transparent", border: "none", color: "#38bdf8", cursor: "pointer", fontSize: "0.7rem", fontWeight: 700 }}
                    >
                      {copiedWitness ? "Copied! ✓" : "Copy Proof JSON 📋"}
                    </button>
                  </div>
                  <div style={{ color: "#38bdf8", wordBreak: "break-all", fontWeight: 700 }}>
                    {zkProof.commitmentHash}
                  </div>
                </div>

                {/* Constraint Verification Checklist */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.78rem" }}>
                  <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <span style={{ color: "var(--text-dim)", display: "block", fontSize: "0.68rem" }}>Squad Cardinality</span>
                    <strong style={{ color: "#166534" }}>✓ Exactly 11 Unique Players</strong>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <span style={{ color: "var(--text-dim)", display: "block", fontSize: "0.68rem" }}>Salary Cap Range Proof</span>
                    <strong style={{ color: "#166534" }}>✓ {zkProof.constraintsSummary.totalCredits} / 120.0 cr (Valid)</strong>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: "8px", border: "1px solid #e2e8f0", gridColumn: "1 / -1" }}>
                    <span style={{ color: "var(--text-dim)", display: "block", fontSize: "0.68rem" }}>Role Regulations Enforced</span>
                    <strong style={{ color: "#166534" }}>
                      ✓ {zkProof.constraintsSummary.roleBreakdown.wk} WK (≥1) · {zkProof.constraintsSummary.roleBreakdown.bat} BAT (≥3) · {zkProof.constraintsSummary.roleBreakdown.bowl} BOWL (≥3) · {zkProof.constraintsSummary.roleBreakdown.ar} AR (≥1)
                    </strong>
                  </div>
                </div>

                {/* Verification Result Banner */}
                {zkVerification && (
                  <div
                    style={{
                      background: zkVerification.isValid ? "#f0fdf4" : "#fef2f2",
                      border: `1.5px solid ${zkVerification.isValid ? "#86efac" : "#fecaca"}`,
                      borderRadius: "10px",
                      padding: "10px 14px",
                      fontSize: "0.8rem",
                      color: zkVerification.isValid ? "#166534" : "#991b1b",
                    }}
                  >
                    <div style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <span>{zkVerification.isValid ? "✅ ZK-SNARK MATHEMATICALLY VERIFIED" : "❌ VERIFICATION FAILED"}</span>
                      <span style={{ fontSize: "0.68rem", background: "white", padding: "1px 6px", borderRadius: "4px", border: "1px solid rgba(0,0,0,0.1)" }}>
                        {zkVerification.verificationKeyId}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.74rem", lineHeight: 1.35 }}>
                      {zkVerification.message}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ flex: 1, padding: "7px 12px", fontSize: "0.78rem" }}
                    onClick={handleVerifyZkProof}
                  >
                    🔍 Verify Proof (Pairing Check)
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: "7px 12px", fontSize: "0.78rem" }}
                    onClick={() => setShowZkModal(true)}
                  >
                    📜 Raw Proof JSON
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1.2, padding: "7px 12px", fontSize: "0.78rem" }}
                    onClick={handleCommitZkProof}
                  >
                    {isZkCommitted ? "Committed to Chain ✓" : "⛓️ Commit ZK Proof On-Chain"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Raw ZK Proof JSON Modal */}
      {showZkModal && zkProof && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(10, 20, 35, 0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 10005,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setShowZkModal(false)}
        >
          <div
            style={{
              background: "#0f172a",
              color: "#f8fafc",
              borderRadius: "18px",
              maxWidth: "640px",
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "22px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              border: "1px solid #334155",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px", borderBottom: "1px solid #334155", paddingBottom: "10px" }}>
              <div>
                <span style={{ fontSize: "0.7rem", color: "#38bdf8", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  GROTH16 / BN254 WITNESS & PROOF PAYLOAD
                </span>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: "2px 0 0", color: "#ffffff" }}>
                  ZK Squad Proof Artifact
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowZkModal(false)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "1.5rem", cursor: "pointer", lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            <pre
              style={{
                background: "#020617",
                border: "1px solid #1e293b",
                borderRadius: "10px",
                padding: "14px",
                fontSize: "0.75rem",
                fontFamily: "var(--font-mono)",
                color: "#38bdf8",
                overflowX: "auto",
                maxHeight: "380px",
                lineHeight: 1.45,
              }}
            >
              {JSON.stringify(zkProof, null, 2)}
            </pre>

            <div style={{ marginTop: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                Curve: alt_bn128 (BN254) · Prover Time: {zkProof.generationDurationMs}ms
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={handleCopyProof}
                  style={{ color: "#38bdf8", borderColor: "#38bdf8", background: "transparent" }}
                >
                  {copiedWitness ? "Copied! ✓" : "Copy JSON"}
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowZkModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

