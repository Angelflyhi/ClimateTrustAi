"""Bias and drift correction against reference data."""

from __future__ import annotations

import numpy as np
import pandas as pd


def calibrate_sensor(
    df: pd.DataFrame,
    temp_col: str = "temp_c",
    ref_col: str = "reference_temp_c",
) -> tuple[pd.DataFrame, dict]:
    work = df.copy()
    meta: dict = {"method": "drift_detrend_plus_affine", "applied": False}

    if temp_col not in work.columns or ref_col not in work.columns:
        work["corrected_temp_c"] = work.get(temp_col, pd.Series(dtype=float))
        return work, meta

    sensor = work[temp_col].astype(float)
    reference = work[ref_col].astype(float)
    valid = sensor.notna() & reference.notna()

    if valid.sum() < 5:
        work["corrected_temp_c"] = sensor
        return work, meta

    deviation = sensor - reference
    time_idx = np.arange(len(work), dtype=float)

    # Step 1: Remove linear drift in deviation over time
    drift_slope, drift_intercept = np.polyfit(time_idx[valid], deviation[valid], 1)
    drift_trend = np.polyval([drift_slope, drift_intercept], time_idx)
    detrended = sensor - drift_trend

    # Step 2: Affine correction on detrended signal
    x = reference[valid].values
    y = detrended[valid].values
    coefficients = np.linalg.lstsq(
        np.vstack([x, np.ones(len(x))]).T,
        y,
        rcond=None,
    )[0]
    scale, bias = float(coefficients[0]), float(coefficients[1])

    corrected = (detrended - bias) / scale if scale != 0 else detrended - bias
    work["corrected_temp_c"] = corrected.round(2)
    work["drift_slope_per_hour"] = round(drift_slope, 4)

    meta.update(
        {
            "applied": True,
            "scale": round(scale, 4),
            "bias_c": round(bias, 4),
            "drift_slope_per_hour": round(drift_slope, 4),
            "mean_error_before": round(float(deviation[valid].mean()), 3),
            "mean_error_after": round(float((corrected[valid] - reference[valid]).mean()), 3),
        }
    )
    return work, meta
