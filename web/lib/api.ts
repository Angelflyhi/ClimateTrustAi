/**
 * ClimateTrust AI — Typed API client for the ML service.
 * All ML service requests go through this module.
 */

const ML_BASE =
  process.env.NEXT_PUBLIC_ML_URL ?? "http://localhost:8000";

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface TimeseriesPoint {
  timestamp: string;
  temp_c: number | null;
  humidity_pct: number | null;
  reference_temp_c: number | null;
  corrected_temp_c: number | null;
  anomaly: boolean;
}

export interface Alert {
  timestamp: string;
  reasons: string[];
}

export interface TrustScore {
  trust_score: number;
  grade: string;
  anomaly_rate_pct: number;
  drift_magnitude_c: number;
  correlation_before: number;
  correlation_after: number;
  readings_total: number;
  anomalies_flagged: number;
}

export interface CalibrationMeta {
  applied: boolean;
  method?: string;
  scale?: number;
  bias_c?: number;
  drift_slope_per_hour?: number;
  mean_error_before?: number;
  mean_error_after?: number;
  note?: string;
}

export interface ExplanationResult {
  text: string;
  source: "gemini" | "template";
}

export interface AnalysisResult {
  sensor_name: string;
  location: { latitude: number; longitude: number };
  trust: TrustScore;
  calibration: CalibrationMeta;
  explanation: ExplanationResult;
  timeseries: TimeseriesPoint[];
  alerts: Alert[];
}

export interface DemoSensor {
  id: string;
  name: string;
  description: string;
}

export interface HealthStatus {
  status: string;
  service: string;
}

// ─── Error handling ────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly detail?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail: unknown;
    try {
      const body = await res.json();
      detail = body.detail ?? body;
    } catch {
      detail = await res.text().catch(() => "Unknown error");
    }
    const message =
      typeof detail === "string"
        ? detail
        : JSON.stringify(detail);
    throw new ApiError(message, res.status, detail);
  }
  return res.json() as Promise<T>;
}

// ─── API functions ─────────────────────────────────────────────────────────────

/**
 * Check if the ML service is reachable.
 */
export async function checkHealth(): Promise<HealthStatus> {
  const res = await fetch(`${ML_BASE}/health`, {
    next: { revalidate: 30 },
  });
  return parseResponse<HealthStatus>(res);
}

/**
 * Fetch the list of available demo sensors.
 */
export async function fetchDemos(): Promise<DemoSensor[]> {
  const res = await fetch(`${ML_BASE}/demos`, {
    next: { revalidate: 3600 },
  });
  return parseResponse<DemoSensor[]>(res);
}

/**
 * Run analysis on a pre-built demo sensor.
 * Demo sensors use embedded reference data (no Open-Meteo call).
 */
export async function analyzeDemoSensor(
  sensorId: string,
  latitude?: number,
  longitude?: number
): Promise<AnalysisResult> {
  const params = new URLSearchParams();
  if (latitude !== undefined) params.set("latitude", String(latitude));
  if (longitude !== undefined) params.set("longitude", String(longitude));

  const url = `${ML_BASE}/demo/${sensorId}${
    params.toString() ? "?" + params.toString() : ""
  }`;
  const res = await fetch(url);
  return parseResponse<AnalysisResult>(res);
}

/**
 * Upload a CSV file and run the full analysis pipeline.
 * Optionally pass a custom sensor name and location.
 */
export async function analyzeCSV(
  file: File,
  options: {
    sensorName?: string;
    latitude?: number;
    longitude?: number;
    useOpenMeteo?: boolean;
  } = {}
): Promise<AnalysisResult> {
  const form = new FormData();
  form.append("file", file);
  if (options.sensorName)
    form.append("sensor_name", options.sensorName);
  if (options.latitude !== undefined)
    form.append("latitude", String(options.latitude));
  if (options.longitude !== undefined)
    form.append("longitude", String(options.longitude));
  if (options.useOpenMeteo !== undefined)
    form.append("use_open_meteo", String(options.useOpenMeteo));

  const res = await fetch(`${ML_BASE}/analyze`, {
    method: "POST",
    body: form,
  });
  return parseResponse<AnalysisResult>(res);
}

/**
 * Analyze sensor data provided as a CSV string (no file upload).
 */
export async function analyzeCSVText(
  csvText: string,
  options: {
    sensorName?: string;
    latitude?: number;
    longitude?: number;
    useOpenMeteo?: boolean;
  } = {}
): Promise<AnalysisResult> {
  const res = await fetch(`${ML_BASE}/analyze/json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      csv_text: csvText,
      sensor_name: options.sensorName ?? "Uploaded Sensor",
      latitude: options.latitude,
      longitude: options.longitude,
      use_open_meteo: options.useOpenMeteo ?? true,
    }),
  });
  return parseResponse<AnalysisResult>(res);
}

/**
 * Fetch raw Open-Meteo reference data for a date range and location.
 */
export async function fetchReference(
  startDate: string,
  endDate: string,
  latitude: number,
  longitude: number
): Promise<{ count: number; data: TimeseriesPoint[] }> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    latitude: String(latitude),
    longitude: String(longitude),
  });
  const res = await fetch(`${ML_BASE}/reference?${params}`);
  return parseResponse(res);
}

// ─── Utility helpers ───────────────────────────────────────────────────────────

/**
 * Format a trust score grade for display.
 */
export function gradeLabel(grade: string): string {
  const labels: Record<string, string> = {
    A: "Excellent",
    B: "Good",
    C: "Fair",
    D: "Poor",
    F: "Failing",
  };
  return labels[grade] ?? grade;
}

/**
 * Return a CSS color variable name for a given trust grade.
 */
export function gradeColor(grade: string): string {
  const colors: Record<string, string> = {
    A: "#10b981",
    B: "#34d399",
    C: "#f59e0b",
    D: "#f97316",
    F: "#ef4444",
  };
  return colors[grade] ?? "#60a5fa";
}

/**
 * Generate a downloadable JSON report from analysis results.
 */
export function generateReport(result: AnalysisResult): string {
  const report = {
    generated_at: new Date().toISOString(),
    platform: "ClimateTrust AI",
    version: "1.0.0",
    sensor_name: result.sensor_name,
    location: result.location,
    summary: {
      trust_score: result.trust.trust_score,
      grade: result.trust.grade,
      grade_label: gradeLabel(result.trust.grade),
      total_readings: result.trust.readings_total,
      anomalies_flagged: result.trust.anomalies_flagged,
      anomaly_rate_pct: result.trust.anomaly_rate_pct,
      drift_magnitude_c: result.trust.drift_magnitude_c,
      correlation_before: result.trust.correlation_before,
      correlation_after: result.trust.correlation_after,
    },
    calibration: result.calibration,
    ai_explanation: result.explanation,
    alerts: result.alerts,
    timeseries_sample: result.timeseries.slice(0, 10),
    timeseries_total_rows: result.timeseries.length,
  };
  return JSON.stringify(report, null, 2);
}

/**
 * Trigger a browser download of the JSON report.
 */
export function downloadReport(result: AnalysisResult): void {
  const json = generateReport(result);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `climatetrust_report_${result.sensor_name
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase()}_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
