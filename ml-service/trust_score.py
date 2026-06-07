"""Compute 0–100 trust score from detection and calibration metrics."""

from __future__ import annotations

import numpy as np
import pandas as pd

from detector import DetectionSummary


def _grade(score: float) -> str:
    if score >= 85:
        return "A"
    if score >= 70:
        return "B"
    if score >= 50:
        return "C"
    if score >= 30:
        return "D"
    return "F"


def compute_trust_score(
    df: pd.DataFrame,
    summary: DetectionSummary,
    calibration_meta: dict,
    temp_col: str = "temp_c",
    ref_col: str = "reference_temp_c",
    corrected_col: str = "corrected_temp_c",
) -> dict:
    n = max(len(df), 1)
    anomaly_rate = len(summary.anomaly_indices) / n

    correlation_before = 0.0
    correlation_after = 0.0

    if temp_col in df.columns and ref_col in df.columns:
        valid = df[[temp_col, ref_col]].dropna()
        if len(valid) > 2:
            correlation_before = float(valid[temp_col].corr(valid[ref_col]))

    if corrected_col in df.columns and ref_col in df.columns:
        valid = df[[corrected_col, ref_col]].dropna()
        if len(valid) > 2:
            correlation_after = float(valid[corrected_col].corr(valid[ref_col]))

    score = 100.0
    score -= min(40.0, anomaly_rate * 200)
    score -= min(25.0, abs(summary.drift_magnitude_c) * 5)
    score -= max(0.0, (0.85 - correlation_before) * 30)
    if calibration_meta.get("applied"):
        score += min(15.0, max(0.0, (correlation_after - correlation_before) * 30))

    score = float(np.clip(score, 0, 100))

    return {
        "trust_score": round(score, 1),
        "grade": _grade(score),
        "anomaly_rate_pct": round(anomaly_rate * 100, 1),
        "drift_magnitude_c": summary.drift_magnitude_c,
        "correlation_before": round(correlation_before, 3),
        "correlation_after": round(correlation_after, 3),
        "readings_total": n,
        "anomalies_flagged": len(summary.anomaly_indices),
    }
