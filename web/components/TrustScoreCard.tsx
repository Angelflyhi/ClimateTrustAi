import { Shield, TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

import type { TrustMetrics } from "@/lib/types";

const GRADE_STYLES: Record<string, string> = {
  A: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/40 text-emerald-300",
  B: "from-sky-500/20 to-sky-600/5 border-sky-500/40 text-sky-300",
  C: "from-amber-500/20 to-amber-600/5 border-amber-500/40 text-amber-300",
  D: "from-orange-500/20 to-orange-600/5 border-orange-500/40 text-orange-300",
  F: "from-rose-500/20 to-rose-600/5 border-rose-500/40 text-rose-300",
};

interface Props {
  trust: TrustMetrics;
}

export function TrustScoreCard({ trust }: Props) {
  const gradeStyle = GRADE_STYLES[trust.grade] ?? GRADE_STYLES.F;
  const improved = trust.correlation_after > trust.correlation_before;

  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-6 ${gradeStyle}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
            Trust Score
          </p>
          <div className="mt-2 flex items-end gap-3">
            <span className="text-5xl font-bold tabular-nums">{trust.trust_score}</span>
            <span className="mb-2 text-lg text-slate-400">/ 100</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Shield className="h-8 w-8 opacity-80" />
          <span className="rounded-full border px-3 py-1 text-sm font-bold">
            Grade {trust.grade}
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
        <Metric label="Anomalies" value={`${trust.anomalies_flagged} / ${trust.readings_total}`} />
        <Metric label="Anomaly Rate" value={`${trust.anomaly_rate_pct}%`} />
        <Metric label="Drift" value={`${trust.drift_magnitude_c > 0 ? "+" : ""}${trust.drift_magnitude_c}°C`} />
        <Metric
          label="Correlation"
          value={
            <span className="inline-flex items-center gap-1">
              {trust.correlation_before.toFixed(2)}
              <span className="text-slate-500">→</span>
              {trust.correlation_after.toFixed(2)}
              {improved ? (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
              )}
            </span>
          }
        />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl bg-black/20 px-3 py-2">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-0.5 font-medium text-slate-100">{value}</p>
    </div>
  );
}
