"""
Generate synthetic environmental sensor datasets for ClimateTrust AI demos.

Produces three CSV files with embedded reference columns so demos work offline.
Reference values simulate Open-Meteo satellite-grade anchors for Delhi.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

SAMPLES_DIR = Path(__file__).resolve().parent / "samples"
HOURS = 168  # 7 days hourly
RNG = np.random.default_rng(42)


def _base_reference_timestamps() -> pd.DatetimeIndex:
    return pd.date_range("2026-06-01", periods=HOURS, freq="h")


def _simulate_reference(timestamps: pd.DatetimeIndex) -> pd.DataFrame:
    """Realistic Delhi June temperature/humidity diurnal cycle."""
    hour_of_day = timestamps.hour + timestamps.minute / 60
    base_temp = 30.0 + 6.0 * np.sin((hour_of_day - 14) * np.pi / 12)
    noise = RNG.normal(0, 0.4, size=len(timestamps))
    reference_temp = base_temp + noise

    humidity = 55.0 - 12.0 * np.sin((hour_of_day - 14) * np.pi / 12) + RNG.normal(0, 2, len(timestamps))
    humidity = np.clip(humidity, 25, 90)

    return pd.DataFrame(
        {
            "timestamp": timestamps,
            "reference_temp_c": np.round(reference_temp, 2),
            "reference_humidity_pct": np.round(humidity, 1),
        }
    )


def _round_numeric(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    for col in out.select_dtypes(include="number").columns:
        out[col] = out[col].round(2)
    return out


def _sensor_clean(reference: pd.DataFrame) -> pd.DataFrame:
    df = reference.copy()
    df["temp_c"] = df["reference_temp_c"] + RNG.normal(0, 0.3, len(df))
    df["humidity_pct"] = df["reference_humidity_pct"] + RNG.normal(0, 1.5, len(df))
    return _round_numeric(df)


def _sensor_drift(reference: pd.DataFrame) -> pd.DataFrame:
    df = reference.copy()
    drift = np.arange(len(df)) * 0.08  # +0.08°C per hour
    df["temp_c"] = df["reference_temp_c"] + drift + RNG.normal(0, 0.4, len(df))
    df["humidity_pct"] = df["reference_humidity_pct"] + RNG.normal(0, 2, len(df)) + 3
    return _round_numeric(df)


def _sensor_spikes(reference: pd.DataFrame) -> pd.DataFrame:
    df = reference.copy()
    scale_bias = 1.15
    df["temp_c"] = df["reference_temp_c"] * scale_bias + 1.2 + RNG.normal(0, 0.5, len(df))
    df["humidity_pct"] = df["reference_humidity_pct"] * 1.05 + RNG.normal(0, 2.5, len(df))

    spike_indices = RNG.choice(len(df), size=int(len(df) * 0.08), replace=False)
    df.loc[spike_indices, "temp_c"] += RNG.choice([-8, 10, 12], size=len(spike_indices))
    return _round_numeric(df)


def main() -> None:
    SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
    timestamps = _base_reference_timestamps()
    reference = _simulate_reference(timestamps)

    datasets = {
        "sensor_a_clean.csv": _sensor_clean(reference),
        "sensor_b_drift.csv": _sensor_drift(reference),
        "sensor_c_spikes.csv": _sensor_spikes(reference),
    }

    for filename, df in datasets.items():
        path = SAMPLES_DIR / filename
        df.to_csv(path, index=False)
        print(f"Wrote {path} ({len(df)} rows)")

    print("\nDemo sensors ready. Start ML service and hit GET /demo/a|b|c")


if __name__ == "__main__":
    main()
