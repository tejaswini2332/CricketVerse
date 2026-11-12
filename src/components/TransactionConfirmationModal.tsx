import React from "react";
import { useCricket, DEPLOYED_CONTRACTS } from "../context/CricketContext";

export const TransactionConfirmationModal: React.FC = () => {
  const { pendingTx, isTransacting, confirmPendingTx, cancelPendingTx, ethBalance, cricBalance, isRealWallet } = useCricket();

  if (!pendingTx) return null;

  const isInIframe = typeof window !== "undefined" && window.self !== window.top;

  const openInNewTab = () => {
    window.open(window.location.href, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      id="tx-confirmation-modal"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(10, 20, 35, 0.75)",
        backdropFilter: "blur(4px)",
        zIndex: 10002,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-confirmation-title"
      onClick={cancelPendingTx}
    >
      <div
        style={{
          background: "white",
          borderRadius: "20px",
          maxWidth: "540px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "26px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          border: "1px solid #e2e8f0",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--turf-green-dark)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                WEB3 ON-CHAIN TRANSACTION
              </span>
              <span style={{ fontSize: "0.7rem", background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: "10px", fontWeight: 700 }}>
                Confirmation Required
              </span>
            </div>
            <h3 id="tx-confirmation-title" style={{ fontSize: "1.35rem", fontWeight: 900, color: "var(--cricket-navy-dark)", margin: 0 }}>
              {pendingTx.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={cancelPendingTx}
            disabled={isTransacting}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.6rem",
              lineHeight: 1,
              color: "#64748b",
              cursor: "pointer",
              padding: "4px",
            }}
            aria-label="Cancel transaction"
          >
            ×
          </button>
        </div>

        {/* Item preview if image exists */}
        {pendingTx.itemImage && (
          <div style={{ display: "flex", alignItems: "center", gap: "14px", background: "var(--stadium-grass-bg)", padding: "12px", borderRadius: "12px", marginBottom: "16px", border: "1px solid var(--boundary-rope)" }}>
            <img
              src={pendingTx.itemImage}
              alt="Item asset"
              style={{ width: "52px", height: "52px", borderRadius: "10px", objectFit: "cover", background: "white" }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=CricketVerse`;
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--cricket-navy-dark)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {pendingTx.title}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: 1.3 }}>
                {pendingTx.description}
              </div>
            </div>
          </div>
        )}

        {/* Amount to Deduct or Grant Card */}
        <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", display: "block" }}>
                {pendingTx.type === "CLAIM_FAUCET" || pendingTx.type === "CLAIM_ETH" ? "Grant Amount" : "Total Payment"}
              </span>
              <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--cricket-navy-dark)", lineHeight: 1.1 }}>
                {pendingTx.type === "CLAIM_ETH" ? (
                  <>
                    +20.0 <span style={{ fontSize: "1rem", color: "var(--turf-green-dark)" }}>ETH</span>
                  </>
                ) : (
                  <>
                    {pendingTx.type === "CLAIM_FAUCET" ? "+" : "-"}
                    {pendingTx.amountCRIC.toLocaleString()} <span style={{ fontSize: "1rem", color: "var(--turf-green-dark)" }}>CRIC</span>
                  </>
                )}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", display: "block" }}>Your Balance</span>
              <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--cricket-navy-mid)" }}>
                {cricBalance.toLocaleString()} CRIC
              </span>
            </div>
          </div>

          <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed #cbd5e1", display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#64748b" }}>
            <span>Network Gas Fee</span>
            <span>~0.00042 ETH (from {ethBalance} ETH)</span>
          </div>
        </div>

        {/* Key Transaction Details */}
        {pendingTx.details && (
          <div style={{ background: "#ffffff", border: "1px solid #f1f5f9", borderRadius: "10px", padding: "10px 14px", marginBottom: "16px", fontSize: "0.82rem" }}>
            {Object.entries(pendingTx.details).map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f8fafc" }}>
                <span style={{ color: "#64748b" }}>{k}</span>
                <span style={{ fontWeight: 600, color: "var(--cricket-navy-dark)", fontFamily: String(v).startsWith("0x") ? "var(--font-mono)" : "inherit" }}>
                  {v}
                </span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span style={{ color: "#64748b" }}>Contract / Target</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--cricket-navy-dark)" }}>
                {pendingTx.recipientAddress.slice(0, 8)}…{pendingTx.recipientAddress.slice(-6)}
              </span>
            </div>
          </div>
        )}

        {/* Iframe Notice & MetaMask Hint */}
        {isInIframe ? (
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "10px 14px", marginBottom: "18px", fontSize: "0.82rem", color: "#1e40af" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
              <span>
                <strong>Tip:</strong> Chrome blocks extension popups inside iframes. Click <strong>Open in Tab ↗</strong> to use the full MetaMask popup!
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ padding: "3px 8px", fontSize: "0.75rem", whiteSpace: "nowrap" }}
                onClick={openInNewTab}
              >
                Open in Tab ↗
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "10px", padding: "10px 14px", marginBottom: "18px", fontSize: "0.82rem", color: "#065f46" }}>
            🦊 <strong>MetaMask Integration:</strong> Clicking Confirm will send the transaction to your wallet for authorization.
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            className="btn btn-outline"
            style={{ flex: 1 }}
            onClick={cancelPendingTx}
            disabled={isTransacting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: 1.6 }}
            onClick={confirmPendingTx}
            disabled={
              isTransacting ||
              (pendingTx.type !== "CLAIM_FAUCET" && pendingTx.type !== "CLAIM_ETH" && cricBalance < pendingTx.amountCRIC)
            }
          >
            {isTransacting ? (
              <span>Confirming on Chain…</span>
            ) : isRealWallet && !isInIframe ? (
              <span>Confirm in MetaMask 🦊</span>
            ) : (
              <span>Confirm Transaction ✓</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
