import { Bot, FileText } from "lucide-react";

import type { Explanation } from "@/lib/types";

interface Props {
  explanation: Explanation;
}

export function ExplanationPanel({ explanation }: Props) {
  const Icon = explanation.source === "gemini" ? Bot : FileText;

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-5 w-5 text-emerald-400" />
        <h3 className="font-semibold text-slate-100">AI Integrity Report</h3>
        <span className="ml-auto rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
          {explanation.source === "gemini" ? "Gemini" : "Rule-based"}
        </span>
      </div>
      <p className="leading-relaxed text-slate-300">{explanation.text}</p>
    </div>
  );
}
