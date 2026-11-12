import React from "react";
import { useCricket } from "../context/CricketContext";
import { PlayerRarity } from "../types";
import { generateSvgAvatar } from "../scoringEngine";

const RARITY_FILTERS: { label: string; value: string }[] = [
  { label: "All Squad", value: "all" },
  { label: "Legendary", value: "Legendary" },
  { label: "Epic", value: "Epic" },
  { label: "Rare", value: "Rare" },
  { label: "Uncommon", value: "Uncommon" },
  { label: "Common", value: "Common" },
];

export const PavilionTab: React.FC = () => {
  const {
    players,
    isLoadingPlayers,
    totalPlayers,
    currentPage,
    setCurrentPage,
    pageSize,
    activeFilter,
    setActiveFilter,
    searchQuery,
    setSearchQuery,
    mintCard,
    setInspectPlayer,
    isConnected,
  } = useCricket();

  const totalPages = Math.max(1, Math.ceil(totalPlayers / pageSize));

  return (
    <section id="section-cards" className="view-panel active">
      <div className="section-hero" style={{ marginBottom: "20px" }}>
        <div className="hero-header-flex">
          <div>
            <span className="hero-kicker">COLLECTIBLES</span>
            <h1 className="hero-title" style={{ fontSize: "1.85rem", marginBottom: "4px" }}>Player Cards</h1>
            <p className="hero-sub" style={{ fontSize: "0.9rem" }}>
              Collect your cricket greats from our comprehensive catalog of international & domestic cricketers.
            </p>
          </div>
        </div>

        <div className="filters-search-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: "12px", flexWrap: "wrap", marginTop: "8px" }}>
          <div className="filter-pills" style={{ margin: 0 }}>
            {RARITY_FILTERS.map((f) => (
              <button
                key={f.value}
                className={`pill ${activeFilter.toLowerCase() === f.value.toLowerCase() ? "active" : ""}`}
                data-filter={f.value}
                onClick={() => {
                  setActiveFilter(f.value);
                  setCurrentPage(1);
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="search-box-wrapper" style={{ maxWidth: "340px", margin: 0 }}>
            <input
              type="text"
              id="pavilion-search-input"
              className="input-search"
              placeholder="Search by player, team, country…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {isLoadingPlayers && players.length === 0 ? (
        <div className="empty-state" style={{ padding: "40px 16px" }}>
          Loading cricketers catalog…
        </div>
      ) : players.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 16px", color: "var(--text-dim)" }}>
          <h3 style={{ fontSize: "1.15rem", marginBottom: "6px" }}>No players found matching your criteria</h3>
          <p style={{ fontSize: "0.85rem" }}>Try clearing your search query or choosing a different rarity tier.</p>
        </div>
      ) : (
        <div id="cards-grid" className="cards-grid">
          {players.map((p) => {
            const rarityClass = `rarity-${p.rarity.toLowerCase()}`;
            return (
              <div key={p.id} className="player-card" data-id={p.id}>
                <div className="card-banner" style={{ height: "165px" }}>
                  <img
                    className="card-img"
                    src={p.avatar}
                    alt={p.name}
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.onerror = null;
                      target.src = generateSvgAvatar(p);
                    }}
                  />
                  <span className={`card-rarity-tag ${rarityClass}`}>{p.rarity}</span>
                </div>

                <div className="card-body">
                  <div className="card-title-group">
                    <div>
                      <div className="card-player-name">{p.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                        {p.team} {p.country ? `· ${p.country}` : ""}
                      </div>
                    </div>
                    <span className="card-role-chip">{p.role}</span>
                  </div>

                  <div className="card-stats-grid">
                    <div>
                      <span className="stat-label">Runs</span>
                      <span className="stat-val">{p.runs.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="stat-label">Wickets</span>
                      <span className="stat-val">{p.wickets}</span>
                    </div>
                    <div>
                      <span className="stat-label">Strike Rate</span>
                      <span className="stat-val">{p.strikeRate}</span>
                    </div>
                    <div>
                      <span className="stat-label">CRIC Value</span>
                      <span className="stat-val text-green" style={{ fontWeight: 800 }}>
                        {(p.priceCRIC || Math.max(150, Math.round((p.creditCost || 8.5) * 80 + (p.calculatedPoints || 0) * 5))).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="card-actions" style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1 }}
                      type="button"
                      onClick={() => setInspectPlayer(p)}
                      title="Inspect dynamic on-chain SVG representation"
                    >
                      Inspect SVG
                    </button>
                    {(() => {
                      const dynamicCost = p.priceCRIC || Math.max(150, Math.round((p.creditCost || 8.5) * 80 + (p.calculatedPoints || 0) * 5));
                      return (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1.35 }}
                          type="button"
                          onClick={() => mintCard(p)}
                          title={!isConnected ? "Connect wallet to collect" : `Mint / Collect card for ${dynamicCost.toLocaleString()} CRIC`}
                        >
                          Collect · {dynamicCost.toLocaleString()} CRIC
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div id="cards-pagination" className="pagination-controls" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", marginTop: "32px" }}>
          <button
            className="btn btn-outline btn-sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          >
            ← Previous
          </button>
          <span style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 600 }}>
            Page {currentPage} of {totalPages} ({totalPlayers.toLocaleString()} cricketers)
          </span>
          <button
            className="btn btn-outline btn-sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          >
            Next →
          </button>
        </div>
      )}
    </section>
  );
};
