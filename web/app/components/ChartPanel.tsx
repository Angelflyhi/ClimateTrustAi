"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { BarChart2 } from "lucide-react";
import { TimeseriesPoint } from "@/lib/api";

interface Props {
  timeseries: TimeseriesPoint[];
  anomalyCount: number;
}

type Tab = "temperature" | "humidity" | "deviation";

interface ChartPoint extends TimeseriesPoint {
  label: string;
  deviation: number | null;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const dt = label ? new Date(label) : null;
  const dtStr = dt
    ? dt.toLocaleString("en-IN", {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : label;

  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "12px 16px",
        fontSize: 12,
        minWidth: 190,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      <div
        className="mono"
        style={{ color: "var(--text-muted)", marginBottom: 10, fontSize: 11 }}
      >
        {dtStr}
      </div>
      {payload.map((entry: any, i: number) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 20,
            marginBottom: i < payload.length - 1 ? 6 : 0,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: entry.color,
                display: "inline-block",
              }}
            />
            <span style={{ color: "var(--text-secondary)" }}>{entry.name}</span>
          </span>
          <span
            className="mono"
            style={{ color: "var(--text-primary)", fontWeight: 600 }}
          >
            {entry.value != null ? Number(entry.value).toFixed(2) : "—"}
            {entry.unit ?? ""}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ChartPanel({ timeseries, anomalyCount }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("temperature");

  const chartData: ChartPoint[] = timeseries.map((p) => {
    const dt = new Date(p.timestamp);
    const deviation =
      p.temp_c != null && p.reference_temp_c != null
        ? Math.round((p.temp_c - p.reference_temp_c) * 100) / 100
        : null;
    return {
      ...p,
      label: dt.toISOString(),
      deviation,
    };
  });

  const anomalyLabels = new Set(
    chartData
      .filter((p) => p.anomaly)
      .map((p) => p.label)
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: "temperature", label: "Temperature" },
    { id: "humidity", label: "Humidity" },
    { id: "deviation", label: "Deviation" },
  ];

  const xTickFormatter = (val: string) => {
    try {
      const d = new Date(val);
      return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    } catch {
      return val;
    }
  };

  return (
    <div className="glass-card" style={{ padding: 28 }}>
      {/* Header */}
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
          <h3 style={{ fontWeight: 600, fontSize: 16, margin: 0 }}>
            Timeseries Analysis
          </h3>
          <span className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {timeseries.length} readings
          </span>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: 3,
            background: "rgba(255,255,255,0.04)",
            borderRadius: 10,
            border: "1px solid var(--border-subtle)",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              id={`chart-tab-${tab.id}`}
              style={{
                padding: "5px 12px",
                borderRadius: 8,
                border: "none",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.15s",
                background:
                  activeTab === tab.id
                    ? "rgba(59,130,246,0.25)"
                    : "transparent",
                color:
                  activeTab === tab.id ? "#60a5fa" : "var(--text-muted)",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginBottom: 16,
          fontSize: 11,
          color: "var(--text-muted)",
          flexWrap: "wrap",
        }}
      >
        {activeTab === "temperature" && (
          <>
            <LegendItem color="#3b82f6" label="Sensor raw" />
            <LegendItem color="#64748b" label="Reference" dashed />
            <LegendItem color="#10b981" label="Corrected" />
            {anomalyCount > 0 && (
              <LegendItem
                color="rgba(239,68,68,0.5)"
                label={`${anomalyCount} anomaly markers`}
                dashed
              />
            )}
          </>
        )}
        {activeTab === "humidity" && (
          <LegendItem color="#8b5cf6" label="Humidity %" />
        )}
        {activeTab === "deviation" && (
          <>
            <LegendItem color="#f59e0b" label="Deviation from reference (°C)" />
            <LegendItem color="rgba(239,68,68,0.3)" label="Zero line" dashed />
          </>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#4a6b8a" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
            interval="preserveStartEnd"
            tickFormatter={xTickFormatter}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#4a6b8a" }}
            tickLine={false}
            axisLine={false}
            width={46}
            tickFormatter={(v) =>
              `${v}${activeTab === "humidity" ? "%" : "°"}`
            }
          />
          <Tooltip content={<CustomTooltip />} />

          {activeTab === "temperature" && (
            <>
              <Line
                type="monotone"
                dataKey="temp_c"
                name="Sensor"
                stroke="#3b82f6"
                dot={false}
                strokeWidth={2}
                activeDot={{ r: 4, fill: "#3b82f6" }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="reference_temp_c"
                name="Reference"
                stroke="#64748b"
                dot={false}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="corrected_temp_c"
                name="Corrected"
                stroke="#10b981"
                dot={false}
                strokeWidth={2}
                connectNulls
              />
              {/* Anomaly vertical lines */}
              {[...anomalyLabels].map((ts, i) => (
                <ReferenceLine
                  key={i}
                  x={ts}
                  stroke="rgba(239,68,68,0.25)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              ))}
            </>
          )}

          {activeTab === "humidity" && (
            <Line
              type="monotone"
              dataKey="humidity_pct"
              name="Humidity"
              stroke="#8b5cf6"
              dot={false}
              strokeWidth={2}
              activeDot={{ r: 4, fill: "#8b5cf6" }}
              connectNulls
            />
          )}

          {activeTab === "deviation" && (
            <>
              <ReferenceLine y={0} stroke="rgba(239,68,68,0.3)" strokeDasharray="5 3" />
              <Line
                type="monotone"
                dataKey="deviation"
                name="Deviation"
                stroke="#f59e0b"
                dot={false}
                strokeWidth={2}
                activeDot={{ r: 4, fill: "#f59e0b" }}
                connectNulls
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function LegendItem({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {dashed ? (
        <span
          style={{
            width: 20,
            height: 0,
            borderTop: `2px dashed ${color}`,
            display: "inline-block",
          }}
        />
      ) : (
        <span
          style={{
            width: 20,
            height: 2,
            background: color,
            display: "inline-block",
            borderRadius: 1,
          }}
        />
      )}
      {label}
    </span>
  );
}
