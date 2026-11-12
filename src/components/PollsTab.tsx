import React, { useState } from "react";
import { useCricket } from "../context/CricketContext";

export const PollsTab: React.FC = () => {
  const { polls, votePoll, createPoll, isConnected, walletAddress } = useCricket();

  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState("");
  const [optionsStr, setOptionsStr] = useState("Option 1, Option 2, Option 3");
  const [hours, setHours] = useState(48);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    const opts = optionsStr.split(",").map((s) => s.trim()).filter(Boolean);
    if (opts.length < 2) return;
    createPoll(question, opts, hours);
    setQuestion("");
    setShowCreate(false);
  };

  return (
    <section id="section-polls" className="view-panel active">
      <div className="section-hero">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <span className="hero-kicker">COMMUNITY GOVERNANCE</span>
            <h2 className="hero-title">Fan polls</h2>
            <p className="hero-sub">
              Decentralized cricket fan governance where every CRIC token empowers your voice in matchday decisions.
            </p>
          </div>

          <button
            className="btn btn-outline btn-sm"
            type="button"
            onClick={() => setShowCreate(!showCreate)}
          >
            {showCreate ? "Cancel" : "Create New Poll"}
          </button>
        </div>
      </div>

      {showCreate && (
        <div id="poll-create-panel" className="organizer-panel" style={{ background: "white", padding: "20px", borderRadius: "14px", border: "2px solid var(--boundary-rope)", marginBottom: "24px" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "12px" }}>Create On-Chain Community Poll</h3>
          <form onSubmit={handleCreateSubmit} style={{ display: "grid", gap: "12px" }}>
            <div>
              <label className="sub-sm" style={{ fontWeight: 700 }}>Question</label>
              <input
                className="form-control"
                placeholder="e.g. Which match condition should take priority?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="sub-sm" style={{ fontWeight: 700 }}>Options (comma-separated)</label>
              <input
                className="form-control"
                placeholder="e.g. Batting Track, Spin Trap, Green Seamer"
                value={optionsStr}
                onChange={(e) => setOptionsStr(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="sub-sm" style={{ fontWeight: 700 }}>Duration (Hours)</label>
              <input
                type="number"
                min="1"
                max="168"
                className="form-control"
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Publish Poll On-Chain
            </button>
          </form>
        </div>
      )}

      <div id="polls-list" className="polls-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
        {polls.map((poll) => {
          return (
            <div
              key={poll.id}
              style={{
                background: "white",
                borderRadius: "16px",
                border: "1px solid var(--card-border)",
                padding: "24px",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--cricket-blue-accent)", background: "#dbeafe", padding: "4px 8px", borderRadius: "6px" }}>
                  POLL #{poll.id}
                </span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                  {poll.totalVotes} votes cast
                </span>
              </div>

              <h4 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--cricket-navy-dark)", marginBottom: "16px" }}>
                {poll.question}
              </h4>

              <div style={{ display: "grid", gap: "10px" }}>
                {poll.options.map((opt, idx) => {
                  const percentage = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
                  const hasVoted = poll.userVotedIndex !== undefined;
                  const isUserChoice = poll.userVotedIndex === idx;

                  return (
                    <div
                      key={idx}
                      style={{
                        position: "relative",
                        border: `1px solid ${isUserChoice ? "var(--turf-green-dark)" : "var(--card-border)"}`,
                        borderRadius: "10px",
                        overflow: "hidden",
                        padding: "12px 14px",
                        background: isUserChoice ? "var(--turf-green-light)" : "var(--card-white)",
                        cursor: hasVoted ? "default" : "pointer",
                        transition: "all 0.2s ease",
                      }}
                      onClick={() => !hasVoted && votePoll(poll.id, idx)}
                    >
                      {/* Vote share bar */}
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${percentage}%`,
                          background: isUserChoice ? "rgba(22, 163, 74, 0.18)" : "rgba(37, 99, 235, 0.08)",
                          zIndex: 1,
                          transition: "width 0.4s ease",
                        }}
                      ></div>

                      <div style={{ position: "relative", zIndex: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: isUserChoice ? 800 : 600, fontSize: "0.92rem", color: isUserChoice ? "var(--turf-green-dark)" : "var(--text-main)" }}>
                          {isUserChoice && "✓ "} {opt.text}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--cricket-navy-mid)" }}>
                            {percentage}%
                          </span>
                          {!hasVoted && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                votePoll(poll.id, idx);
                              }}
                            >
                              Vote
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {poll.userVotedIndex !== undefined && (
                <div style={{ marginTop: "12px", fontSize: "0.8rem", color: "var(--turf-green-dark)", fontWeight: 700 }}>
                  ✓ You voted for: {poll.options[poll.userVotedIndex].text}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
