"use client";

import { Alert } from "@/lib/api";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface Props {
  alerts: Alert[];
}

export default function AlertsList({ alerts }: Props) {
  if (alerts.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "32px 16px",
          color: "var(--text-muted)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "rgba(16,185,129,0.1)",
            border: "1px solid rgba(16,185,129,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CheckCircle size={22} style={{ color: "#10b981" }} />
        </div>
        <div>
          <div
            style={{
              fontWeight: 600,
              fontSize: 14,
              color: "#10b981",
              marginBottom: 4,
            }}
          >
            No anomalies detected
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.5 }}>
            This sensor passed all three detection checks:
            <br />
            spike detection, drift analysis, and Isolation Forest.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxHeight: 340,
        overflowY: "auto",
        paddingRight: 4,
      }}
    >
      {/* Count summary */}
      <div
        style={{
          fontSize: 12,
          color: "var(--text-muted)",
          marginBottom: 4,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <AlertTriangle size={12} style={{ color: "#ef4444" }} />
        {alerts.length} anomalous event{alerts.length !== 1 ? "s" : ""} detected
        — sorted by time
      </div>

      {alerts.map((alert, i) => {
        const dt = new Date(alert.timestamp);
        const dateStr = dt.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        });
        const timeStr = dt.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });

        return (
          <div key={i} className="alert-row" role="listitem">
            {/* Index dot */}
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 10,
                fontWeight: 700,
                color: "#f87171",
              }}
            >
              {i + 1}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Timestamp */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 6,
                }}
              >
                <Clock size={11} style={{ color: "var(--text-muted)" }} />
                <span
                  className="mono"
                  style={{ fontSize: 11, color: "var(--text-muted)" }}
                >
                  {dateStr} · {timeStr}
                </span>
              </div>

              {/* Reason badges */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {alert.reasons.map((reason, j) => (
                  <span
                    key={j}
                    className="badge badge-red"
                    style={{ fontSize: 10 }}
                  >
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
