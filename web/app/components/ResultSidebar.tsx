"use client";

import { AnalysisResult, downloadReport, gradeColor } from "@/lib/api";
import {
  ChevronRight,
  Download,
  Zap,
  Thermometer,
  BarChart2,
  AlertTriangle,
  Activity,
} from "lucide-react";

interface Props {
  result: AnalysisResult;
}

function MetricRow({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 0",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
        {label}
      </span>
      <span
        className="mono"
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: color ?? "var(--text-primary)",
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 3 }}>
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}

export default function ResultSidebar({ result }: Props) {
  const { trust, calibration } = result;
  const trustColor = gradeColor(trust.grade);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Trust Score Summary */}
      <div className="glass-card" style={{ padding: 22 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <BarChart2 size={15} style={{ color: trustColor }} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>Score Breakdown</span>
        </div>

        <MetricRow
          label="Readings total"
          value={trust.readings_total}
          color="var(--accent-cyan)"
        />
        <MetricRow
          label="Anomalies flagged"
          value={trust.anomalies_flagged}
          color={trust.anomalies_flagged > 0 ? "#f87171" : "#10b981"}
        />
        <MetricRow
          label="Anomaly rate"
          value={trust.anomaly_rate_pct}
          unit="%"
          color={
            trust.anomaly_rate_pct > 20
              ? "#ef4444"
              : trust.anomaly_rate_pct > 5
              ? "#f59e0b"
              : "#10b981"
          }
        />
        <MetricRow
          label="Drift magnitude"
          value={
            trust.drift_magnitude_c >= 0
              ? `+${trust.drift_magnitude_c}`
              : String(trust.drift_magnitude_c)
          }
          unit="°C"
          color={
            Math.abs(trust.drift_magnitude_c) > 1.5 ? "#ef4444" : "#10b981"
          }
        />
        <MetricRow
          label="Corr. before"
          value={trust.correlation_before.toFixed(3)}
          color={trust.correlation_before > 0.8 ? "#10b981" : "#f59e0b"}
        />
        <MetricRow
          label="Corr. after"
          value={trust.correlation_after.toFixed(3)}
          color={trust.correlation_after > 0.8 ? "#10b981" : "#f59e0b"}
        />
      </div>

      {/* Calibration */}
      <div className="glass-card" style={{ padding: 22 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <Zap
            size={15}
            style={{ color: calibration.applied ? "#10b981" : "#ef4444" }}
          />
          <span style={{ fontWeight: 600, fontSize: 14 }}>Calibration</span>
          <span
            className={`badge ${calibration.applied ? "badge-green" : "badge-red"}`}
            style={{ marginLeft: "auto", fontSize: 10 }}
          >
            {calibration.applied ? "Applied" : "Skipped"}
          </span>
        </div>

        {calibration.applied ? (
          <>
            <MetricRow
              label="Method"
              value={calibration.method ?? "drift_detrend_plus_affine"}
              color="var(--accent-purple)"
            />
            <MetricRow
              label="Scale factor"
              value={calibration.scale?.toFixed(4) ?? "—"}
              color="var(--accent-cyan)"
            />
            <MetricRow
              label="Bias"
              value={
                calibration.bias_c != null
                  ? `${calibration.bias_c >= 0 ? "+" : ""}${calibration.bias_c.toFixed(3)}`
                  : "—"
              }
              unit="°C"
              color="var(--accent-cyan)"
            />
            <MetricRow
              label="Drift slope"
              value={
                calibration.drift_slope_per_hour != null
                  ? `${calibration.drift_slope_per_hour >= 0 ? "+" : ""}${calibration.drift_slope_per_hour.toFixed(4)}`
                  : "—"
              }
              unit="°C/hr"
            />
            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                }}
              >
                Mean error before → after
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span
                  className="mono"
                  style={{ color: "#f87171", fontWeight: 700, fontSize: 18 }}
                >
                  {calibration.mean_error_before?.toFixed(2) ?? "—"}°C
                </span>
                <ChevronRight
                  size={16}
                  style={{ color: "var(--text-muted)" }}
                />
                <span
                  className="mono"
                  style={{ color: "#34d399", fontWeight: 700, fontSize: 18 }}
                >
                  {calibration.mean_error_after?.toFixed(2) ?? "—"}°C
                </span>
              </div>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
            {calibration.note ??
              "Calibration could not be applied — insufficient overlapping reference data."}
          </div>
        )}
      </div>

      {/* Download Report */}
      <button
        className="btn-primary"
        onClick={() => downloadReport(result)}
        id="download-report-btn"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "12px",
        }}
      >
        <Download size={14} />
        Download JSON Report
      </button>

      {/* Detection methods used */}
      <div
        style={{
          padding: "14px 16px",
          background: "rgba(59,130,246,0.04)",
          border: "1px solid rgba(59,130,246,0.12)",
          borderRadius: 12,
          fontSize: 12,
          color: "var(--text-muted)",
        }}
      >
        <div
          style={{
            fontWeight: 600,
            marginBottom: 10,
            color: "var(--text-secondary)",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          Detection methods
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {[
            { icon: <Activity size={11} />, label: "Rolling Z-Score (spikes)", color: "#3b82f6" },
            { icon: <Thermometer size={11} />, label: "Drift detection (deviation)", color: "#f59e0b" },
            { icon: <AlertTriangle size={11} />, label: "Isolation Forest (multivariate)", color: "#8b5cf6" },
          ].map((m) => (
            <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ color: m.color }}>{m.icon}</span>
              <span>{m.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
