"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TimeseriesPoint } from "@/lib/types";

interface Props {
  data: TimeseriesPoint[];
}

export function TemperatureChart({ data }: Props) {
  const chartData = data.map((point) => ({
    ...point,
    label: new Date(point.timestamp).toLocaleString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
    }),
  }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            domain={["auto", "auto"]}
            label={{ value: "°C", angle: -90, position: "insideLeft", fill: "#64748b" }}
          />
          <Tooltip
            contentStyle={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "12px",
            }}
            labelStyle={{ color: "#94a3b8" }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="temp_c"
            name="Raw Sensor"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="corrected_temp_c"
            name="Calibrated"
            stroke="#34d399"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="reference_temp_c"
            name="Reference (Open-Meteo)"
            stroke="#60a5fa"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
