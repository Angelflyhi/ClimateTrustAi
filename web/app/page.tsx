"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { downloadReport } from "@/lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Scatter,
  ScatterChart,
} from "recharts";
import {
  AlertTriangle,
  Activity,
  Upload,
  CheckCircle,
  Thermometer,
  Zap,
  Shield,
  Database,
  ChevronRight,
  Info,
  X,
  RefreshCw,
  BarChart2,
  Cpu,
  Globe,
  Clock,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface TimeseriesPoint {
  timestamp: string;
  temp_c: number | null;
  humidity_pct: number | null;
  reference_temp_c: number | null;
  corrected_temp_c: number | null;
  anomaly: boolean;
}

interface Alert {
  timestamp: string;
  reasons: string[];
}

interface TrustScore {
  trust_score: number;
  grade: string;
  anomaly_rate_pct: number;
  drift_magnitude_c: number;
  correlation_before: number;
  correlation_after: number;
  readings_total: number;
  anomalies_flagged: number;
}

interface CalibrationMeta {
  applied: boolean;
  scale?: number;
  bias_c?: number;
  mean_error_before?: number;
  mean_error_after?: number;
  method?: string;
  note?: string;
}

interface ExplanationResult {
  text: string;
  source: string;
}

interface AnalysisResult {
  sensor_name: string;
  location: { latitude: number; longitude: number };
  trust: TrustScore;
  calibration: CalibrationMeta;
  explanation: ExplanationResult;
  timeseries: TimeseriesPoint[];
  alerts: Alert[];
}

interface DemoSensor {
  id: string;
  name: string;
  description: string;
}

/* ─── Constants ──────────────────────────────────────────────────────────── */
const ML_BASE = process.env.NEXT_PUBLIC_ML_URL ?? "http://localhost:8000";

const GRADE_COLORS: Record<string, string> = {
  A: "#10b981",
  B: "#34d399",
  C: "#f59e0b",
  D: "#f97316",
  F: "#ef4444",
};

const GRADE_BG: Record<string, string> = {
  A: "rgba(16, 185, 129, 0.12)",
  B: "rgba(52, 211, 153, 0.12)",
  C: "rgba(245, 158, 11, 0.12)",
  D: "rgba(249, 115, 22, 0.12)",
  F: "rgba(239, 68, 68, 0.12)",
};

const DEMO_ICONS: Record<string, React.ReactNode> = {
  a: <CheckCircle size={18} style={{ color: "#10b981" }} />,
  b: <Activity size={18} style={{ color: "#f59e0b" }} />,
  c: <Zap size={18} style={{ color: "#ef4444" }} />,
};

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function TrustGauge({ score, grade }: { score: number; grade: string }) {
  const color = GRADE_COLORS[grade] ?? "#60a5fa";
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ position: "relative", width: 160, height: 160 }}>
        <svg width="160" height="160" viewBox="0 0 160 160">
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
          </defs>
          {/* Background track */}
          <circle
            cx="80"
            cy="80"
            r="54"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="12"
          />
          {/* Progress arc */}
          <circle
            cx="80"
            cy="80"
            r="54"
            fill="none"
            stroke="url(#gaugeGrad)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 80 80)"
            style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)" }}
          />
          {/* Glow dot */}
          <circle
            cx="80"
            cy="26"
            r="6"
            fill={color}
            style={{
              transform: `rotate(${(score / 100) * 360 - 90}deg)`,
              transformOrigin: "80px 80px",
              filter: `drop-shadow(0 0 6px ${color})`,
              transition: "transform 1s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            className="mono"
            style={{ fontSize: 36, fontWeight: 700, color, lineHeight: 1 }}
          >
            {score}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.1em" }}>
            TRUST
          </span>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 18px",
          borderRadius: 99,
          background: GRADE_BG[grade] ?? "rgba(59,130,246,0.12)",
          border: `1px solid ${color}40`,
        }}
      >
        <span style={{ color, fontWeight: 700, fontSize: 18 }}>Grade {grade}</span>
      </div>
    </div>
  );
}

function MetricItem({
  label,
  value,
  unit,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="metric-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {label}
        </span>
        {icon && <span style={{ color: "var(--text-muted)" }}>{icon}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span
          className="mono"
          style={{ fontSize: 28, fontWeight: 700, color: color ?? "var(--text-primary)", lineHeight: 1 }}
        >
          {value}
        </span>
        {unit && (
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{unit}</span>
        )}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "12px 16px",
        fontSize: 12,
        minWidth: 180,
      }}
    >
      <div style={{ color: "var(--text-muted)", marginBottom: 8, fontFamily: "JetBrains Mono, monospace" }}>
        {label ? new Date(label).toLocaleString() : ""}
      </div>
      {payload.map((entry: any) => (
        <div
          key={entry.dataKey}
          style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 4 }}
        >
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span style={{ color: "var(--text-primary)", fontFamily: "JetBrains Mono, monospace" }}>
            {entry.value != null ? `${Number(entry.value).toFixed(2)}` : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

function AlertsList({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "32px",
          color: "var(--text-muted)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <CheckCircle size={32} style={{ color: "#10b981", opacity: 0.7 }} />
        <span style={{ fontSize: 14 }}>No anomalies detected</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
      {alerts.map((alert, i) => (
        <div key={i} className="alert-row">
          <AlertTriangle size={16} style={{ color: "#ef4444", flexShrink: 0, marginTop: 2 }} />
          <div>
            <div className="mono" style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
              {new Date(alert.timestamp).toLocaleString()}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {alert.reasons.map((r, j) => (
                <span key={j} className="badge badge-red">
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */
export default function Home() {
  const [demos, setDemos] = useState<DemoSensor[]>([]);
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<"temperature" | "humidity">("temperature");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  /* Load demo sensors */
  useEffect(() => {
    fetch(`${ML_BASE}/demos`)
      .then((r) => r.json())
      .then(setDemos)
      .catch(() =>
        setDemos([
          { id: "a", name: "Sensor A (Control)", description: "Well-calibrated reference sensor" },
          { id: "b", name: "Sensor B (Drift)", description: "Linear drift +0.08°C/hr" },
          { id: "c", name: "Sensor C (Spikes)", description: "Scale bias and random spikes" },
        ])
      );
  }, []);

  /* Scroll to results on load */
  useEffect(() => {
    if (result && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [result]);

  const runDemo = async (id: string) => {
    setSelectedDemo(id);
    setUploadFile(null);
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch(`${ML_BASE}/demo/${id}`);
      if (!r.ok) throw new Error(`Server error: ${r.status}`);
      const data = await r.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message ?? "Request failed. Is the ML service running?");
    } finally {
      setLoading(false);
    }
  };

  const runUpload = async () => {
    if (!uploadFile) return;
    setSelectedDemo(null);
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", uploadFile);
      form.append("sensor_name", uploadFile.name.replace(".csv", ""));
      const r = await fetch(`${ML_BASE}/analyze`, { method: "POST", body: form });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.detail ?? `Server error: ${r.status}`);
      }
      const data = await r.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message ?? "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) {
      setUploadFile(file);
      setSelectedDemo(null);
    }
  }, []);

  /* Chart data prep */
  const chartData = result?.timeseries.map((p) => ({
    ...p,
    time: p.timestamp,
    label: new Date(p.timestamp).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
    }),
  }));

  const anomalyPoints = chartData?.filter((p) => p.anomaly);

  const trustColor = result ? GRADE_COLORS[result.trust.grade] ?? "#60a5fa" : "#60a5fa";

  const progressColor = (val: number) => {
    if (val >= 85) return "#10b981";
    if (val >= 70) return "#34d399";
    if (val >= 50) return "#f59e0b";
    if (val >= 30) return "#f97316";
    return "#ef4444";
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── TOP NAV ── */}
      <nav className="top-nav">
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "0 24px",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 16px rgba(59,130,246,0.4)",
              }}
            >
              <Shield size={18} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em" }}>
                ClimateTrust<span className="gradient-text"> AI</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                SENSOR VALIDATION PLATFORM
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="badge badge-green">
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
              MSV-2035 Ready
            </div>
            <div className="badge badge-blue">
              <Cpu size={10} />
              ML Engine Online
            </div>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section
        style={{
          padding: "72px 24px 64px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Radial glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 600,
            height: 400,
            background: "radial-gradient(ellipse, rgba(59,130,246,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div className="fade-in">
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              borderRadius: 99,
              background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.3)",
              marginBottom: 24,
              fontSize: 12,
              color: "#60a5fa",
              fontWeight: 500,
              letterSpacing: "0.05em",
            }}
          >
            <Globe size={12} />
            STEMINATE HACKS 2026 · Environmental AI Track
          </div>

          <h1
            style={{
              fontSize: "clamp(36px, 6vw, 64px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              margin: "0 0 20px",
            }}
          >
            Validate Climate Sensor Data
            <br />
            <span className="gradient-text">with AI-Powered Precision</span>
          </h1>

          <p
            style={{
              fontSize: 18,
              color: "var(--text-secondary)",
              maxWidth: 600,
              margin: "0 auto 40px",
              lineHeight: 1.6,
            }}
          >
            Detect drift, spikes, and anomalies in real-time. Every sensor gets a{" "}
            <strong style={{ color: "var(--text-primary)" }}>Trust Score</strong> and AI-written
            explanation — ensuring data integrity for climate research.
          </p>

          {/* Quick stats */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 40,
              flexWrap: "wrap",
            }}
          >
            {[
              { label: "Detection Methods", value: "3" },
              { label: "Trust Metrics", value: "6" },
              { label: "AI Explanation", value: "Gemini" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div
                  className="mono gradient-text"
                  style={{ fontSize: 28, fontWeight: 700 }}
                >
                  {s.value}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <main
        style={{
          flex: 1,
          maxWidth: 1280,
          width: "100%",
          margin: "0 auto",
          padding: "0 24px 80px",
        }}
      >
        {/* ── INPUT SECTION ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            marginBottom: 32,
          }}
          className="fade-in-delay-1"
        >
          {/* Demo sensors */}
          <div className="glass-card" style={{ padding: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <Database size={18} style={{ color: "var(--accent-cyan)" }} />
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Demo Sensors</h2>
              <span className="badge badge-blue" style={{ marginLeft: "auto" }}>
                3 datasets
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {demos.map((demo) => (
                <div
                  key={demo.id}
                  className={`sensor-card ${selectedDemo === demo.id ? "selected" : ""}`}
                  onClick={() => runDemo(demo.id)}
                  role="button"
                  id={`demo-sensor-${demo.id}`}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    {DEMO_ICONS[demo.id] ?? <Activity size={16} />}
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{demo.name}</span>
                    {selectedDemo === demo.id && loading && (
                      <div className="spinner" style={{ marginLeft: "auto" }} />
                    )}
                    {selectedDemo !== demo.id && (
                      <ChevronRight
                        size={14}
                        style={{ marginLeft: "auto", color: "var(--text-muted)" }}
                      />
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                    {demo.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Upload */}
          <div className="glass-card" style={{ padding: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <Upload size={18} style={{ color: "var(--accent-blue)" }} />
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Upload CSV</h2>
            </div>

            <div
              className={`drop-zone ${dragOver ? "active" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              id="csv-drop-zone"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setUploadFile(f);
                    setSelectedDemo(null);
                  }
                }}
              />
              {uploadFile ? (
                <div>
                  <CheckCircle
                    size={32}
                    style={{ color: "#10b981", margin: "0 auto 12px", display: "block" }}
                  />
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{uploadFile.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {(uploadFile.size / 1024).toFixed(1)} KB · Click to change
                  </div>
                </div>
              ) : (
                <div>
                  <Upload
                    size={32}
                    style={{ color: "var(--text-muted)", margin: "0 auto 12px", display: "block" }}
                  />
                  <div style={{ fontWeight: 500, marginBottom: 6 }}>
                    Drop a CSV file or click to browse
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Required columns: <span className="mono">timestamp</span>,{" "}
                    <span className="mono">temp_c</span>
                  </div>
                </div>
              )}
            </div>

            {uploadFile && (
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button
                  className="btn-primary"
                  onClick={runUpload}
                  disabled={loading}
                  id="analyze-btn"
                  style={{ flex: 1 }}
                >
                  {loading ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <div className="spinner" />
                      Analyzing…
                    </span>
                  ) : (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <Activity size={14} /> Run Analysis
                    </span>
                  )}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setUploadFile(null)}
                  style={{ padding: "10px 14px" }}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {!uploadFile && (
              <div
                style={{
                  marginTop: 20,
                  padding: "12px 16px",
                  background: "rgba(59,130,246,0.06)",
                  border: "1px solid rgba(59,130,246,0.15)",
                  borderRadius: 10,
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  display: "flex",
                  gap: 8,
                }}
              >
                <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  Your CSV must have a <span className="mono">timestamp</span> and{" "}
                  <span className="mono">temp_c</span> column. Optionally include{" "}
                  <span className="mono">humidity_pct</span> for multivariate analysis.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="fade-in"
            style={{
              marginBottom: 24,
              padding: "16px 20px",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: "#f87171",
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Analysis Failed</div>
              <div style={{ fontSize: 13 }}>{error}</div>
            </div>
            <button
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#f87171",
              }}
              onClick={() => setError(null)}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Global loading overlay */}
        {loading && !result && (
          <div
            className="glass-card fade-in"
            style={{ padding: 48, textAlign: "center", marginBottom: 24 }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                border: "3px solid rgba(59,130,246,0.2)",
                borderTop: "3px solid #3b82f6",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 20px",
              }}
            />
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
              Running ML Analysis Pipeline
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Detecting anomalies · Calibrating sensor · Computing trust score · Generating explanation
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {result && (
          <div ref={resultsRef} className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Results header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>
                  {result.sensor_name}
                </h2>
                <div style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", gap: 12 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Globe size={12} />
                    {result.location.latitude}°N, {result.location.longitude}°E
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={12} />
                    {result.trust.readings_total} readings
                  </span>
                </div>
              </div>
              <button
                className="btn-secondary"
                onClick={() => {
                  setResult(null);
                  setSelectedDemo(null);
                  setUploadFile(null);
                }}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
                id="reset-btn"
              >
                <RefreshCw size={14} />
                New Analysis
              </button>
            </div>

            {/* Trust + Metrics row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "280px 1fr",
                gap: 24,
              }}
            >
              {/* Trust Score Panel */}
              <div
                className="glass-card"
                style={{
                  padding: 28,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 20,
                  boxShadow: `0 0 40px ${trustColor}18`,
                  borderColor: `${trustColor}30`,
                }}
              >
                <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 8 }}>
                  <Shield size={16} style={{ color: trustColor }} />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Trust Score</span>
                </div>
                <TrustGauge score={result.trust.trust_score} grade={result.trust.grade} />

                {/* Score breakdown */}
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ color: "var(--text-muted)" }}>Anomaly Rate</span>
                      <span className="mono" style={{ color: "var(--text-primary)" }}>
                        {result.trust.anomaly_rate_pct}%
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${Math.min(result.trust.anomaly_rate_pct, 100)}%`,
                          background:
                            result.trust.anomaly_rate_pct > 20
                              ? "#ef4444"
                              : result.trust.anomaly_rate_pct > 10
                              ? "#f59e0b"
                              : "#10b981",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ color: "var(--text-muted)" }}>Correlation (after)</span>
                      <span className="mono" style={{ color: "var(--text-primary)" }}>
                        {result.trust.correlation_after.toFixed(3)}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${Math.max(0, result.trust.correlation_after) * 100}%`,
                          background: "linear-gradient(90deg, #3b82f6, #06b6d4)",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ color: "var(--text-muted)" }}>Overall Score</span>
                      <span
                        className="mono"
                        style={{ color: progressColor(result.trust.trust_score) }}
                      >
                        {result.trust.trust_score}/100
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${result.trust.trust_score}%`,
                          background: `linear-gradient(90deg, ${progressColor(result.trust.trust_score)}, ${trustColor})`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Metrics grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                  alignContent: "start",
                }}
              >
                <MetricItem
                  label="Anomalies Flagged"
                  value={result.trust.anomalies_flagged}
                  icon={<AlertTriangle size={14} />}
                  color={result.trust.anomalies_flagged > 10 ? "#ef4444" : "#f59e0b"}
                />
                <MetricItem
                  label="Drift Magnitude"
                  value={result.trust.drift_magnitude_c > 0 ? `+${result.trust.drift_magnitude_c}` : result.trust.drift_magnitude_c}
                  unit="°C"
                  icon={<Activity size={14} />}
                  color={Math.abs(result.trust.drift_magnitude_c) > 1.5 ? "#ef4444" : "#10b981"}
                />
                <MetricItem
                  label="Total Readings"
                  value={result.trust.readings_total}
                  icon={<BarChart2 size={14} />}
                  color="var(--accent-cyan)"
                />
                <MetricItem
                  label="Correlation Before"
                  value={result.trust.correlation_before.toFixed(3)}
                  icon={<Thermometer size={14} />}
                  color={result.trust.correlation_before > 0.8 ? "#10b981" : "#f59e0b"}
                />
                <MetricItem
                  label="Correlation After"
                  value={result.trust.correlation_after.toFixed(3)}
                  icon={<Thermometer size={14} />}
                  color={result.trust.correlation_after > 0.8 ? "#10b981" : "#f59e0b"}
                />
                <MetricItem
                  label="Calibration"
                  value={result.calibration.applied ? "Applied" : "Failed"}
                  icon={<Zap size={14} />}
                  color={result.calibration.applied ? "#10b981" : "#ef4444"}
                />

                {/* Calibration details */}
                {result.calibration.applied && (
                  <div
                    className="metric-card"
                    style={{ gridColumn: "span 3", display: "flex", gap: 24, flexWrap: "wrap" }}
                  >
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Method
                      </div>
                      <div className="badge badge-purple">{result.calibration.method ?? "linear"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Scale Factor
                      </div>
                      <div className="mono" style={{ color: "var(--accent-cyan)", fontSize: 16, fontWeight: 600 }}>
                        {result.calibration.scale?.toFixed(4)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Bias
                      </div>
                      <div className="mono" style={{ color: "var(--accent-cyan)", fontSize: 16, fontWeight: 600 }}>
                        {result.calibration.bias_c?.toFixed(2)}°C
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Error Before → After
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="mono" style={{ color: "#f87171", fontSize: 15, fontWeight: 600 }}>
                          {result.calibration.mean_error_before?.toFixed(2)}°C
                        </span>
                        <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
                        <span className="mono" style={{ color: "#34d399", fontSize: 15, fontWeight: 600 }}>
                          {result.calibration.mean_error_after?.toFixed(2)}°C
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── CHART ── */}
            <div className="glass-card" style={{ padding: 28 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 24,
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <BarChart2 size={18} style={{ color: "var(--accent-cyan)" }} />
                  <h3 style={{ fontWeight: 600, fontSize: 16, margin: 0 }}>Timeseries Analysis</h3>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["temperature", "humidity"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 8,
                        border: "1px solid",
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.15s",
                        background:
                          activeTab === tab
                            ? "rgba(59,130,246,0.2)"
                            : "transparent",
                        borderColor:
                          activeTab === tab
                            ? "rgba(59,130,246,0.5)"
                            : "var(--border-subtle)",
                        color:
                          activeTab === tab ? "#60a5fa" : "var(--text-muted)",
                      }}
                      id={`tab-${tab}`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Anomaly legend */}
              {result.alerts.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    marginBottom: 16,
                    fontSize: 12,
                    color: "var(--text-muted)",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
                    Anomaly points ({result.alerts.length})
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 20, height: 2, background: "#3b82f6" }} />
                    Sensor reading
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 20, height: 2, background: "#94a3b8", borderTop: "2px dashed #94a3b8" }} />
                    Reference
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 20, height: 2, background: "#10b981" }} />
                    Corrected
                  </div>
                </div>
              )}

              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.04)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#4a6b8a" }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#4a6b8a" }}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tickFormatter={(v) => `${v}${activeTab === "temperature" ? "°" : "%"}`}
                  />
                  <Tooltip content={<CustomTooltip />} />

                  {activeTab === "temperature" ? (
                    <>
                      <Line
                        type="monotone"
                        dataKey="temp_c"
                        name="Sensor"
                        stroke="#3b82f6"
                        dot={false}
                        strokeWidth={2}
                        activeDot={{ r: 4, fill: "#3b82f6" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="reference_temp_c"
                        name="Reference"
                        stroke="#64748b"
                        dot={false}
                        strokeWidth={1.5}
                        strokeDasharray="5 3"
                      />
                      <Line
                        type="monotone"
                        dataKey="corrected_temp_c"
                        name="Corrected"
                        stroke="#10b981"
                        dot={false}
                        strokeWidth={2}
                      />
                      {/* Anomaly markers */}
                      {anomalyPoints?.map((p, i) => (
                        <ReferenceLine
                          key={i}
                          x={p.label}
                          stroke="rgba(239,68,68,0.3)"
                          strokeWidth={1}
                        />
                      ))}
                    </>
                  ) : (
                    <Line
                      type="monotone"
                      dataKey="humidity_pct"
                      name="Humidity"
                      stroke="#8b5cf6"
                      dot={false}
                      strokeWidth={2}
                      activeDot={{ r: 4, fill: "#8b5cf6" }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* ── ALERTS + AI EXPLANATION ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              {/* Anomaly Alerts */}
              <div className="glass-card" style={{ padding: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <AlertTriangle size={18} style={{ color: "#ef4444" }} />
                  <h3 style={{ fontWeight: 600, fontSize: 16, margin: 0 }}>Anomaly Alerts</h3>
                  <span
                    className={`badge ${result.alerts.length > 0 ? "badge-red" : "badge-green"}`}
                    style={{ marginLeft: "auto" }}
                  >
                    {result.alerts.length} event{result.alerts.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <AlertsList alerts={result.alerts} />
              </div>

              {/* AI Explanation */}
              <div
                className="glass-card"
                style={{
                  padding: 28,
                  borderColor:
                    result.explanation.source === "gemini"
                      ? "rgba(139,92,246,0.3)"
                      : "var(--border-subtle)",
                  boxShadow:
                    result.explanation.source === "gemini"
                      ? "0 0 30px rgba(139,92,246,0.1)"
                      : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <Cpu size={18} style={{ color: "var(--accent-purple)" }} />
                  <h3 style={{ fontWeight: 600, fontSize: 16, margin: 0 }}>AI Explanation</h3>
                  <span
                    className={`badge ${result.explanation.source === "gemini" ? "badge-purple" : "badge-blue"}`}
                    style={{ marginLeft: "auto" }}
                  >
                    {result.explanation.source === "gemini" ? "✦ Gemini" : "Template"}
                  </span>
                </div>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    lineHeight: 1.7,
                    fontSize: 14,
                    margin: 0,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {result.explanation.text}
                </p>
              </div>
            </div>

            {/* MSV-2035 Context Banner */}
            <div
              style={{
                padding: "20px 24px",
                background: "rgba(6,182,212,0.05)",
                border: "1px solid rgba(6,182,212,0.2)",
                borderRadius: 14,
                display: "flex",
                gap: 16,
                alignItems: "flex-start",
              }}
            >
              <Info size={18} style={{ color: "var(--accent-cyan)", flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 600, marginBottom: 6, color: "var(--accent-cyan)" }}>
                  MSV-2035 Instrument Crisis Context
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  The MSV-2035 Instrument Crisis exposed widespread calibration failures in low-cost
                  environmental sensors deployed across South Asian climate monitoring networks.
                  ClimateTrust AI automatically validates sensor readings against open reference data
                  (Open-Meteo) and applies linear calibration corrections to ensure data published to
                  national repositories meets research-grade standards.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {!result && !loading && (
          <div
            className="fade-in-delay-2"
            style={{
              padding: "48px 24px",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(59,130,246,0.08)",
                border: "1px solid rgba(59,130,246,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <Activity size={28} style={{ color: "var(--accent-blue)" }} />
            </div>
            <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 8 }}>
              Select a demo sensor or upload a CSV to begin
            </div>
            <div style={{ fontSize: 13 }}>
              Results will appear here with full trust scoring and anomaly detection
            </div>
          </div>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "24px",
          textAlign: "center",
          fontSize: 12,
          color: "var(--text-muted)",
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span>
            ClimateTrust AI · Built for{" "}
            <span style={{ color: "var(--accent-cyan)" }}>STEMINATE HACKS 2026</span>
          </span>
          <div style={{ display: "flex", gap: 16 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
              Isolation Forest
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6" }} />
              Rolling Z-Score
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#8b5cf6" }} />
              Drift Detection
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />
              Gemini AI Explain
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
