export interface TrustMetrics {
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
  method: string;
  applied: boolean;
  scale?: number;
  bias_c?: number;
  mean_error_before?: number;
  mean_error_after?: number;
}

export interface Explanation {
  text: string;
  source: string;
}

export interface TimeseriesPoint {
  timestamp: string;
  temp_c: number | null;
  humidity_pct?: number | null;
  reference_temp_c: number | null;
  corrected_temp_c: number | null;
  anomaly: boolean;
}

export interface Alert {
  timestamp: string;
  reasons: string[];
}

export interface AnalysisResult {
  sensor_name: string;
  location: { latitude: number; longitude: number };
  trust: TrustMetrics;
  calibration: CalibrationMeta;
  explanation: Explanation;
  timeseries: TimeseriesPoint[];
  alerts: Alert[];
}

export interface DemoSensor {
  id: string;
  name: string;
  description: string;
}
