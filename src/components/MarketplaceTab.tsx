import React, { useState } from "react";
import { useCricket } from "../context/CricketContext";

export const MarketplaceTab: React.FC = () => {
  const {
    auctionListings,
    userCollection,
    listCardForAuction,
    buyAuctionItem,
    cancelAuctionListing,
    walletAddress,
    setInspectPlayer,
  } = useCricket();

  const [selectedCardId, setSelectedCardId] = useState<number | "">(
    userCollection.length > 0 ? userCollection[0].id : ""
  );
  const [priceInput, setPriceInput] = useState<number>(750);

  const handleListSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCardId) return;
    const playerToList = userCollection.find((p) => p.id === Number(selectedCardId));
    if (!playerToList) return;

    const success = listCardForAuction(playerToList, priceInput);
    if (success) {
      const remaining = userCollection.filter((p) => p.id !== playerToList.id);
      setSelectedCardId(remaining.length > 0 ? remaining[0].id : "");
    }
  };

  const sellerProceeds = (priceInput * 0.95).toFixed(1);
  const royaltyFee = (priceInput * 0.05).toFixed(1);

  return (
    <section id="section-marketplace" className="view-panel active">
      <div className="section-hero">
        <div className="hero-header-flex">
          <div>
            <span className="hero-kicker">MARKETPLACE</span>
            <h2 className="hero-title">Marketplace</h2>
            <p className="hero-sub">
              Decentralized peer-to-peer auction arena with guaranteed 5% creator royalties on every secondary transfer.
            </p>
          </div>
        </div>
        <div className="market-stats">
          <div className="mstat-card">
            <span className="mstat-label">Currency</span>
            <span className="mstat-val text-blue">CRIC Tokens</span>
          </div>
          <div className="mstat-card">
            <span className="mstat-label">Creator Royalties</span>
            <span className="mstat-val text-green">5% Auto-Routed</span>
          </div>
          <div className="mstat-card">
            <span className="mstat-label">Ticket Protection</span>
            <span className="mstat-val text-red">Fair Resale Cap</span>
          </div>
        </div>
      </div>

      {/* Put Card in Auction Form */}
      <div className="auction-listing-card">
        <div className="auction-form-header">
          <h3 className="panel-heading">Put a Card into the Auction</h3>
          <p className="panel-sub">Set an asking price and list an asset from your vault.</p>
        </div>

        <form onSubmit={handleListSubmit}>
          <div className="auction-form-row">
            <div className="form-group flex-2">
              <label className="form-label">Your asset</label>
              <select
                id="auction-card-select"
                className="form-control"
                value={selectedCardId}
                onChange={(e) => setSelectedCardId(e.target.value ? Number(e.target.value) : "")}
                disabled={userCollection.length === 0}
              >
                {userCollection.length === 0 ? (
                  <option value="">No unlisted cards in your collection</option>
                ) : (
                  userCollection.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.rarity} · {p.role}) · #{p.id}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="form-group flex-1">
              <label className="form-label">Price (CRIC)</label>
              <input
                type="number"
                id="auction-price-input"
                className="form-control"
                placeholder="e.g. 750"
                min="50"
                step="25"
                value={priceInput}
                onChange={(e) => setPriceInput(Math.max(50, Number(e.target.value)))}
                required
              />
            </div>

            <div className="form-group flex-btn">
              <button
                id="submit-auction-listing-btn"
                type="submit"
                className="btn btn-primary btn-block"
                disabled={userCollection.length === 0}
              >
                List for Auction
              </button>
            </div>
          </div>

          <div id="auction-royalty-preview" className="auction-payout-preview">
            <span>
              Seller Proceeds (95%): <b id="seller-proceeds-val">{sellerProceeds} CRIC</b>
            </span>
            <span style={{ marginLeft: "20px" }}>
              Creator Royalty (5%): <b id="royalty-fee-val">{royaltyFee} CRIC</b>
            </span>
          </div>
        </form>
      </div>

      <div className="marketplace-header-row" style={{ marginTop: "32px", marginBottom: "16px" }}>
        <h3 className="subheading">Active Auction Listings ({auctionListings.length})</h3>
      </div>

      {auctionListings.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 16px", color: "var(--text-dim)", background: "white", borderRadius: "12px" }}>
          <h3>No active listings in the auction room</h3>
          <p>Be the first to list an owned player card or stadium pass above!</p>
        </div>
      ) : (
        <div id="marketplace-list" className="marketplace-grid">
          {auctionListings.map((item) => {
            const isOwner = walletAddress && item.seller.toLowerCase() === walletAddress.toLowerCase();
            return (
              <div key={item.id} className="auction-item-card" style={{ background: "white", borderRadius: "16px", border: "1px solid var(--card-border)", overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
                <div className="card-banner" style={{ height: "190px" }}>
                  <img
                    className="card-img"
                    src={item.player.avatar}
                    alt={item.player.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(item.player.name)}`;
                    }}
                  />
                  <span className={`card-rarity-tag rarity-${item.player.rarity.toLowerCase()}`}>
                    {item.player.rarity}
                  </span>
                </div>

                <div style={{ padding: "18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <h4 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--cricket-navy-dark)" }}>
                        {item.player.name}
                      </h4>
                      <p style={{ fontSize: "0.82rem", color: "var(--text-dim)" }}>
                        {item.player.role} · {item.player.team}
                      </p>
                    </div>
                    <span style={{ fontSize: "0.75rem", background: "var(--stadium-grass-bg)", padding: "4px 8px", borderRadius: "6px", color: "var(--text-muted)" }}>
                      {item.createdAt}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f8fafc", borderRadius: "10px", margin: "14px 0", border: "1px solid #e2e8f0" }}>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", display: "block" }}>Asking Price</span>
                      <strong style={{ fontSize: "1.25rem", color: "var(--cricket-navy-mid)" }}>
                        {item.priceCRIC} CRIC
                      </strong>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", display: "block" }}>Seller</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {item.seller.slice(0, 6)}…{item.seller.slice(-4)}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1 }}
                      type="button"
                      onClick={() => setInspectPlayer(item.player)}
                    >
                      Inspect
                    </button>

                    {isOwner ? (
                      <button
                        className="btn btn-danger-outline btn-sm"
                        style={{ flex: 1 }}
                        type="button"
                        onClick={() => cancelAuctionListing(item.id)}
                      >
                        Cancel
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1.2 }}
                        type="button"
                        onClick={() => buyAuctionItem(item)}
                      >
                        Buy Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
