"""Fetch reference weather data from Open-Meteo (no API key required)."""

from __future__ import annotations

from typing import Any

import httpx
import pandas as pd

OPEN_METEO_ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"

# Delhi — demo city aligned with MSV-2035 India focus
DEFAULT_LATITUDE = 28.6139
DEFAULT_LONGITUDE = 77.2090


async def fetch_reference(
    start_date: str,
    end_date: str,
    latitude: float = DEFAULT_LATITUDE,
    longitude: float = DEFAULT_LONGITUDE,
) -> pd.DataFrame:
    """Pull hourly reference weather for cross-validation."""
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "start_date": start_date,
        "end_date": end_date,
        "hourly": "temperature_2m,relative_humidity_2m,precipitation",
        "timezone": "Asia/Kolkata",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(OPEN_METEO_ARCHIVE_URL, params=params)
        response.raise_for_status()
        payload: dict[str, Any] = response.json()

    hourly = payload["hourly"]
    return pd.DataFrame(
        {
            "timestamp": pd.to_datetime(hourly["time"]),
            "reference_temp_c": hourly["temperature_2m"],
            "reference_humidity_pct": hourly["relative_humidity_2m"],
            "reference_precip_mm": hourly["precipitation"],
        }
    )


def date_range_from_timestamps(timestamps: pd.Series) -> tuple[str, str]:
    ts = pd.to_datetime(timestamps)
    return ts.min().strftime("%Y-%m-%d"), ts.max().strftime("%Y-%m-%d")


def merge_sensor_with_reference(sensor_df: pd.DataFrame, reference_df: pd.DataFrame) -> pd.DataFrame:
    """Align sensor readings to reference timestamps via nearest-hour merge."""
    sensor = sensor_df.copy()
    sensor["timestamp"] = pd.to_datetime(sensor["timestamp"])
    reference = reference_df.copy()
    reference["timestamp"] = pd.to_datetime(reference["timestamp"])

    merged = pd.merge_asof(
        sensor.sort_values("timestamp"),
        reference.sort_values("timestamp"),
        on="timestamp",
        direction="nearest",
        tolerance=pd.Timedelta("1h"),
    )
    return merged.reset_index(drop=True)
