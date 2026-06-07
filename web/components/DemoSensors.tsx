"use client";

import { Loader2, Radio } from "lucide-react";

import type { DemoSensor } from "@/lib/types";

interface Props {
  demos: DemoSensor[];
  activeId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
}

const DEMO_ACCENTS: Record<string, string> = {
  a: "hover:border-emerald-500/50",
  b: "hover:border-orange-500/50",
  c: "hover:border-rose-500/50",
};

export function DemoSensors({ demos, activeId, loading, onSelect }: Props) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-widest text-slate-400">
        Demo Sensors — Delhi
      </h2>
      <div className="grid gap-3">
        {demos.map((demo) => (
          <button
            key={demo.id}
            type="button"
            disabled={loading}
            onClick={() => onSelect(demo.id)}
            className={`rounded-xl border bg-slate-900/50 p-4 text-left transition ${
              activeId === demo.id
                ? "border-emerald-500/60 ring-1 ring-emerald-500/30"
                : `border-slate-700/60 ${DEMO_ACCENTS[demo.id] ?? ""}`
            }`}
          >
            <div className="flex items-center gap-2">
              {loading && activeId === demo.id ? (
                <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
              ) : (
                <Radio className="h-4 w-4 text-slate-400" />
              )}
              <span className="font-medium text-slate-100">{demo.name}</span>
            </div>
            <p className="mt-1 text-sm text-slate-400">{demo.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
