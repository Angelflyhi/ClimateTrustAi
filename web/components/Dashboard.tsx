"use client";

import { Download, MapPin, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AlertList } from "@/components/AlertList";
import { DemoSensors } from "@/components/DemoSensors";
import { ExplanationPanel } from "@/components/ExplanationPanel";
import { TemperatureChart } from "@/components/TemperatureChart";
import { TrustScoreCard } from "@/components/TrustScoreCard";
import { UploadPanel } from "@/components/UploadPanel";
import type { AnalysisResult, DemoSensor } from "@/lib/types";

export function Dashboard() {
  const [demos, setDemos] = useState<DemoSensor[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/demos")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setDemos(data);
      })
      .catch(() => setError("Could not load demo sensors"));
  }, []);

  const analyzeDemo = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setActiveId(id);
    try {
      const response = await fetch(`/api/demo/${id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? "Analysis failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const analyzeUpload = useCallback(async (file: File, sensorName: string) => {
    setLoading(true);
    setError(null);
    setActiveId(null);
    const form = new FormData();
    form.append("file", file);
    form.append("sensor_name", sensorName);
    try {
      const response = await fetch("/api/analyze", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? "Upload analysis failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload analysis failed");
    } finally {
      setLoading(false);
    }
  }, []);

  function downloadReport() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `climatetrust-report-${result.sensor_name.replace(/\s+/g, "-").toLowerCase()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
              STEMINATE HACKS 2026 · AI × Social Good
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              ClimateTrust AI
            </h1>
            <p className="mt-2 max-w-2xl text-slate-400">
              Agentic validation layer for environmental sensors — detecting drift, flagging
              anomalies, and restoring credibility to climate data affected by the MSV-2035
              Instrument Crisis.
            </p>
          </div>
          {result && (
            <button
              type="button"
              onClick={downloadReport}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-700"
            >
              <Download className="h-4 w-4" />
              Export Report
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
          <span className="mt-1 block text-xs text-rose-400/80">
            Ensure the ML service is running:{" "}
            <code className="rounded bg-black/30 px-1">cd ml-service; uvicorn main:app --reload</code>
          </span>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        <aside className="space-y-8 lg:col-span-4">
          <DemoSensors
            demos={demos}
            activeId={activeId}
            loading={loading}
            onSelect={analyzeDemo}
          />
          <UploadPanel loading={loading && !activeId} onUpload={analyzeUpload} />

          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <MapPin className="h-4 w-4 text-emerald-400" />
              Demo location: Delhi, India (28.61°N, 77.21°E)
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Reference data cross-validates against Open-Meteo satellite-grade anchors.
              Try Sensor B to see drift detection in action.
            </p>
          </div>
        </aside>

        <main className="space-y-6 lg:col-span-8">
          {!result && !loading && (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/20 p-12 text-center">
              <RefreshCw className="h-10 w-10 text-slate-600" />
              <p className="mt-4 text-lg font-medium text-slate-300">
                Select a demo sensor to begin
              </p>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                Start with <strong className="text-orange-400">Sensor B (Drift)</strong> to see
                trust scores drop and AI explanations kick in.
              </p>
            </div>
          )}

          {loading && !result && (
            <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/20">
              <RefreshCw className="h-8 w-8 animate-spin text-emerald-400" />
            </div>
          )}

          {result && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">{result.sensor_name}</h2>
                {result.calibration.applied && (
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                    Calibrated · scale {result.calibration.scale} · bias {result.calibration.bias_c}°C
                  </span>
                )}
              </div>

              <TrustScoreCard trust={result.trust} />
              <ExplanationPanel explanation={result.explanation} />

              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-5">
                <h3 className="mb-4 font-semibold text-slate-100">
                  Temperature — Raw vs Calibrated vs Reference
                </h3>
                <TemperatureChart data={result.timeseries} />
              </div>

              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-5">
                <h3 className="mb-4 font-semibold text-slate-100">Anomaly Alerts</h3>
                <AlertList alerts={result.alerts} />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
