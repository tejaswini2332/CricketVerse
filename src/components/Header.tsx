import React from "react";
import { useCricket } from "../context/CricketContext";

export const Header: React.FC = () => {
  const {
    walletAddress,
    isConnected,
    cricBalance,
    networkName,
    connectWallet,
    disconnectWallet,
    claimFaucet,
    hasClaimedFaucet,
    claimDemoGas,
    hasClaimedDemoGas,
    setShowWalletModal,
  } = useCricket();

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="brand-logo">
          <span className="logo-ball" role="img" aria-label="cricket ball">🏏</span>
          <div className="logo-text">
            <span className="logo-title">CricketVerse</span>
            <span className="logo-badge">Cricket collectibles</span>
          </div>
        </div>
        <div className="network-badge">
          <span className="pulse-dot"></span>
          <span id="network-name">{networkName}</span>
        </div>
      </div>

      <div className="header-right">
        {!isConnected ? (
          <button
            id="connect-wallet-btn"
            className="btn btn-primary"
            onClick={() => connectWallet(true)}
          >
            Connect Wallet
          </button>
        ) : (
          <button
            id="connect-wallet-btn"
            className="btn btn-primary"
            onClick={disconnectWallet}
            title="Click to disconnect"
          >
            Connected
          </button>
        )}

        <button
          id="wallet-help-btn"
          className="wallet-help-btn"
          type="button"
          onClick={() => setShowWalletModal(true)}
        >
          Wallet setup
        </button>

        {typeof window !== "undefined" && window.self !== window.top && (
          <button
            id="open-tab-btn"
            className="btn btn-outline"
            type="button"
            style={{ borderColor: "#38bdf8", color: "#0284c7" }}
            onClick={() => window.open(window.location.href, "_blank", "noopener,noreferrer")}
            title="Open in full browser tab for MetaMask extension support"
          >
            Open in Tab ↗
          </button>
        )}

        {!hasClaimedDemoGas && (
          <button
            id="demo-gas-btn"
            className="btn btn-outline"
            type="button"
            onClick={claimDemoGas}
            title="Claim one-time 20 demo ETH for gas simulation."
          >
            Get 20 demo ETH
          </button>
        )}

        {!hasClaimedFaucet && (
          <button
            id="faucet-btn"
            className="btn btn-outline glow-faucet"
            onClick={claimFaucet}
            disabled={!isConnected}
            title="Claim one-time 50,000 CRIC grant"
          >
            Claim 50,000 CRIC
          </button>
        )}

        <div className="wallet-badge">
          <div className="cric-balance-box">
            <span className="token-sym">Balance:</span>
            <span id="user-cric-balance" className="balance-val">
              {cricBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="token-currency-label">CRIC</span>
          </div>
          <span id="wallet-address" className="wallet-select">
            {isConnected && walletAddress
              ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
              : "Not connected"}
          </span>
        </div>
      </div>
    </header>
  );
};
