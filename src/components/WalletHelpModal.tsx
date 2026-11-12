import React, { useState } from "react";
import { useCricket, DEPLOYED_CONTRACTS } from "../context/CricketContext";

export const WalletHelpModal: React.FC = () => {
  const {
    showWalletModal,
    setShowWalletModal,
    walletAddress,
    ethBalance,
    cricBalance,
    addCricketNetworkToMetaMask,
    addCricTokenToMetaMask,
    showToast,
  } = useCricket();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const isInIframe = typeof window !== "undefined" && window.self !== window.top;

  if (!showWalletModal) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`Copied ${key} address to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleAddNetwork = async () => {
    const success = await addCricketNetworkToMetaMask();
    if (success) {
      showToast("CricketVerse Network added/switched in MetaMask!");
    } else {
      showToast("MetaMask prompt unavailable in iframe. Open direct tab.", true);
    }
  };

  const handleAddToken = async () => {
    const success = await addCricTokenToMetaMask();
    if (success) {
      showToast("CRIC token watch requested in MetaMask!");
    } else {
      showToast("MetaMask prompt unavailable in iframe. Open direct tab.", true);
    }
  };

  const openInNewTab = () => {
    window.open(window.location.href, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      id="wallet-help-modal"
      className="wallet-help-modal"
      style={{ display: "flex", zIndex: 10000 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-help-title"
      onClick={() => setShowWalletModal(false)}
    >
      <div
        className="wallet-help-content"
        style={{ maxWidth: "680px", maxHeight: "90vh", overflowY: "auto", borderRadius: "16px", padding: "28px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          id="wallet-help-close"
          className="wallet-help-close"
          type="button"
          aria-label="Close wallet setup"
          onClick={() => setShowWalletModal(false)}
        >
          ×
        </button>

        <span className="hero-kicker" style={{ color: "var(--turf-green-dark)", fontWeight: 800 }}>
          BLOCKCHAIN & WALLET INFRASTRUCTURE
        </span>
        <h2 id="wallet-help-title" style={{ fontSize: "1.5rem", fontWeight: 900, margin: "4px 0 12px 0", color: "var(--cricket-navy-dark)" }}>
          On-Chain Deployment & MetaMask Sync
        </h2>

        {/* Iframe Notice */}
        {isInIframe && (
          <div
            style={{
              background: "#eff6ff",
              border: "1.5px solid #3b82f6",
              borderRadius: "10px",
              padding: "12px 16px",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div style={{ fontSize: "0.85rem", color: "#1e3a8a", lineHeight: 1.4 }}>
              <strong>Browser Extension Security Notice:</strong> MetaMask extensions cannot inject into embedded web iframes. Open the direct tab to trigger wallet popups!
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ whiteSpace: "nowrap", flexShrink: 0 }}
              onClick={openInNewTab}
            >
              Open Direct Tab ↗
            </button>
          </div>
        )}

        {/* Target Wallet Live Status Card */}
        <div
          style={{
            background: "var(--stadium-grass-bg)",
            border: "1.5px solid var(--boundary-rope)",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--turf-green-dark)", textTransform: "uppercase" }}>
              Target Connected Wallet
            </span>
            <span style={{ fontSize: "0.75rem", background: "white", padding: "2px 8px", borderRadius: "12px", color: "var(--turf-green-dark)", fontWeight: 700 }}>
              Live on Chain 31337
            </span>
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.95rem",
              color: "var(--cricket-navy-dark)",
              wordBreak: "break-all",
              fontWeight: 700,
              marginBottom: "12px",
            }}
          >
            {walletAddress}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ background: "white", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.06)" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", display: "block" }}>On-Chain ETH Balance</span>
              <strong style={{ fontSize: "1.2rem", color: "var(--cricket-navy-dark)" }}>{ethBalance} ETH</strong>
            </div>
            <div style={{ background: "white", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.06)" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", display: "block" }}>On-Chain CRIC Balance</span>
              <strong style={{ fontSize: "1.2rem", color: "var(--turf-green-dark)" }}>{cricBalance.toLocaleString()} CRIC</strong>
            </div>
          </div>
        </div>

        {/* 1-Click MetaMask Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
          <button type="button" className="btn btn-primary" onClick={handleAddNetwork}>
            🦊 Add Network to MetaMask
          </button>
          <button type="button" className="btn btn-outline" onClick={handleAddToken}>
            🪙 Import CRIC Token
          </button>
        </div>

        {/* Deployed Contracts List */}
        <h4 style={{ fontSize: "0.92rem", fontWeight: 800, textTransform: "uppercase", color: "var(--cricket-navy-mid)", marginBottom: "10px" }}>
          Deployed Smart Contracts (Hardhat Cancun EVM)
        </h4>
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "12px",
            marginBottom: "20px",
            fontSize: "0.82rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #e2e8f0" }}>
            <span style={{ fontWeight: 600 }}>RPC Proxy Endpoint:</span>
            <span
              style={{ fontFamily: "var(--font-mono)", color: "#2563eb", cursor: "pointer" }}
              onClick={() => handleCopy(`${window.location.origin}/rpc`, "RPC URL")}
            >
              {typeof window !== "undefined" ? `${window.location.origin}/rpc` : "/rpc"} {copiedKey === "RPC URL" ? "✓" : "📋"}
            </span>
          </div>
          {Object.entries(DEPLOYED_CONTRACTS.contracts).map(([name, address]) => (
            <div
              key={name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 0",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <span style={{ fontWeight: 600 }}>{name}:</span>
              <span
                style={{ fontFamily: "var(--font-mono)", color: "var(--cricket-navy-mid)", cursor: "pointer" }}
                onClick={() => handleCopy(address, name)}
                title="Click to copy address"
              >
                {address} {copiedKey === name ? "✓" : "📋"}
              </span>
            </div>
          ))}
        </div>

        {/* Manual Setup Guide */}
        <div style={{ background: "#fdf8ec", border: "1px solid #fde68a", borderRadius: "10px", padding: "14px 16px", fontSize: "0.85rem", color: "#92400e" }}>
          <strong style={{ display: "block", marginBottom: "4px" }}>Why did you not see transactions before?</strong>
          <ul style={{ margin: 0, paddingLeft: "18px", lineHeight: 1.5 }}>
            <li>Previously, the contracts were not compiled or deployed to an active blockchain node.</li>
            <li>We have now deployed all 8 contracts, registered all 4,797 player cards, and sent 100 ETH + 100,000 CRIC to your wallet.</li>
            <li>In MetaMask, switch your network to <strong>CricketVerse Local Devnet</strong> using the button above to view your on-chain balance and approve transactions.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
