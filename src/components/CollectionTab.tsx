import React, { useState } from "react";
import { useCricket } from "../context/CricketContext";
import { Player } from "../types";
import { generateSvgAvatar } from "../scoringEngine";

export const CollectionTab: React.FC = () => {
  const { userCollection, setInspectPlayer, listCardForAuction, setCurrentTab } = useCricket();

  const [listingPlayer, setListingPlayer] = useState<Player | null>(null);
  const [listingPrice, setListingPrice] = useState<number>(500);

  // Calculate vault valuation and rarest tier
  const totalCards = userCollection.length;
  const vaultValuation = userCollection.reduce((sum, p) => sum + (p.priceCRIC || 500), 0);

  const rarityPriority = { Legendary: 5, Epic: 4, Rare: 3, Uncommon: 2, Common: 1 };
  let rarestTier = "None";
  let maxPrio = 0;
  userCollection.forEach((p) => {
    const prio = rarityPriority[p.rarity] || 0;
    if (prio > maxPrio) {
      maxPrio = prio;
      rarestTier = p.rarity;
    }
  });

  const handleConfirmListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!listingPlayer) return;
    const success = listCardForAuction(listingPlayer, Number(listingPrice));
    if (success) {
      setListingPlayer(null);
    }
  };

  return (
    <section id="section-collection" className="view-panel active">
      <div className="section-hero">
        <div className="hero-header-flex">
          <div>
            <span className="hero-kicker">PORTFOLIO</span>
            <h2 className="hero-title">My collection</h2>
            <p className="hero-sub">
              Your verified on-chain cricket collectibles vault and active playing assets.
            </p>
          </div>
        </div>

        <div className="market-stats">
          <div className="mstat-card">
            <span className="mstat-label">Cards Owned</span>
            <span id="user-total-cards" className="mstat-val text-green">
              {totalCards}
            </span>
          </div>
          <div className="mstat-card">
            <span className="mstat-label">Vault Valuation</span>
            <span id="user-portfolio-value" className="mstat-val text-blue">
              {vaultValuation.toLocaleString()} CRIC
            </span>
          </div>
          <div className="mstat-card">
            <span className="mstat-label">Rarest Tier</span>
            <span id="user-rarest-tier" className="mstat-val text-accent">
              {rarestTier}
            </span>
          </div>
        </div>
      </div>

      {userCollection.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 20px", background: "white", borderRadius: "16px", border: "1px dashed var(--card-border)" }}>
          <h3 style={{ fontSize: "1.3rem", marginBottom: "8px", color: "var(--cricket-navy-dark)" }}>Your Vault is Empty</h3>
          <p style={{ color: "var(--text-muted)", marginBottom: "20px" }}>
            You do not own any player cards yet. Visit The Pavilion to mint your favorite cricketers!
          </p>
          <button className="btn btn-primary" onClick={() => setCurrentTab("cards")}>
            Explore The Pavilion
          </button>
        </div>
      ) : (
        <div id="collection-cards-grid" className="cards-grid">
          {userCollection.map((p, idx) => {
            const rarityClass = `rarity-${p.rarity.toLowerCase()}`;
            return (
              <div key={`${p.id}-${idx}`} className="player-card" data-id={p.id}>
                <div className="card-banner" style={{ height: "165px" }}>
                  <img
                    className="card-img"
                    src={p.avatar}
                    alt={p.name}
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
                      <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>{p.team}</div>
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
                      <span className="stat-label">Est. Value</span>
                      <span className="stat-val text-green">{p.priceCRIC || 500} CRIC</span>
                    </div>
                  </div>

                  <div className="card-actions" style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1 }}
                      type="button"
                      onClick={() => setInspectPlayer(p)}
                    >
                      Inspect SVG
                    </button>
                    <button
                      className="btn btn-accent btn-sm"
                      style={{ flex: 1.2 }}
                      type="button"
                      onClick={() => {
                        setListingPlayer(p);
                        setListingPrice(p.priceCRIC || 500);
                      }}
                    >
                      List on Auction
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List Modal */}
      {listingPlayer && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.7)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setListingPlayer(null)}
        >
          <div
            style={{
              background: "white",
              padding: "28px",
              borderRadius: "16px",
              maxWidth: "480px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--cricket-navy-dark)", marginBottom: "6px" }}>
              Put {listingPlayer.name} into Auction
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "20px" }}>
              Set your asking price in CRIC. Secondary sales enforce a 5% creator royalty.
            </p>

            <form onSubmit={handleConfirmListing}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "6px" }}>
                  Asking Price (CRIC)
                </label>
                <input
                  type="number"
                  className="form-control"
                  style={{ width: "100%", padding: "10px 14px" }}
                  min="50"
                  step="25"
                  value={listingPrice}
                  onChange={(e) => setListingPrice(Math.max(50, Number(e.target.value)))}
                  required
                />
              </div>

              <div
                style={{
                  background: "var(--stadium-grass-bg)",
                  padding: "14px",
                  borderRadius: "10px",
                  fontSize: "0.88rem",
                  marginBottom: "20px",
                  border: "1px solid var(--card-border)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span>Seller Proceeds (95%):</span>
                  <strong style={{ color: "var(--turf-green)" }}>
                    {(listingPrice * 0.95).toFixed(1)} CRIC
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Creator Royalty (5%):</span>
                  <strong style={{ color: "var(--cricket-blue-accent)" }}>
                    {(listingPrice * 0.05).toFixed(1)} CRIC
                  </strong>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setListingPlayer(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Auction Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
