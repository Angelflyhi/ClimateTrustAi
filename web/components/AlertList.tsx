import { AlertTriangle } from "lucide-react";

import type { Alert } from "@/lib/types";

interface Props {
  alerts: Alert[];
}

export function AlertList({ alerts }: Props) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-6 text-center text-sm text-emerald-300">
        No anomalies detected — sensor data looks consistent with reference.
      </div>
    );
  }

  const visible = alerts.slice(0, 8);

  return (
    <div className="space-y-2">
      {visible.map((alert) => (
        <div
          key={alert.timestamp}
          className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <p className="text-xs text-slate-400">
              {new Date(alert.timestamp).toLocaleString("en-IN")}
            </p>
            <ul className="mt-1 space-y-0.5 text-sm text-slate-200">
              {alert.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        </div>
      ))}
      {alerts.length > visible.length && (
        <p className="text-center text-xs text-slate-500">
          +{alerts.length - visible.length} more anomalies
        </p>
      )}
    </div>
  );
}
