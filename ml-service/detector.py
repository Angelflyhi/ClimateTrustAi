"""Anomaly detection: spikes, drift, and isolation forest."""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest


@dataclass
class DetectionSummary:
    spike_count: int = 0
    drift_detected: bool = False
    drift_magnitude_c: float = 0.0
    isolation_anomaly_count: int = 0
    anomaly_indices: list[int] = field(default_factory=list)
    anomaly_reasons: dict[int, list[str]] = field(default_factory=dict)


def _rolling_zscore(series: pd.Series, window: int = 24) -> pd.Series:
    min_periods = max(3, window // 4)
    rolling_mean = series.rolling(window=window, min_periods=min_periods).mean()
    rolling_std = series.rolling(window=window, min_periods=min_periods).std()
    return (series - rolling_mean) / rolling_std.replace(0, np.nan)


def detect_anomalies(
    df: pd.DataFrame,
    temp_col: str = "temp_c",
    ref_col: str = "reference_temp_c",
    z_threshold: float = 3.0,
    drift_window: int = 48,
) -> tuple[pd.DataFrame, DetectionSummary]:
    work = df.copy().reset_index(drop=True)
    work["anomaly"] = False
    work["anomaly_score"] = 0.0
    reasons: dict[int, list[str]] = {}

    def flag(idx: int, reason: str, weight: float = 1.0) -> None:
        work.at[idx, "anomaly"] = True
        work.at[idx, "anomaly_score"] = float(work.at[idx, "anomaly_score"]) + weight
        reasons.setdefault(idx, []).append(reason)

    spike_count = 0
    if temp_col in work.columns:
        z = _rolling_zscore(work[temp_col].astype(float))
        spike_mask = z.abs() > z_threshold
        for idx in work.index[spike_mask.fillna(False)]:
            spike_count += 1
            flag(int(idx), f"Temperature spike (z={z.iloc[idx]:.1f})", 1.5)

    drift_detected = False
    drift_magnitude = 0.0
    if temp_col in work.columns and ref_col in work.columns:
        deviation = work[temp_col].astype(float) - work[ref_col].astype(float)
        work["temp_deviation"] = deviation
        rolling_dev = deviation.rolling(window=drift_window, min_periods=12).mean()
        if len(rolling_dev.dropna()) > 0:
            drift_magnitude = float(rolling_dev.iloc[-1])
        drift_detected = abs(drift_magnitude) > 1.5
        drift_mask = deviation.abs() > 2.5
        for idx in work.index[drift_mask.fillna(False)]:
            flag(int(idx), f"Drift from reference ({deviation.iloc[idx]:+.1f}°C)", 1.0)

    isolation_count = 0
    feature_cols = [c for c in [temp_col, "humidity_pct", ref_col] if c in work.columns]
    if len(feature_cols) >= 2 and len(work) >= 20:
        features = work[feature_cols].astype(float).ffill().bfill()
        model = IsolationForest(contamination=0.05, random_state=42, n_estimators=100)
        preds = model.fit_predict(features)
        scores = -model.score_samples(features)
        work["isolation_score"] = scores
        for idx in work.index[preds == -1]:
            isolation_count += 1
            flag(int(idx), "Multivariate isolation forest anomaly", 0.8)

    anomaly_indices = sorted({int(i) for i in work.index[work["anomaly"]].tolist()})
    summary = DetectionSummary(
        spike_count=spike_count,
        drift_detected=drift_detected,
        drift_magnitude_c=round(drift_magnitude, 2),
        isolation_anomaly_count=isolation_count,
        anomaly_indices=anomaly_indices,
        anomaly_reasons=reasons,
    )
    return work, summary
