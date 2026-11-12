import React, { useState } from "react";
import { useCricket } from "../context/CricketContext";
import { Ticket } from "../types";
import { generateTicketQrSvg } from "../scoringEngine";

export const TicketsTab: React.FC = () => {
  const {
    tickets,
    ticketFilter,
    setTicketFilter,
    buyTicket,
    issueTicket,
    verifyTicketEntry,
    resetTicketScans,
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
  const [scanPayload, setScanPayload] = useState<string>("CV-PASS-101");

  // Detailed E-Ticket QR inspection modal
  const [inspectTicket, setInspectTicket] = useState<Ticket | null>(null);

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

  const handleQuickScanFromPass = (ticket: Ticket) => {
    const payload = `CV-PASS-${ticket.tokenId}`;
    setScanPayload(payload);
    verifyTicketEntry(payload);
    setInspectTicket(null);

    // Smooth scroll to turnstile scanner on mobile
    const scannerEl = document.getElementById("stadium-turnstile-scanner");
    if (scannerEl) {
      scannerEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <section id="section-tickets" className="view-panel active">
      <div className="tickets-layout">
        {/* Left: Ticket Catalog & Price Checker */}
        <div className="ticket-manager-col">
          <div className="section-hero section-hero-split">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px", width: "100%" }}>
              <div>
                <span className="hero-kicker">SMART TICKETING</span>
                <h2 className="hero-title" style={{ marginBottom: "4px" }}>Stadium Gate Passes</h2>
                <p className="hero-sub">
                  ERC-1155 smart contract passes with cryptographic anti-scalping 15% resale ceiling & scannable gate QRs.
                </p>
              </div>

              <button
                className="btn btn-outline btn-sm"
                type="button"
                onClick={() => setShowIssuePanel(!showIssuePanel)}
              >
                {showIssuePanel ? "Hide Issuer" : "+ Organizer: Issue Pass"}
              </button>
            </div>
          </div>

          <div className="filter-pills ticket-filters" role="group" aria-label="Filter tickets by fixture time" style={{ margin: "14px 0" }}>
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

          {/* Organizer Issue Panel */}
          {showIssuePanel && (
            <div id="ticket-issuer-panel" className="organizer-panel" style={{ background: "white", padding: "18px", borderRadius: "14px", border: "2px solid var(--boundary-rope)", marginBottom: "18px" }}>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: "10px" }}>Issue New On-Chain Pass</h3>
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
                    onChange={(e) => setStandInput(e.target.value)}
                    required
                  />
                </div>
                <div style={{ gridColumn: "1 / -1", marginTop: "4px" }}>
                  <button type="submit" className="btn btn-primary btn-block">
                    Mint Pass with 15% Resale Cap ({(faceValueInput * 1.15).toFixed(0)} CRIC)
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Ticket Grid */}
          <div className="tickets-grid" id="stadium-tickets-list" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            {filteredTickets.map((t) => {
              const isOwner = walletAddress && t.owner.toLowerCase() === walletAddress.toLowerCase();
              const passPayload = `CV-PASS-${t.tokenId}`;
              const qrSvgUri = generateTicketQrSvg(passPayload, 56);

              return (
                <div
                  key={t.id}
                  className="ticket-pass-card"
                  style={{
                    background: "white",
                    borderRadius: "16px",
                    border: `1.5px solid ${t.used ? "#cbd5e1" : isOwner ? "var(--turf-green-border)" : "var(--card-border)"}`,
                    padding: "16px",
                    position: "relative",
                    boxShadow: "var(--shadow-card)",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--turf-green-dark)", background: "var(--turf-green-light)", padding: "3px 8px", borderRadius: "6px" }}>
                          PASS #{t.tokenId}
                        </span>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "6px",
                            background: t.status === "LIVE" ? "#fee2e2" : t.status === "UPCOMING" ? "#e0f2fe" : "#f1f5f9",
                            color: t.status === "LIVE" ? "#b91c1c" : t.status === "UPCOMING" ? "#0369a1" : "#475569",
                          }}
                        >
                          {t.status}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "var(--text-dim)", marginTop: "4px" }}>
                        CODE: {passPayload}
                      </div>
                    </div>

                    {/* Scannable Mini QR Badge */}
                    <button
                      type="button"
                      onClick={() => setInspectTicket(t)}
                      title="Click to expand scannable matchday QR pass"
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "3px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <img
                        src={qrSvgUri}
                        alt={`QR Pass #${t.tokenId}`}
                        style={{ width: "46px", height: "46px", borderRadius: "4px", display: "block" }}
                      />
                    </button>
                  </div>

                  <h4 style={{ fontSize: "0.98rem", fontWeight: 800, color: "var(--cricket-navy-dark)", margin: "0 0 3px", lineHeight: 1.3 }}>
                    {t.matchName}
                  </h4>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginBottom: "10px" }}>
                    📍 {t.venue}
                  </p>

                  <div style={{ background: "var(--stadium-grass-bg)", padding: "8px 10px", borderRadius: "8px", fontSize: "0.78rem", marginBottom: "12px", border: "1px solid var(--boundary-rope)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Stand: <b>{t.stand}</b></span>
                      <span>Seat: <b>{t.seat}</b></span>
                    </div>
                    <div style={{ marginTop: "4px", color: "var(--text-dim)", fontSize: "0.74rem" }}>
                      Anti-Scalp Ceiling: <b style={{ color: "var(--ball-red)" }}>{t.maxResalePrice} CRIC</b> (+15% max)
                    </div>
                  </div>

                  <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                    <div>
                      <span style={{ fontSize: "0.65rem", color: "var(--text-dim)", textTransform: "uppercase", display: "block" }}>Face Value</span>
                      <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--cricket-navy-mid)" }}>
                        {t.faceValue} CRIC
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        style={{ padding: "5px 9px", fontSize: "0.75rem" }}
                        onClick={() => setInspectTicket(t)}
                        title="View scannable QR ticket pass"
                      >
                        QR Pass 🎟️
                      </button>

                      {t.used ? (
                        <span style={{ background: "#f1f5f9", color: "#64748b", padding: "5px 10px", borderRadius: "6px", fontWeight: 700, fontSize: "0.76rem" }}>
                          ✓ Scanned
                        </span>
                      ) : isOwner ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          style={{ padding: "5px 10px", fontSize: "0.75rem" }}
                          onClick={() => handleQuickScanFromPass(t)}
                          title="Verify this pass at stadium turnstile"
                        >
                          ⚡ Scan Entry
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ padding: "5px 12px", fontSize: "0.78rem" }}
                          onClick={() => buyTicket(t)}
                        >
                          Buy Pass
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Fair Price Auditor */}
          <div className="anti-scalp-test-card" style={{ background: "white", padding: "20px", borderRadius: "14px", border: "1px solid var(--card-border)" }}>
            <h3 className="card-title" style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: "4px" }}>
              Anti-Scalping Resale Price Auditor
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "14px" }}>
              Verify compliance with our smart contract's immutable 15% maximum resale markup rule.
            </p>

            <div className="resale-input-group" style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: 2, minWidth: "200px" }}>
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
                      Pass #{t.tokenId}: {t.stand} (Face: {t.faceValue} CRIC | Max: {t.maxResalePrice} CRIC)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1, minWidth: "140px" }}>
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
                Check Price
              </button>
            </div>

            {auditResult && (
              <div
                id="scalp-check-result"
                style={{
                  marginTop: "14px",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  background: auditResult.allowed ? "var(--turf-green-light)" : "#fef2f2",
                  border: `1px solid ${auditResult.allowed ? "var(--turf-green-border)" : "#fecaca"}`,
                  color: auditResult.allowed ? "var(--turf-green-dark)" : "#991b1b",
                  fontSize: "0.85rem",
                }}
              >
                {auditResult.allowed ? (
                  <div>
                    <strong>✅ APPROVED FOR LISTING:</strong> Proposed resale price of {testPriceInput} CRIC is within the fair ceiling of {auditResult.maxAllowed} CRIC (+15% max).
                  </div>
                ) : (
                  <div>
                    <strong>🚫 TRANSACTION BLOCKED BY CONTRACT:</strong> Proposed resale of {testPriceInput} CRIC exceeds the anti-scalping ceiling of {auditResult.maxAllowed} CRIC by {auditResult.diff} CRIC! Secondary price gouging is strictly rejected on-chain.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Stadium Turnstile Scanner */}
        <div className="gatekeeper-col" id="stadium-turnstile-scanner">
          <div className="gatekeeper-card" style={{ background: "white", padding: "20px", borderRadius: "16px", border: "1px solid var(--card-border)", boxShadow: "var(--shadow-card)" }}>
            <div className="gate-header">
              <span className="hero-kicker" style={{ fontSize: "0.72rem" }}>ON-CHAIN ENTRY CONTROL</span>
              <h3 className="card-title" style={{ fontSize: "1.15rem", fontWeight: 800 }}>
                Stadium Turnstile Scanner
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                Cryptographic gate validation with anti-double-entry protection
              </p>
            </div>

            <div className="qr-scanner-sim" style={{ margin: "14px 0" }}>
              {/* Dynamic Laser-Scanning Frame with Actual Vector QR */}
              <div
                className="scanner-frame"
                style={{
                  position: "relative",
                  width: "100%",
                  height: "210px",
                  background: "radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%)",
                  borderRadius: "14px",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1.5px solid #334155",
                  boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)",
                }}
              >
                <div className="scan-laser"></div>

                <div style={{ position: "relative", zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <img
                    src={generateTicketQrSvg(scanPayload || "CV-PASS-101", 120)}
                    alt="Turnstile Scannable QR"
                    style={{
                      width: "120px",
                      height: "120px",
                      borderRadius: "10px",
                      background: "white",
                      padding: "6px",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
                      display: "block",
                    }}
                  />
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "#38bdf8", marginTop: "8px", fontWeight: 700, letterSpacing: "0.05em" }}>
                    {scanPayload || "CV-PASS-101"}
                  </div>
                </div>
              </div>

              {/* Pass Presets & Quick Test Selectors */}
              <div style={{ marginTop: "12px" }}>
                <span className="sub-sm" style={{ fontWeight: 700, display: "block", marginBottom: "6px", fontSize: "0.78rem" }}>
                  Quick-Test Available Passes:
                </span>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                  {tickets.map((t) => {
                    const payload = `CV-PASS-${t.tokenId}`;
                    const isSelected = scanPayload.toUpperCase().includes(String(t.tokenId));
                    return (
                      <button
                        key={t.tokenId}
                        type="button"
                        onClick={() => setScanPayload(payload)}
                        style={{
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          padding: "4px 9px",
                          borderRadius: "6px",
                          border: isSelected ? "1.5px solid var(--turf-green)" : "1px solid #cbd5e1",
                          background: isSelected ? "var(--turf-green-light)" : "#f8fafc",
                          color: isSelected ? "var(--turf-green-dark)" : t.used ? "#94a3b8" : "#334155",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: t.used ? "#94a3b8" : "#22c55e" }}></span>
                        #{t.tokenId} {t.used ? "(Used)" : ""}
                      </button>
                    );
                  })}
                </div>

                <label className="sub-sm" htmlFor="ticket-scan-payload" style={{ fontWeight: 700, display: "block", marginBottom: "4px" }}>
                  Barcode Payload:
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    id="ticket-scan-payload"
                    className="form-control"
                    placeholder="e.g. CV-PASS-101 or 102"
                    value={scanPayload}
                    onChange={(e) => setScanPayload(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ whiteSpace: "nowrap" }}
                    onClick={() => setScanPayload("CV-PASS-101")}
                  >
                    #101
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ whiteSpace: "nowrap" }}
                    onClick={() => setScanPayload("CV-PASS-102")}
                  >
                    #102
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                <button
                  id="gatekeeper-scan-btn"
                  className="btn btn-success"
                  style={{ flex: 1, padding: "10px", fontSize: "0.88rem" }}
                  onClick={handleGateVerify}
                >
                  Verify Turnstile Entry ✓
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: "10px 12px", fontSize: "0.78rem" }}
                  onClick={resetTicketScans}
                  title="Reset all passes to unscanned state for re-testing"
                >
                  Reset Passes
                </button>
              </div>
            </div>

            {/* Turnstile Gate Log */}
            <div id="gatekeeper-log" className="gate-log-box" style={{ background: "#0f172a", color: "#f8fafc", borderRadius: "10px", padding: "12px" }}>
              <div className="log-title" style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "#94a3b8", marginBottom: "6px", display: "flex", justifyContent: "space-between" }}>
                <span>Turnstile Gate Activity Log</span>
                <span style={{ color: "#38bdf8" }}>{gatekeeperLogs.length} events</span>
              </div>
              <div id="log-messages" className="log-entries" style={{ maxHeight: "190px", overflowY: "auto", fontFamily: "var(--font-mono)", fontSize: "0.76rem" }}>
                {gatekeeperLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      padding: "4px 0",
                      color: log.type === "success" ? "#4ade80" : log.type === "error" ? "#f87171" : "#94a3b8",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                      lineHeight: 1.35,
                    }}
                  >
                    <span style={{ color: "#64748b" }}>[{log.time}]</span> {log.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scannable E-Ticket Modal */}
      {inspectTicket && (
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
          onClick={() => setInspectTicket(null)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "20px",
              maxWidth: "460px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              border: "1px solid #e2e8f0",
              textAlign: "center",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setInspectTicket(null)}
              style={{
                position: "absolute",
                top: "14px",
                right: "16px",
                background: "transparent",
                border: "none",
                fontSize: "1.6rem",
                color: "#64748b",
                cursor: "pointer",
              }}
            >
              ×
            </button>

            <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--turf-green-dark)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              MATCHDAY E-PASS # {inspectTicket.tokenId}
            </span>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--cricket-navy-dark)", margin: "4px 0 2px" }}>
              {inspectTicket.matchName}
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", marginBottom: "16px" }}>
              📍 {inspectTicket.venue}
            </p>

            {/* Scannable QR Code */}
            <div style={{ display: "inline-block", background: "#f8fafc", padding: "14px", borderRadius: "16px", border: "1.5px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}>
              <img
                src={generateTicketQrSvg(`CV-PASS-${inspectTicket.tokenId}`, 180)}
                alt={`Scannable QR for Ticket #${inspectTicket.tokenId}`}
                style={{ width: "180px", height: "180px", borderRadius: "8px", display: "block" }}
              />
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", fontWeight: 800, color: "var(--cricket-navy-mid)", marginTop: "8px" }}>
                CV-PASS-{inspectTicket.tokenId}
              </div>
            </div>

            <div style={{ marginTop: "16px", background: "var(--stadium-grass-bg)", padding: "10px 14px", borderRadius: "10px", textAlign: "left", fontSize: "0.82rem", border: "1px solid var(--boundary-rope)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "var(--text-dim)" }}>Stand & Tier:</span>
                <b>{inspectTicket.stand}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "var(--text-dim)" }}>Seat Assignment:</span>
                <b>{inspectTicket.seat}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "var(--text-dim)" }}>Face Value:</span>
                <b>{inspectTicket.faceValue} CRIC</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "4px", borderTop: "1px dashed #cbd5e1" }}>
                <span style={{ color: "var(--text-dim)" }}>Anti-Scalp Ceiling (+15%):</span>
                <b style={{ color: "var(--ball-red)" }}>{inspectTicket.maxResalePrice} CRIC</b>
              </div>
            </div>

            <div style={{ marginTop: "16px", display: "flex", gap: "10px" }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => setInspectTicket(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1.5 }}
                onClick={() => handleQuickScanFromPass(inspectTicket)}
              >
                ⚡ Scan at Turnstile
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
