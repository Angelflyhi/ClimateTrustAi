"""Orchestrate the full analysis pipeline."""

from __future__ import annotations

from io import StringIO
from pathlib import Path
from typing import Any

import pandas as pd

from agent import generate_explanation
from calibrator import calibrate_sensor
from detector import detect_anomalies
from reference import (
    DEFAULT_LATITUDE,
    DEFAULT_LONGITUDE,
    date_range_from_timestamps,
    fetch_reference,
    merge_sensor_with_reference,
)
from trust_score import compute_trust_score

SAMPLES_DIR = Path(__file__).resolve().parent.parent / "data" / "samples"

DEMO_SENSORS: dict[str, dict[str, Any]] = {
    "a": {
        "file": "sensor_a_clean.csv",
        "name": "Delhi Campus Sensor A (Control)",
        "description": "Well-calibrated reference sensor — expected high trust score.",
    },
    "b": {
        "file": "sensor_b_drift.csv",
        "name": "Delhi Campus Sensor B (Drift)",
        "description": "Uncalibrated thermistor with linear drift (+0.08°C/hr).",
    },
    "c": {
        "file": "sensor_c_spikes.csv",
        "name": "Delhi Campus Sensor C (Spikes)",
        "description": "Low-cost sensor with scale bias and random spikes.",
    },
}


def _build_alerts(df: pd.DataFrame, summary) -> list[dict]:
    alerts = []
    for idx in summary.anomaly_indices:
        if idx >= len(df):
            continue
        row = df.iloc[idx]
        alerts.append(
            {
                "timestamp": row["timestamp"].isoformat()
                if hasattr(row["timestamp"], "isoformat")
                else str(row["timestamp"]),
                "reasons": summary.anomaly_reasons.get(idx, []),
            }
        )
    return alerts


def _serialize_timeseries(df: pd.DataFrame) -> list[dict]:
    records = []
    for _, row in df.iterrows():
        ts = row["timestamp"]
        records.append(
            {
                "timestamp": ts.isoformat() if hasattr(ts, "isoformat") else str(ts),
                "temp_c": _safe_float(row.get("temp_c")),
                "humidity_pct": _safe_float(row.get("humidity_pct")),
                "reference_temp_c": _safe_float(row.get("reference_temp_c")),
                "corrected_temp_c": _safe_float(row.get("corrected_temp_c")),
                "anomaly": bool(row.get("anomaly", False)),
            }
        )
    return records


def _safe_float(value) -> float | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    try:
        return round(float(value), 2)
    except (TypeError, ValueError):
        return None


async def run_analysis(
    sensor_df: pd.DataFrame,
    sensor_name: str,
    latitude: float = DEFAULT_LATITUDE,
    longitude: float = DEFAULT_LONGITUDE,
    use_open_meteo: bool = True,
) -> dict[str, Any]:
    sensor_df = sensor_df.copy()
    sensor_df["timestamp"] = pd.to_datetime(sensor_df["timestamp"])

    if "reference_temp_c" in sensor_df.columns and not use_open_meteo:
        merged = sensor_df
    else:
        start, end = date_range_from_timestamps(sensor_df["timestamp"])
        reference_df = await fetch_reference(start, end, latitude, longitude)
        merged = merge_sensor_with_reference(sensor_df, reference_df)

    detected_df, summary = detect_anomalies(merged)
    calibrated_df, calibration_meta = calibrate_sensor(detected_df)
    trust = compute_trust_score(calibrated_df, summary, calibration_meta)
    explanation = await generate_explanation(sensor_name, summary, trust, calibration_meta)

    return {
        "sensor_name": sensor_name,
        "location": {"latitude": latitude, "longitude": longitude},
        "trust": trust,
        "calibration": calibration_meta,
        "explanation": explanation,
        "timeseries": _serialize_timeseries(calibrated_df),
        "alerts": _build_alerts(calibrated_df, summary),
    }


def load_demo_sensor(sensor_id: str) -> tuple[pd.DataFrame, str]:
    if sensor_id not in DEMO_SENSORS:
        raise ValueError(f"Unknown demo sensor '{sensor_id}'. Choose from: {list(DEMO_SENSORS)}")

    meta = DEMO_SENSORS[sensor_id]
    path = SAMPLES_DIR / meta["file"]
    if not path.exists():
        raise FileNotFoundError(
            f"Demo file not found: {path}. Run: python data/generate_sensors.py"
        )

    df = pd.read_csv(path)
    return df, meta["name"]


def parse_uploaded_csv(content: bytes) -> pd.DataFrame:
    text = content.decode("utf-8-sig")
    df = pd.read_csv(StringIO(text))
    required = {"timestamp", "temp_c"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"CSV missing required columns: {sorted(missing)}")
    return df


def list_demo_sensors() -> list[dict[str, str]]:
    return [
        {"id": key, "name": val["name"], "description": val["description"]}
        for key, val in DEMO_SENSORS.items()
    ]
