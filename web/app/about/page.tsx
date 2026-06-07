import type { Metadata } from "next";
import Link from "next/link";
import {
  Shield,
  Globe,
  Cpu,
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  BookOpen,
  BarChart2,
  Database,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About — ClimateTrust AI",
  description:
    "Learn about the methodology, ethics, and technology behind ClimateTrust AI's sensor validation pipeline.",
};

const PIPELINE_STAGES = [
  {
    icon: <Database size={20} />,
    color: "#3b82f6",
    title: "1. Ingest",
    desc: "CSV upload or pre-loaded demo sensor. Timestamps are parsed and aligned to hourly resolution.",
  },
  {
    icon: <Globe size={20} />,
    color: "#06b6d4",
    title: "2. Reference Fetch",
    desc: "Open-Meteo Archive API provides satellite-grade hourly temperature and humidity for any coordinates. No API key required.",
  },
  {
    icon: <Activity size={20} />,
    color: "#f59e0b",
    title: "3. Anomaly Detection",
    desc: "Three methods run in parallel: Rolling Z-Score (spikes), cumulative deviation analysis (drift), and Isolation Forest (multivariate patterns).",
  },
  {
    icon: <Zap size={20} />,
    color: "#10b981",
    title: "4. Calibration",
    desc: "Drift-detrend + affine least-squares correction. Produces a corrected temperature stream with quantified improvement.",
  },
  {
    icon: <BarChart2 size={20} />,
    color: "#8b5cf6",
    title: "5. Trust Score",
    desc: "A 0–100 score weighted by anomaly rate, drift magnitude, and reference correlation. Grades A–F with a transparent, auditable formula.",
  },
  {
    icon: <Cpu size={20} />,
    color: "#ec4899",
    title: "6. AI Explanation",
    desc: "Gemini 2.0 Flash generates a plain-English narrative citing specific numbers. Falls back to a deterministic template if API is unavailable.",
  },
];

const ETHICS_POINTS = [
  {
    icon: <CheckCircle size={18} />,
    color: "#10b981",
    title: "No black-box rejection",
    desc: "Every anomaly flag includes a machine-readable reason. We never silently discard data.",
  },
  {
    icon: <Shield size={18} />,
    color: "#3b82f6",
    title: "Transparent scoring",
    desc: "The trust formula is published in the README, architecture docs, and shown in the UI. There are no hidden weights.",
  },
  {
    icon: <AlertTriangle size={18} />,
    color: "#f59e0b",
    title: "Correction, not suppression",
    desc: "Calibrated data is shown alongside raw data. Users can always see the original readings.",
  },
  {
    icon: <Database size={18} />,
    color: "#8b5cf6",
    title: "No data retention",
    desc: "Uploaded CSVs are processed in-memory only. Nothing is stored, logged, or used for retraining.",
  },
];

const TECH_STACK = [
  { layer: "Frontend", tech: "Next.js 16 + Tailwind CSS v4", lang: "TypeScript" },
  { layer: "Charts", tech: "Recharts 3.x", lang: "React" },
  { layer: "ML API", tech: "FastAPI + uvicorn", lang: "Python" },
  { layer: "Anomaly Detection", tech: "scikit-learn Isolation Forest", lang: "Python" },
  { layer: "Statistical Analysis", tech: "pandas + numpy", lang: "Python" },
  { layer: "Reference Data", tech: "Open-Meteo Archive API", lang: "REST" },
  { layer: "AI Explanations", tech: "Google Gemini 2.0 Flash", lang: "API" },
  { layer: "Containerization", tech: "Docker + Docker Compose", lang: "YAML" },
];

export default function AboutPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <nav className="top-nav">
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0 24px",
            height: 64,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--text-muted)",
              textDecoration: "none",
              fontSize: 14,
              transition: "color 0.15s",
            }}
            id="back-to-dashboard-link"
          >
            <ArrowLeft size={16} />
            Dashboard
          </Link>
          <span style={{ color: "var(--border)" }}>·</span>
          <span style={{ fontWeight: 600, fontSize: 15 }}>
            About ClimateTrust AI
          </span>
        </div>
      </nav>

      <main
        style={{
          flex: 1,
          maxWidth: 1100,
          width: "100%",
          margin: "0 auto",
          padding: "60px 24px 80px",
        }}
      >
        {/* Hero */}
        <div className="fade-in" style={{ marginBottom: 64, textAlign: "center" }}>
          <div className="badge badge-blue" style={{ marginBottom: 20, display: "inline-flex" }}>
            <Globe size={11} />
            STEMINATE HACKS 2026 · Environmental AI Track
          </div>
          <h1
            style={{
              fontSize: "clamp(28px, 5vw, 48px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: 20,
            }}
          >
            Built for the{" "}
            <span className="gradient-text">MSV-2035 Instrument Crisis</span>
          </h1>
          <p
            style={{
              fontSize: 17,
              color: "var(--text-secondary)",
              maxWidth: 640,
              margin: "0 auto",
              lineHeight: 1.7,
            }}
          >
            India&apos;s scientific community faces a credibility crisis: uncalibrated, imported
            instruments are producing flawed climate data that enters national research journals.
            ClimateTrust AI is the validation layer that stands between bad sensor data and
            published science.
          </p>
        </div>

        {/* Pipeline */}
        <section style={{ marginBottom: 64 }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 8,
              letterSpacing: "-0.02em",
            }}
          >
            How the pipeline works
          </h2>
          <p style={{ color: "var(--text-muted)", marginBottom: 32, fontSize: 14 }}>
            Six stages run end-to-end in under 4 seconds for a 168-row dataset.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 16,
            }}
          >
            {PIPELINE_STAGES.map((stage) => (
              <div
                key={stage.title}
                className="glass-card"
                style={{
                  padding: 22,
                  borderColor: `${stage.color}20`,
                  transition: "border-color 0.2s, transform 0.2s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: `${stage.color}18`,
                      border: `1px solid ${stage.color}30`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: stage.color,
                    }}
                  >
                    {stage.icon}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{stage.title}</span>
                </div>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    lineHeight: 1.65,
                    margin: 0,
                  }}
                >
                  {stage.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Trust Score Formula */}
        <section
          className="glass-card"
          style={{ padding: 32, marginBottom: 64 }}
        >
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              marginBottom: 20,
              letterSpacing: "-0.02em",
            }}
          >
            Trust Score Formula
          </h2>
          <pre
            className="mono"
            style={{
              fontSize: 13,
              lineHeight: 1.8,
              color: "var(--text-secondary)",
              background: "rgba(0,0,0,0.3)",
              padding: "20px 24px",
              borderRadius: 10,
              border: "1px solid var(--border-subtle)",
              overflowX: "auto",
              margin: 0,
            }}
          >
            {`score = 100\nscore -= min(40, anomaly_rate × 200)         # anomaly penalty (max -40)\nscore -= min(25, |drift_magnitude_c| × 5)    # drift penalty   (max -25)\nscore -= max(0, (0.85 - corr_before) × 30)  # correlation penalty\nif calibrated:\n    score += min(15, (corr_after - corr_before) × 30)  # calibration bonus\nscore = clamp(score, 0, 100)\n\nGrades:  A ≥ 85  ·  B ≥ 70  ·  C ≥ 50  ·  D ≥ 30  ·  F < 30`}
          </pre>
        </section>

        {/* Ethics */}
        <section style={{ marginBottom: 64 }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 8,
              letterSpacing: "-0.02em",
            }}
          >
            Ethical AI commitments
          </h2>
          <p style={{ color: "var(--text-muted)", marginBottom: 32, fontSize: 14 }}>
            AI systems making judgements about data quality must be transparent, explainable, and fair.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 14,
            }}
          >
            {ETHICS_POINTS.map((point) => (
              <div
                key={point.title}
                style={{
                  padding: "18px 20px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 12,
                  display: "flex",
                  gap: 14,
                }}
              >
                <span style={{ color: point.color, flexShrink: 0, marginTop: 2 }}>
                  {point.icon}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
                    {point.title}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                    {point.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, textAlign: "right" }}>
            <Link
              href="/docs/ETHICS.md"
              style={{ fontSize: 13, color: "var(--accent-cyan)", textDecoration: "none" }}
            >
              Read full ethics document →
            </Link>
          </div>
        </section>

        {/* Tech Stack */}
        <section style={{ marginBottom: 64 }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 8,
              letterSpacing: "-0.02em",
            }}
          >
            Tech stack
          </h2>
          <p style={{ color: "var(--text-muted)", marginBottom: 32, fontSize: 14 }}>
            Custom, solo-friendly stack — no GPU required, deploys on free tiers.
          </p>

          <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  {["Layer", "Technology", "Language"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 20px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TECH_STACK.map((row, i) => (
                  <tr
                    key={row.layer}
                    style={{
                      borderBottom:
                        i < TECH_STACK.length - 1
                          ? "1px solid var(--border-subtle)"
                          : "none",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(255,255,255,0.02)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <td
                      style={{
                        padding: "13px 20px",
                        fontSize: 13,
                        color: "var(--text-muted)",
                        fontWeight: 500,
                      }}
                    >
                      {row.layer}
                    </td>
                    <td
                      style={{
                        padding: "13px 20px",
                        fontSize: 13,
                        color: "var(--text-primary)",
                        fontWeight: 500,
                      }}
                    >
                      {row.tech}
                    </td>
                    <td style={{ padding: "13px 20px" }}>
                      <span className="badge badge-blue" style={{ fontSize: 10 }}>
                        {row.lang}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* CTA */}
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            background: "rgba(59,130,246,0.05)",
            border: "1px solid rgba(59,130,246,0.2)",
            borderRadius: 16,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
            Ready to validate your sensor?
          </div>
          <p
            style={{
              color: "var(--text-muted)",
              marginBottom: 24,
              fontSize: 14,
            }}
          >
            Click a demo sensor or upload your own CSV — results in under 4 seconds.
          </p>
          <Link
            href="/"
            className="btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              padding: "12px 28px",
            }}
            id="go-to-dashboard-btn"
          >
            <BookOpen size={15} />
            Open Dashboard
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "20px 24px",
          textAlign: "center",
          fontSize: 12,
          color: "var(--text-muted)",
        }}
      >
        ClimateTrust AI · Built for{" "}
        <span style={{ color: "var(--accent-cyan)" }}>STEMINATE HACKS 2026</span>
        {" "}· MIT License
      </footer>
    </div>
  );
}
