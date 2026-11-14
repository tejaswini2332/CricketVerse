import React, { useEffect, useState } from "react";
import { useCricket, SignedTicketPass, DEPLOYED_CONTRACTS } from "../context/CricketContext";
import { Ticket } from "../types";
import { generateTicketQrSvg } from "../scoringEngine";

export const TicketsTab: React.FC = () => {
  const {
    tickets,
    ticketFilter,
    setTicketFilter,
    buyTicket,
    issueTicket,
    signTicketEntryPass,
    verifyTicketEntry,
    syncOnChainTickets,
    gatekeeperLogs,
    walletAddress,
  } = useCricket();

  // Organizer Issue Form state
  const [showIssuePanel, setShowIssuePanel] = useState(false);
  const [tokenIdInput, setTokenIdInput] = useState(105);
  const [matchNameInput, setMatchNameInput] = useState("India vs England · T20 Semi-Final");
  const [venueInput, setVenueInput] = useState("Eden Gardens, Kolkata");
  const [standInput, setStandInput] = useState("Club House Tier 1");
  const [seatInput, setSeatInput] = useState("Row D · Seat 18");
  const [faceValueInput, setFaceValueInput] = useState(150);
  const [issueTiming, setIssueTiming] = useState<"LIVE" | "UPCOMING">("LIVE");

  // Anti-scalping checker state
  const [selectedAuditTicketId, setSelectedAuditTicketId] = useState<number>(102);
  const [testPriceInput, setTestPriceInput] = useState<number>(250);
  const [auditResult, setAuditResult] = useState<{ checked: boolean; allowed: boolean; maxAllowed: number; diff: number } | null>(null);

  // Turnstile scanner state (requires signed CVPASS1 payload)
  const [scanPayload, setScanPayload] = useState<string>("");
  const [signedPasses, setSignedPasses] = useState<Record<number, SignedTicketPass>>({});
  const [isVerifying, setIsVerifying] = useState(false);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  // Detailed E-Ticket QR inspection modal
  const [inspectTicket, setInspectTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredTickets = tickets.filter((t) => {
    if (ticketFilter === "all") return true;
    return t.status === ticketFilter;
  });

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const maxExisting = tickets.length ? Math.max(...tickets.map((t) => t.tokenId)) : 104;
    const nextTokenId = tickets.some((t) => t.tokenId === Number(tokenIdInput))
      ? maxExisting + 1
      : Number(tokenIdInput);

    const nowMs = Date.now();
    const startTime =
      issueTiming === "LIVE"
        ? new Date(nowMs - 3600000).toISOString()
        : new Date(nowMs + 172800000).toISOString();
    const endTime =
      issueTiming === "LIVE"
        ? new Date(nowMs + 14400000).toISOString()
        : new Date(nowMs + 190800000).toISOString();

    await issueTicket({
      tokenId: nextTokenId,
      matchId: nextTokenId + 400,
      matchName: matchNameInput,
      venue: venueInput,
      stand: standInput,
      seat: seatInput,
      faceValue: Number(faceValueInput),
      startTime,
      endTime,
    });
    setTokenIdInput(nextTokenId + 1);
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

  const handleSignPass = async (ticket: Ticket) => {
    const signed = await signTicketEntryPass(ticket.tokenId, 120);
    if (signed) {
      setSignedPasses((prev) => ({ ...prev, [ticket.tokenId]: signed }));
      setScanPayload(signed.payload);
    }
    return signed;
  };

  const handleGateVerify = async () => {
    setIsVerifying(true);
    try {
      await verifyTicketEntry(scanPayload);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSignAndScan = async (ticket: Ticket) => {
    const signed = await handleSignPass(ticket);
    if (!signed) return;
    setInspectTicket(null);

    const scannerEl = document.getElementById("stadium-turnstile-scanner");
    if (scannerEl) {
      scannerEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setIsVerifying(true);
    try {
      await verifyTicketEntry(signed.payload);
    } finally {
      setIsVerifying(false);
    }
  };

  const activeModalSigned = inspectTicket ? signedPasses[inspectTicket.tokenId] : undefined;
  const modalQrPayload = activeModalSigned
    ? activeModalSigned.payload
    : inspectTicket
      ? `UNSIGNED-PREVIEW:${inspectTicket.tokenId}:NONCE-${inspectTicket.nonce ?? 0}`
      : "";

  return (
    <section id="section-tickets" className="view-panel active">
      <div className="tickets-layout">
        {/* Left: Ticket Catalog & Price Checker */}
        <div className="ticket-manager-col">
          <div className="section-hero section-hero-split">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px", width: "100%" }}>
              <div>
                <span className="hero-kicker">ERC-721 SMART TICKETING · EIP-191 GATE SECURITY</span>
                <h2 className="hero-title" style={{ marginBottom: "4px" }}>Stadium Gate Passes</h2>
                <p className="hero-sub">
                  On-chain ERC-721 passes with 15% resale cap, holder-signed dynamic QR codes (120s expiry), rotating transfer nonces, and post-redemption transfer lock.
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

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              marginTop: "12px",
              padding: "10px 12px",
              background: "#f8fafc",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              fontSize: "0.73rem",
              color: "#334155",
              fontWeight: 700,
            }}
          >
            <span>🔐 EIP-191 Owner Signature</span>
            <span>·</span>
            <span>⏱️ 120s Anti-Screenshot TTL</span>
            <span>·</span>
            <span>🔄 Nonce Rotates on Transfer</span>
            <span>·</span>
            <span>🚫 Post-Redemption Non-Transferable</span>
            <span>·</span>
            <span>⚖️ 15% Max Resale Cap</span>
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
              <h3 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: "10px" }}>Issue New On-Chain ERC-721 Pass</h3>
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
                  <label className="sub-sm" style={{ fontWeight: 700 }}>Match Window</label>
                  <select
                    className="form-control"
                    value={issueTiming}
                    onChange={(e) => setIssueTiming(e.target.value as "LIVE" | "UPCOMING")}
                  >
                    <option value="LIVE">LIVE Now (Active Turnstile Window)</option>
                    <option value="UPCOMING">UPCOMING (+48h Scheduled Window)</option>
                  </select>
                </div>
                <div>
                  <label className="sub-sm" style={{ fontWeight: 700 }}>Stand</label>
                  <input
                    type="text"
                    className="form-control"
                    value={standInput}
                    onChange={(e) => setStandInput(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="sub-sm" style={{ fontWeight: 700 }}>Seat</label>
                  <input
                    type="text"
                    className="form-control"
                    value={seatInput}
                    onChange={(e) => setSeatInput(e.target.value)}
                    required
                  />
                </div>
                <div style={{ gridColumn: "1 / -1", marginTop: "4px" }}>
                  <button type="submit" className="btn btn-primary btn-block">
                    Mint On-Chain ERC-721 Pass (Max Resale: {(faceValueInput * 1.15).toFixed(0)} CRIC)
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Ticket Grid */}
          <div className="tickets-grid" id="stadium-tickets-list" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            {filteredTickets.map((t) => {
              const isOwner = Boolean(walletAddress && t.owner.toLowerCase() === walletAddress.toLowerCase());
              const isEscrowed = t.owner.toLowerCase() === DEPLOYED_CONTRACTS.contracts.CricketMarketplace.toLowerCase();
              const signedPass = signedPasses[t.tokenId];
              const qrPayload = signedPass ? signedPass.payload : `LOCKED-PASS-${t.tokenId}-NONCE-${t.nonce ?? 0}`;
              const qrSvgUri = generateTicketQrSvg(qrPayload, 56);

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
                        OWNER: {isOwner ? "YOU" : isEscrowed ? "ESCROW" : `${t.owner.slice(0, 6)}…${t.owner.slice(-4)}`} · NONCE #{t.nonce ?? 0}
                      </div>
                    </div>

                    {/* Scannable Mini QR Badge */}
                    <button
                      type="button"
                      onClick={() => setInspectTicket(t)}
                      title={signedPass ? "Signed Live QR Ready" : "Open Pass to Sign One-Time Gate QR"}
                      style={{
                        background: signedPass ? "#ecfdf5" : "#f8fafc",
                        border: `1px solid ${signedPass ? "#34d399" : "#e2e8f0"}`,
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
                        style={{ width: "46px", height: "46px", borderRadius: "4px", display: "block", opacity: signedPass ? 1 : 0.65 }}
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
                        title="Inspect or cryptographically sign gate QR"
                      >
                        Pass Details 🎟️
                      </button>

                      {t.used ? (
                        <span style={{ background: "#f1f5f9", color: "#475569", padding: "5px 10px", borderRadius: "6px", fontWeight: 700, fontSize: "0.75rem" }}>
                          ✓ Redeemed
                        </span>
                      ) : isOwner ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          style={{ padding: "5px 10px", fontSize: "0.75rem" }}
                          onClick={() => handleSignAndScan(t)}
                          title="Sign EIP-191 challenge & redeem on-chain at turnstile"
                        >
                          🔐 Sign & Scan
                        </button>
                      ) : t.status === "PAST" ? (
                        <span style={{ background: "#f1f5f9", color: "#64748b", padding: "5px 10px", borderRadius: "6px", fontWeight: 700, fontSize: "0.75rem" }}>
                          Expired
                        </span>
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
                    <strong>🚫 TRANSACTION BLOCKED BY CONTRACT:</strong> Proposed resale of {testPriceInput} CRIC exceeds the anti-scalping ceiling of {auditResult.maxAllowed} CRIC by {auditResult.diff} CRIC! Secondary price gouging is strictly rejected in CricketMarketplace.sol.
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
                Validates EIP-191 holder ECDSA signature, rotating nonce, TTL expiry & on-chain `isRedeemed` lock
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

                <div style={{ position: "relative", zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 12px" }}>
                  <img
                    src={generateTicketQrSvg(scanPayload || "AWAITING-SIGNED-CVPASS1", 120)}
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
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.72rem",
                      color: scanPayload.startsWith("CVPASS1:") ? "#4ade80" : "#f59e0b",
                      marginTop: "8px",
                      fontWeight: 700,
                      maxWidth: "290px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {scanPayload
                      ? scanPayload.startsWith("CVPASS1:")
                        ? `SIGNED QR READY (${scanPayload.slice(0, 26)}…)`
                        : `UNSIGNED PAYLOAD: ${scanPayload}`
                      : "Paste Signed QR (CVPASS1:…) or click 🔐 Sign & Scan on an owned Live pass"}
                  </div>
                </div>
              </div>

              {/* Security Test Selectors */}
              <div style={{ marginTop: "12px" }}>
                <span className="sub-sm" style={{ fontWeight: 700, display: "block", marginBottom: "6px", fontSize: "0.78rem" }}>
                  Security & Spoof Tests:
                </span>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: "0.72rem", padding: "4px 8px" }}
                    onClick={() => setScanPayload("CV-PASS-102")}
                    title="Test presenting a raw static barcode without wallet signature"
                  >
                    🚫 Test Static Spoof (CV-PASS-102)
                  </button>
                  {Object.values(signedPasses).map((sp) => (
                    <button
                      key={sp.tokenId}
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: "0.72rem", padding: "4px 8px", borderColor: "#22c55e", color: "#15803d" }}
                      onClick={() => setScanPayload(sp.payload)}
                    >
                      🔐 Signed #{sp.tokenId} (Nonce {sp.nonce})
                    </button>
                  ))}
                </div>

                <label className="sub-sm" htmlFor="ticket-scan-payload" style={{ fontWeight: 700, display: "block", marginBottom: "4px" }}>
                  Signed Entry Payload (`CVPASS1:&lt;id&gt;:&lt;deadline&gt;:&lt;nonce&gt;:&lt;sig&gt;`):
                </label>
                <input
                  id="ticket-scan-payload"
                  className="form-control"
                  placeholder="CVPASS1:102:..."
                  value={scanPayload}
                  onChange={(e) => setScanPayload(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                <button
                  id="gatekeeper-scan-btn"
                  className="btn btn-success"
                  style={{ flex: 1, padding: "10px", fontSize: "0.88rem" }}
                  onClick={handleGateVerify}
                  disabled={isVerifying}
                >
                  {isVerifying ? "Verifying On-Chain…" : "Verify & Redeem On-Chain ✓"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: "10px 12px", fontSize: "0.78rem" }}
                  onClick={() => syncOnChainTickets()}
                  title="Sync immutable ticket status directly from MatchTicketNFT.sol"
                >
                  Sync Chain ↻
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
              maxWidth: "470px",
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
              MATCHDAY ERC-721 PASS #{inspectTicket.tokenId} · NONCE #{inspectTicket.nonce ?? 0}
            </span>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--cricket-navy-dark)", margin: "4px 0 2px" }}>
              {inspectTicket.matchName}
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", marginBottom: "14px" }}>
              📍 {inspectTicket.venue}
            </p>

            {/* Scannable Signed QR Code */}
            <div style={{ display: "inline-block", background: activeModalSigned ? "#ecfdf5" : "#f8fafc", padding: "14px", borderRadius: "16px", border: `1.5px solid ${activeModalSigned ? "#34d399" : "#e2e8f0"}`, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}>
              <img
                src={generateTicketQrSvg(modalQrPayload, 180)}
                alt={`QR for Ticket #${inspectTicket.tokenId}`}
                style={{ width: "180px", height: "180px", borderRadius: "8px", display: "block", opacity: activeModalSigned ? 1 : 0.5 }}
              />
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.76rem", fontWeight: 800, color: activeModalSigned ? "#15803d" : "#b45309", marginTop: "8px" }}>
                {activeModalSigned
                  ? `SIGNED QR · TTL ${Math.max(0, activeModalSigned.deadline - nowSec)}s · NONCE #${activeModalSigned.nonce}`
                  : "UNSIGNED PREVIEW (Requires Owner Signature)"}
              </div>
            </div>

            <div style={{ marginTop: "14px", background: "var(--stadium-grass-bg)", padding: "10px 14px", borderRadius: "10px", textAlign: "left", fontSize: "0.8rem", border: "1px solid var(--boundary-rope)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "var(--text-dim)" }}>On-Chain Holder:</span>
                <b style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>{inspectTicket.owner}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "var(--text-dim)" }}>Stand & Seat:</span>
                <b>{inspectTicket.stand} · {inspectTicket.seat}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "var(--text-dim)" }}>On-Chain Status:</span>
                <b>{inspectTicket.used ? "REDEEMED (Soulbound)" : inspectTicket.status}</b>
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
              {!inspectTicket.used &&
                walletAddress &&
                inspectTicket.owner.toLowerCase() === walletAddress.toLowerCase() && (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ flex: 1.2 }}
                      onClick={() => handleSignPass(inspectTicket)}
                    >
                      🔐 Sign QR (120s)
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ flex: 1.3 }}
                      onClick={() => handleSignAndScan(inspectTicket)}
                    >
                      ⚡ Sign & Redeem
                    </button>
                  </>
                )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
