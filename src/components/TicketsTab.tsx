import React, { useState } from "react";
import { useCricket } from "../context/CricketContext";
import { Ticket } from "../types";

export const TicketsTab: React.FC = () => {
  const {
    tickets,
    ticketFilter,
    setTicketFilter,
    buyTicket,
    issueTicket,
    verifyTicketEntry,
    gatekeeperLogs,
    walletAddress,
  } = useCricket();

  // Organizer Issue Form state
  const [showIssuePanel, setShowIssuePanel] = useState(false);
  const [tokenIdInput, setTokenIdInput] = useState(104);
  const [matchNameInput, setMatchNameInput] = useState("India vs England · T20 Semi-Final");
  const [venueInput, setVenueInput] = useState("Eden Gardens, Kolkata");
  const [standInput, setStandInput] = useState("Club House Tier 1");
  const [seatInput, setSeatInput] = useState("Row D · Seat 18");
  const [faceValueInput, setFaceValueInput] = useState(150);

  // Anti-scalping checker state
  const [selectedAuditTicketId, setSelectedAuditTicketId] = useState<number>(101);
  const [testPriceInput, setTestPriceInput] = useState<number>(250);
  const [auditResult, setAuditResult] = useState<{ checked: boolean; allowed: boolean; maxAllowed: number; diff: number } | null>(null);

  // Turnstile scanner state
  const [scanPayload, setScanPayload] = useState<string>("CV-TKT-101");

  const filteredTickets = tickets.filter((t) => {
    if (ticketFilter === "all") return true;
    return t.status === ticketFilter;
  });

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    issueTicket({
      tokenId: Number(tokenIdInput),
      matchId: 4,
      matchName: matchNameInput,
      venue: venueInput,
      stand: standInput,
      seat: seatInput,
      faceValue: Number(faceValueInput),
      startTime: new Date(Date.now() + 172800000).toISOString(),
      endTime: new Date(Date.now() + 190800000).toISOString(),
    });
    setTokenIdInput((prev) => prev + 1);
    setShowIssuePanel(false);
  };

  const runScalpCheck = () => {
    const ticket = tickets.find((t) => t.tokenId === Number(selectedAuditTicketId));
    if (!ticket) return;

    const maxAllowed = ticket.maxResalePrice;
    const testPrice = Number(testPriceInput);
    const allowed = testPrice <= maxAllowed;
    const diff = testPrice - maxAllowed;

    setAuditResult({
      checked: true,
      allowed,
      maxAllowed,
      diff,
    });
  };

  const handleGateVerify = () => {
    verifyTicketEntry(scanPayload);
  };

  return (
    <section id="section-tickets" className="view-panel active">
      <div className="tickets-layout">
        {/* Left: Ticket Catalog & Price Checker */}
        <div className="ticket-manager-col">
          <div className="section-hero">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <span className="hero-kicker">TICKETING</span>
                <h2 className="hero-title">Stadium Gate Passes</h2>
                <p className="hero-sub">
                  ERC-1155 smart contract passes with cryptographic anti-scalping 15% fair resale ceiling.
                </p>
              </div>

              <button
                className="btn btn-outline btn-sm"
                type="button"
                onClick={() => setShowIssuePanel(!showIssuePanel)}
              >
                {showIssuePanel ? "Hide Issuer" : "Organizer: Issue Pass"}
              </button>
            </div>
          </div>

          <div className="filter-pills ticket-filters" role="group" aria-label="Filter tickets by fixture time" style={{ margin: "16px 0" }}>
            <button
              className={`pill ${ticketFilter === "all" ? "active" : ""}`}
              onClick={() => setTicketFilter("all")}
            >
              All Passes ({tickets.length})
            </button>
            <button
              className={`pill ${ticketFilter === "LIVE" ? "active" : ""}`}
              onClick={() => setTicketFilter("LIVE")}
            >
              Live
            </button>
            <button
              className={`pill ${ticketFilter === "UPCOMING" ? "active" : ""}`}
              onClick={() => setTicketFilter("UPCOMING")}
            >
              Upcoming
            </button>
            <button
              className={`pill ${ticketFilter === "PAST" ? "active" : ""}`}
              onClick={() => setTicketFilter("PAST")}
            >
              Past
            </button>
          </div>

          {/* Organizer panel */}
          {showIssuePanel && (
            <div id="ticket-issuer-panel" className="organizer-panel" style={{ background: "white", padding: "20px", borderRadius: "14px", border: "2px solid var(--boundary-rope)", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "12px" }}>Issue New On-Chain Pass</h3>
              <form onSubmit={handleIssueSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="sub-sm" style={{ fontWeight: 700 }}>Pass ID</label>
                  <input
                    type="number"
                    className="form-control"
                    value={tokenIdInput}
                    onChange={(e) => setTokenIdInput(Number(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <label className="sub-sm" style={{ fontWeight: 700 }}>Face Value (CRIC)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={faceValueInput}
                    onChange={(e) => setFaceValueInput(Number(e.target.value))}
                    required
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="sub-sm" style={{ fontWeight: 700 }}>Fixture Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={matchNameInput}
                    onChange={(e) => setMatchNameInput(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="sub-sm" style={{ fontWeight: 700 }}>Stadium Venue</label>
                  <input
                    type="text"
                    className="form-control"
                    value={venueInput}
                    onChange={(e) => setVenueInput(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="sub-sm" style={{ fontWeight: 700 }}>Stand & Seat</label>
                  <input
                    type="text"
                    className="form-control"
                    value={`${standInput} · ${seatInput}`}
                    onChange={(e) => {
                      setStandInput(e.target.value);
                    }}
                    required
                  />
                </div>
                <div style={{ gridColumn: "1 / -1", marginTop: "6px" }}>
                  <button type="submit" className="btn btn-primary btn-block">
                    Mint Pass with 15% Resale Cap ({(faceValueInput * 1.15).toFixed(0)} CRIC)
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Ticket Grid */}
          <div className="tickets-grid" id="stadium-tickets-list" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", marginBottom: "28px" }}>
            {filteredTickets.map((t) => {
              const isOwner = walletAddress && t.owner.toLowerCase() === walletAddress.toLowerCase();
              return (
                <div
                  key={t.id}
                  style={{
                    background: "white",
                    borderRadius: "16px",
                    border: "1px solid var(--card-border)",
                    padding: "20px",
                    position: "relative",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--turf-green-dark)", background: "var(--turf-green-light)", padding: "4px 8px", borderRadius: "6px" }}>
                      PASS #{t.tokenId}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "4px 8px",
                        borderRadius: "6px",
                        background: t.status === "LIVE" ? "#fee2e2" : t.status === "UPCOMING" ? "#e0f2fe" : "#f1f5f9",
                        color: t.status === "LIVE" ? "#b91c1c" : t.status === "UPCOMING" ? "#0369a1" : "#475569",
                      }}
                    >
                      {t.status}
                    </span>
                  </div>

                  <h4 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--cricket-navy-dark)", margin: "8px 0 4px" }}>
                    {t.matchName}
                  </h4>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", marginBottom: "12px" }}>
                    📍 {t.venue}
                  </p>

                  <div style={{ background: "var(--stadium-grass-bg)", padding: "10px", borderRadius: "10px", fontSize: "0.82rem", marginBottom: "14px" }}>
                    <div>Stand: <b>{t.stand}</b></div>
                    <div>Seat: <b>{t.seat}</b></div>
                    <div style={{ marginTop: "4px", color: "var(--text-dim)" }}>
                      Resale ceiling: <b style={{ color: "var(--ball-red)" }}>{t.maxResalePrice} CRIC</b> (+15% max)
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Face Value</span>
                      <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "var(--cricket-navy-mid)" }}>
                        {t.faceValue} CRIC
                      </div>
                    </div>

                    {t.used ? (
                      <span style={{ background: "#f1f5f9", color: "#64748b", padding: "6px 12px", borderRadius: "8px", fontWeight: 700, fontSize: "0.85rem" }}>
                        Scanned / Used
                      </span>
                    ) : isOwner ? (
                      <span style={{ background: "var(--turf-green-light)", color: "var(--turf-green-dark)", padding: "6px 12px", borderRadius: "8px", fontWeight: 700, fontSize: "0.85rem" }}>
                        In Your Wallet
                      </span>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => buyTicket(t)}
                      >
                        Buy Pass
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Fair Price Auditor */}
          <div className="anti-scalp-test-card" style={{ background: "white", padding: "24px", borderRadius: "16px", border: "1px solid var(--card-border)" }}>
            <h3 className="card-title" style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "8px" }}>
              Resale price check (Anti-Scalping Auditor)
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "16px" }}>
              Test any proposed resale price against our smart contract's immutable 15% maximum resale markup rule.
            </p>

            <div className="resale-input-group" style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: 2, minWidth: "220px" }}>
                <label className="sub-sm" style={{ fontWeight: 700, display: "block", marginBottom: "4px" }}>
                  Stadium Pass
                </label>
                <select
                  id="verify-ticket-select"
                  className="form-control"
                  value={selectedAuditTicketId}
                  onChange={(e) => {
                    setSelectedAuditTicketId(Number(e.target.value));
                    setAuditResult(null);
                  }}
                >
                  {tickets.map((t) => (
                    <option key={t.tokenId} value={t.tokenId}>
                      Pass #{t.tokenId}: {t.stand} (Face: {t.faceValue} CRIC | Max Resale: {t.maxResalePrice} CRIC)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1, minWidth: "160px" }}>
                <label className="sub-sm" style={{ fontWeight: 700, display: "block", marginBottom: "4px" }}>
                  Proposed Resale Price
                </label>
                <input
                  type="number"
                  id="test-resale-price"
                  className="form-control"
                  placeholder="e.g. 250"
                  value={testPriceInput}
                  onChange={(e) => {
                    setTestPriceInput(Number(e.target.value));
                    setAuditResult(null);
                  }}
                />
              </div>

              <button
                id="run-scalp-check-btn"
                type="button"
                className="btn btn-accent"
                onClick={runScalpCheck}
              >
                Check price
              </button>
            </div>

            {auditResult && (
              <div
                id="scalp-check-result"
                style={{
                  marginTop: "16px",
                  padding: "14px 18px",
                  borderRadius: "10px",
                  background: auditResult.allowed ? "var(--turf-green-light)" : "#fef2f2",
                  border: `1px solid ${auditResult.allowed ? "var(--turf-green-border)" : "#fecaca"}`,
                  color: auditResult.allowed ? "var(--turf-green-dark)" : "#991b1b",
                }}
              >
                {auditResult.allowed ? (
                  <div>
                    <strong>✅ APPROVED FOR LISTING:</strong> Proposed resale price of {testPriceInput} CRIC is within the fair cap of {auditResult.maxAllowed} CRIC.
                  </div>
                ) : (
                  <div>
                    <strong>🚫 TRANSACTION BLOCKED BY CONTRACT:</strong> Proposed resale of {testPriceInput} CRIC exceeds the anti-scalping ceiling of {auditResult.maxAllowed} CRIC by {auditResult.diff} CRIC! Secondary price gouging is prohibited.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Turnstile Scanner */}
        <div className="gatekeeper-col">
          <div className="gatekeeper-card">
            <div className="gate-header">
              <h3 className="card-title" style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                Stadium Turnstile Scanner
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-dim)" }}>
                Gatekeeper verified entry scanner
              </p>
            </div>

            <div className="qr-scanner-sim" style={{ margin: "16px 0" }}>
              <div className="scanner-frame" style={{ position: "relative", width: "100%", height: "180px", background: "#0f172a", borderRadius: "12px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="scan-laser" style={{ position: "absolute", width: "100%", height: "2px", background: "#22c55e", boxShadow: "0 0 10px #22c55e", animation: "laser-scan 2s infinite ease-in-out" }}></div>
                <div className="qr-placeholder" style={{ color: "white", textAlign: "center" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "4px" }}>📱</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "#38bdf8" }}>
                    {scanPayload || "CV-TKT-101"}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "14px" }}>
                <label className="sub-sm" htmlFor="ticket-scan-payload" style={{ fontWeight: 700, display: "block", marginBottom: "4px" }}>
                  Scan Barcode or Paste Ticket ID:
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    id="ticket-scan-payload"
                    className="form-control"
                    placeholder="e.g. CV-TKT-101 or 102"
                    value={scanPayload}
                    onChange={(e) => setScanPayload(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setScanPayload("CV-TKT-101")}
                  >
                    Preset #101
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setScanPayload("CV-TKT-102")}
                  >
                    Preset #102
                  </button>
                </div>
              </div>

              <button
                id="gatekeeper-scan-btn"
                className="btn btn-success btn-block"
                style={{ marginTop: "14px", padding: "12px" }}
                onClick={handleGateVerify}
              >
                Verify Turnstile Entry
              </button>
            </div>

            <div id="gatekeeper-log" className="gate-log-box" style={{ background: "#0f172a", color: "#f8fafc", borderRadius: "10px", padding: "14px" }}>
              <div className="log-title" style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#94a3b8", marginBottom: "8px" }}>
                Turnstile Gate Log
              </div>
              <div id="log-messages" className="log-entries" style={{ maxHeight: "200px", overflowY: "auto", fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>
                {gatekeeperLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      padding: "4px 0",
                      color: log.type === "success" ? "#4ade80" : log.type === "error" ? "#f87171" : "#94a3b8",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    [{log.time}] {log.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
