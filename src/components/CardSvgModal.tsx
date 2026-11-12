import React from "react";
import { useCricket } from "../context/CricketContext";
import { generateDynamicCardSvg } from "../scoringEngine";

export const CardSvgModal: React.FC = () => {
  const { inspectPlayer, setInspectPlayer, showToast } = useCricket();

  if (!inspectPlayer) return null;

  const svgContent = generateDynamicCardSvg(inspectPlayer);

  const handleCopySvg = () => {
    navigator.clipboard.writeText(svgContent);
    showToast("Copied on-chain SVG vector code to clipboard!");
  };

  const handleDownloadSvg = () => {
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${inspectPlayer.name.toLowerCase().replace(/\s+/g, "_")}_card.svg`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Downloaded SVG card asset!");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(3, 12, 22, 0.85)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={() => setInspectPlayer(null)}
    >
      <div
        style={{
          background: "#0f172a",
          border: "2px solid #334155",
          borderRadius: "20px",
          padding: "28px",
          maxWidth: "760px",
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          color: "#f8fafc",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <span style={{ color: "#38bdf8", fontSize: "0.8rem", fontWeight: 800, letterSpacing: "0.1em" }}>
              ON-CHAIN SMART CONTRACT ASSET
            </span>
            <h2 style={{ fontSize: "1.6rem", fontWeight: 900, margin: "4px 0" }}>
              {inspectPlayer.name} ({inspectPlayer.rarity})
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "0.88rem" }}>
              Dynamic ERC-721 SVG generated algorithmically from immutable player performance metrics.
            </p>
          </div>

          <button
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              fontSize: "1.8rem",
              cursor: "pointer",
              lineHeight: 1,
            }}
            onClick={() => setInspectPlayer(null)}
          >
            ×
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "center" }}>
          {/* Rendered SVG Preview */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              background: "#020617",
              borderRadius: "16px",
              padding: "16px",
              border: "1px solid #1e293b",
            }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />

          {/* Details & Actions */}
          <div>
            <div style={{ background: "#1e293b", padding: "16px", borderRadius: "12px", marginBottom: "16px" }}>
              <h4 style={{ fontSize: "0.9rem", color: "#38bdf8", textTransform: "uppercase", marginBottom: "8px" }}>
                Cryptographic Card Attributes
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.85rem" }}>
                <div>Role: <strong style={{ color: "white" }}>{inspectPlayer.role}</strong></div>
                <div>Team: <strong style={{ color: "white" }}>{inspectPlayer.team}</strong></div>
                <div>Matches: <strong style={{ color: "white" }}>{inspectPlayer.matches}</strong></div>
                <div>Runs: <strong style={{ color: "white" }}>{inspectPlayer.runs}</strong></div>
                <div>Wickets: <strong style={{ color: "white" }}>{inspectPlayer.wickets}</strong></div>
                <div>Strike Rate: <strong style={{ color: "white" }}>{inspectPlayer.strikeRate}</strong></div>
                <div>Economy: <strong style={{ color: "white" }}>{inspectPlayer.economy}</strong></div>
                <div>Multiplier: <strong style={{ color: "#4ade80" }}>{inspectPlayer.multiplier}x</strong></div>
              </div>
            </div>

            <div style={{ marginBottom: "20px", fontSize: "0.85rem", color: "#cbd5e1", lineHeight: 1.6 }}>
              💡 <strong>Self-contained SVG:</strong> This card does not rely on IPFS or external hosting. The visual geometry, team badges, milestone ribbons, and stats are completely rendered on-chain.
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex: 1, borderColor: "#38bdf8", color: "#38bdf8" }}
                onClick={handleCopySvg}
              >
                Copy SVG Code
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleDownloadSvg}
              >
                Download .svg
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
