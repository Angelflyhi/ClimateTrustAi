"use client";

import { gradeColor } from "@/lib/api";

interface Props {
  score: number;
  grade: string;
  size?: number;
}

export default function TrustGauge({ score, grade, size = 160 }: Props) {
  const r = size * 0.3375; // radius = 54/160 * size
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = gradeColor(grade);

  const gradeBg: Record<string, string> = {
    A: "rgba(16, 185, 129, 0.12)",
    B: "rgba(52, 211, 153, 0.12)",
    C: "rgba(245, 158, 11, 0.12)",
    D: "rgba(249, 115, 22, 0.12)",
    F: "rgba(239, 68, 68, 0.12)",
  };

  const gradeLabels: Record<string, string> = {
    A: "Excellent",
    B: "Good",
    C: "Fair",
    D: "Poor",
    F: "Failing",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      {/* SVG Gauge */}
      <div style={{ position: "relative", width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`Trust score: ${score} out of 100, Grade ${grade}`}
        >
          {/* Background track */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={size * 0.075}
          />

          {/* Progress arc */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={size * 0.075}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{
              transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)",
            }}
          />

          {/* Tip dot */}
          <circle
            cx={cx}
            cy={cy - r}
            r={size * 0.04}
            fill={color}
            style={{
              transform: `rotate(${(score / 100) * 360 - 90}deg)`,
              transformOrigin: `${cx}px ${cy}px`,
              filter: `drop-shadow(0 0 ${size * 0.04}px ${color})`,
              transition:
                "transform 1.2s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        </svg>

        {/* Centre text */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: size * 0.225,
              fontWeight: 700,
              color,
              lineHeight: 1,
            }}
          >
            {score}
          </span>
          <span
            style={{
              fontSize: size * 0.075,
              color: "var(--text-muted)",
              letterSpacing: "0.1em",
              marginTop: 2,
            }}
          >
            / 100
          </span>
        </div>
      </div>

      {/* Grade badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 20px",
          borderRadius: 99,
          background: gradeBg[grade] ?? "rgba(59,130,246,0.12)",
          border: `1px solid ${color}40`,
        }}
      >
        <span style={{ color, fontWeight: 700, fontSize: 20 }}>
          Grade {grade}
        </span>
        <span
          style={{
            color: "var(--text-muted)",
            fontSize: 12,
            marginLeft: 4,
          }}
        >
          {gradeLabels[grade] ?? ""}
        </span>
      </div>
    </div>
  );
}
