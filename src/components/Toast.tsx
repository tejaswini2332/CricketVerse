import React from "react";
import { useCricket } from "../context/CricketContext";

export const Toast: React.FC = () => {
  const { toasts } = useCricket();

  if (toasts.length === 0) return null;

  return (
    <div id="toast-container" className="toast-container" style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 10000, display: "flex", flexDirection: "column", gap: "10px" }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-msg ${toast.isError ? "error" : "success"}`}
          style={{
            background: toast.isError ? "#ef4444" : "#16a34a",
            color: "white",
            padding: "12px 20px",
            borderRadius: "10px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2)",
            fontWeight: 600,
            fontSize: "0.9rem",
            maxWidth: "380px",
            animation: "slideInRight 0.25s ease forwards",
          }}
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
};
