import React, { useState } from "react";
import { useCricket } from "../context/CricketContext";

export const TournamentsTab: React.FC = () => {
  const {
    tournaments,
    selectedTournamentId,
    setSelectedTournamentId,
    enterTournament,
    createTournament,
    cricBalance,
  } = useCricket();

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [entryFee, setEntryFee] = useState(100);
  const [maxEntries, setMaxEntries] = useState(50);

  const activeTourn = tournaments.find((t) => t.id === selectedTournamentId) || tournaments[0];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createTournament(name, 1, entryFee, maxEntries, 24);
    setName("");
    setShowCreate(false);
  };

  return (
    <section id="section-tournaments" className="view-panel active">
      <div className="section-hero">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <span className="hero-kicker">FANTASY LEAGUES</span>
            <h2 className="hero-title">Tournaments</h2>
            <p className="hero-sub">
              Stake your Playing XI against global cricket managers in provably fair on-chain tournament prize pools.
            </p>
          </div>

          <button
            className="btn btn-outline btn-sm"
            type="button"
            onClick={() => setShowCreate(!showCreate)}
          >
            {showCreate ? "Cancel" : "Create League"}
          </button>
        </div>
      </div>

      {showCreate && (
        <div id="tournament-create-panel" className="organizer-panel" style={{ background: "white", padding: "20px", borderRadius: "14px", border: "2px solid var(--boundary-rope)", marginBottom: "24px" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "12px" }}>Create Fantasy Tournament Pool</h3>
          <form onSubmit={handleCreateSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="sub-sm" style={{ fontWeight: 700 }}>Tournament Name</label>
              <input
                className="form-control"
                placeholder="e.g. Champions Trophy Eliminator Cup"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="sub-sm" style={{ fontWeight: 700 }}>Entry Fee (CRIC)</label>
              <input
                type="number"
                min="10"
                className="form-control"
                value={entryFee}
                onChange={(e) => setEntryFee(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className="sub-sm" style={{ fontWeight: 700 }}>Max Entries</label>
              <input
                type="number"
                min="2"
                max="1000"
                className="form-control"
                value={maxEntries}
                onChange={(e) => setMaxEntries(Number(e.target.value))}
                required
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <button type="submit" className="btn btn-primary btn-block">
                Deploy On-Chain Tournament
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="tournament-layout">
        <div className="tournament-pools-col">
          <h3 className="panel-heading" style={{ marginBottom: "16px" }}>Active Contests</h3>
          <div id="tournament-list" className="tournament-grid" style={{ display: "grid", gap: "16px" }}>
            {tournaments.map((t) => {
              const isSelected = t.id === selectedTournamentId;
              return (
                <div
                  key={t.id}
                  style={{
                    background: "white",
                    borderRadius: "14px",
                    border: `2px solid ${isSelected ? "var(--cricket-blue-accent)" : "var(--card-border)"}`,
                    padding: "18px",
                    boxShadow: "var(--shadow-card)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onClick={() => setSelectedTournamentId(t.id)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <h4 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--cricket-navy-dark)" }}>
                      {t.name}
                    </h4>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 800,
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background: t.status === "OPEN" ? "var(--turf-green-light)" : "#f1f5f9",
                        color: t.status === "OPEN" ? "var(--turf-green-dark)" : "#64748b",
                      }}
                    >
                      {t.status}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", background: "var(--stadium-grass-bg)", padding: "10px", borderRadius: "8px", margin: "12px 0" }}>
                    <div>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", display: "block" }}>PRIZE POOL</span>
                      <strong style={{ fontSize: "0.95rem", color: "var(--turf-green-dark)" }}>
                        {t.poolCRIC.toLocaleString()} CRIC
                      </strong>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", display: "block" }}>ENTRY FEE</span>
                      <strong style={{ fontSize: "0.95rem", color: "var(--cricket-navy-mid)" }}>
                        {t.entryFee} CRIC
                      </strong>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", display: "block" }}>SPOTS FILLED</span>
                      <strong style={{ fontSize: "0.95rem", color: "var(--text-main)" }}>
                        {t.entriesCount}/{t.maxEntries}
                      </strong>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button
                      className="btn btn-outline btn-sm"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTournamentId(t.id);
                      }}
                    >
                      View Leaderboard
                    </button>

                    {t.status === "OPEN" ? (
                      <button
                        className="btn btn-primary btn-sm"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          enterTournament(t.id);
                        }}
                      >
                        Join Pool ({t.entryFee} CRIC)
                      </button>
                    ) : (
                      <span style={{ fontSize: "0.85rem", color: "var(--text-dim)", fontWeight: 700 }}>
                        Contest Settled
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="tournament-leaderboard-col">
          <div className="panel-card" style={{ background: "white", padding: "24px", borderRadius: "16px", border: "1px solid var(--card-border)" }}>
            <div className="leaderboard-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 className="panel-heading" style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                  Tournament Entries & Prizes
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-dim)" }}>
                  {activeTourn ? activeTourn.name : "Select a league"}
                </p>
              </div>
              <span className="badge-live-feed" style={{ background: "#dcfce7", color: "#15803d", padding: "4px 10px", borderRadius: "12px", fontSize: "0.78rem", fontWeight: 700 }}>
                On-Chain Verified
              </span>
            </div>

            <label className="sub-sm" htmlFor="tournament-leaderboard-select" style={{ fontWeight: 700, display: "block", marginBottom: "6px" }}>
              Switch Contest Leaderboard:
            </label>
            <select
              id="tournament-leaderboard-select"
              className="form-control"
              style={{ marginBottom: "16px" }}
              value={selectedTournamentId}
              onChange={(e) => setSelectedTournamentId(Number(e.target.value))}
            >
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.status}) · {t.poolCRIC} CRIC Pool
                </option>
              ))}
            </select>

            <div className="table-wrap" style={{ overflowX: "auto" }}>
              <table className="leaderboard-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0", color: "var(--text-dim)" }}>
                    <th style={{ padding: "10px 8px" }}>Rank</th>
                    <th style={{ padding: "10px 8px" }}>Wallet</th>
                    <th style={{ padding: "10px 8px" }}>Squad Commitment</th>
                    <th style={{ padding: "10px 8px" }}>Points</th>
                    <th style={{ padding: "10px 8px" }}>Payout</th>
                  </tr>
                </thead>
                <tbody id="leaderboard-tbody">
                  {(!activeTourn?.entries || activeTourn.entries.length === 0) ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "24px", color: "var(--text-dim)" }}>
                        No entries yet in this pool. Be the first to stake your squad!
                      </td>
                    </tr>
                  ) : (
                    activeTourn.entries.map((entry, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "12px 8px", fontWeight: 800 }}>
                          {entry.rank === 1 ? "🥇 1" : entry.rank === 2 ? "🥈 2" : entry.rank === 3 ? "🥉 3" : entry.rank}
                        </td>
                        <td style={{ padding: "12px 8px", fontFamily: "var(--font-mono)" }}>
                          {entry.address}
                        </td>
                        <td style={{ padding: "12px 8px", fontFamily: "var(--font-mono)", color: "var(--cricket-blue-accent)" }}>
                          {entry.squadCommitment}
                        </td>
                        <td style={{ padding: "12px 8px", fontWeight: 700, color: "var(--cricket-navy-dark)" }}>
                          {entry.points} pts
                        </td>
                        <td style={{ padding: "12px 8px", fontWeight: 800, color: "var(--turf-green-dark)" }}>
                          {entry.payout > 0 ? `${entry.payout} CRIC` : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
