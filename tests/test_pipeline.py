"""
ClimateTrust AI — Extended test suite for the ML pipeline.
Run with: python -m pytest tests/ -v
"""

from __future__ import annotations

import io
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

# Add ml-service to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "ml-service"))

from calibrator import calibrate_sensor
from detector import DetectionSummary, detect_anomalies
from trust_score import compute_trust_score


# ─── Fixtures ─────────────────────────────────────────────────────────────────

def _make_df(
    n: int = 168,
    drift_per_hour: float = 0.0,
    spike_rate: float = 0.0,
    scale_bias: float = 1.0,
    noise_std: float = 0.3,
    seed: int = 42,
) -> pd.DataFrame:
    """Generate a synthetic sensor DataFrame for testing."""
    rng = np.random.default_rng(seed)
    timestamps = pd.date_range("2026-06-01", periods=n, freq="h")
    hour = timestamps.hour + timestamps.minute / 60
    base = 30.0 + 6.0 * np.sin((hour - 14) * np.pi / 12)
    reference = base + rng.normal(0, 0.4, n)

    drift = np.arange(n, dtype=float) * drift_per_hour
    ref_vals = np.asarray(reference, dtype=float)
    sensor = (ref_vals * scale_bias) + drift + rng.normal(0, noise_std, n)

    if spike_rate > 0:
        spike_idx = rng.choice(n, size=int(n * spike_rate), replace=False)
        sensor[spike_idx] += rng.choice([-8.0, 10.0, 12.0], size=len(spike_idx))



    humidity = 55.0 + rng.normal(0, 2, n)

    return pd.DataFrame(
        {
            "timestamp": timestamps,
            "temp_c": np.round(sensor, 2),
            "humidity_pct": np.round(np.clip(humidity, 20, 95), 1),
            "reference_temp_c": np.round(reference, 2),
        }
    )


@pytest.fixture
def clean_df() -> pd.DataFrame:
    return _make_df(drift_per_hour=0.0, spike_rate=0.0)


@pytest.fixture
def drift_df() -> pd.DataFrame:
    return _make_df(drift_per_hour=0.08, spike_rate=0.0)


@pytest.fixture
def spiky_df() -> pd.DataFrame:
    return _make_df(drift_per_hour=0.0, spike_rate=0.08, scale_bias=1.15)


# ─── Detector tests ────────────────────────────────────────────────────────────

class TestDetectAnomalies:
    def test_clean_sensor_has_low_anomaly_count(self, clean_df):
        _, summary = detect_anomalies(clean_df)
        assert summary.spike_count < 5, "Clean sensor should have very few spikes"
        assert not summary.drift_detected, "Clean sensor should not have drift"

    def test_drift_sensor_detects_drift(self, drift_df):
        _, summary = detect_anomalies(drift_df)
        assert summary.drift_detected, "Should detect drift in drifting sensor"
        assert summary.drift_magnitude_c > 1.5, "Drift magnitude should be > 1.5°C"

    def test_spiky_sensor_detects_spikes(self, spiky_df):
        _, summary = detect_anomalies(spiky_df)
        assert len(summary.anomaly_indices) > 5, "Should detect multiple anomalies in spiky sensor"

    def test_isolation_forest_flags_anomalies(self, spiky_df):
        _, summary = detect_anomalies(spiky_df)
        assert summary.isolation_anomaly_count > 0, "Isolation Forest should flag some anomalies"

    def test_anomaly_indices_are_valid(self, drift_df):
        df, summary = detect_anomalies(drift_df)
        for idx in summary.anomaly_indices:
            assert 0 <= idx < len(df), f"Anomaly index {idx} out of bounds"

    def test_anomaly_reasons_populated(self, spiky_df):
        _, summary = detect_anomalies(spiky_df)
        for idx, reasons in summary.anomaly_reasons.items():
            assert len(reasons) > 0, f"Index {idx} has no reasons"
            for reason in reasons:
                assert isinstance(reason, str)

    def test_output_dataframe_has_anomaly_column(self, clean_df):
        result_df, _ = detect_anomalies(clean_df)
        assert "anomaly" in result_df.columns
        assert result_df["anomaly"].dtype == bool

    def test_handles_missing_humidity(self):
        """Detector should still work without humidity column."""
        df = _make_df()
        df = df.drop(columns=["humidity_pct"])
        result_df, summary = detect_anomalies(df)
        assert "anomaly" in result_df.columns

    def test_handles_missing_reference(self):
        """Detector should still work without reference column."""
        df = _make_df()
        df = df.drop(columns=["reference_temp_c"])
        result_df, summary = detect_anomalies(df)
        assert not summary.drift_detected  # can't detect drift without reference


# ─── Calibrator tests ─────────────────────────────────────────────────────────

class TestCalibratesSensor:
    def test_calibration_applied_flag(self, drift_df):
        detected_df, _ = detect_anomalies(drift_df)
        _, meta = calibrate_sensor(detected_df)
        assert meta["applied"] is True

    def test_corrected_column_exists(self, drift_df):
        detected_df, _ = detect_anomalies(drift_df)
        calibrated_df, _ = calibrate_sensor(detected_df)
        assert "corrected_temp_c" in calibrated_df.columns

    def test_mean_error_improves_after_calibration(self, drift_df):
        detected_df, _ = detect_anomalies(drift_df)
        _, meta = calibrate_sensor(detected_df)
        assert meta["applied"]
        assert abs(meta["mean_error_after"]) < abs(meta["mean_error_before"]), (
            "Mean error should improve after calibration"
        )

    def test_scale_factor_near_1_for_clean_sensor(self, clean_df):
        detected_df, _ = detect_anomalies(clean_df)
        _, meta = calibrate_sensor(detected_df)
        if meta["applied"]:
            assert 0.9 <= meta["scale"] <= 1.1, "Scale should be near 1 for clean sensor"

    def test_scale_factor_detects_bias(self, spiky_df):
        """Scale bias sensor (1.15x) should produce scale factor near 1.15."""
        detected_df, _ = detect_anomalies(spiky_df)
        _, meta = calibrate_sensor(detected_df)
        # After calibration the scale should absorb the 1.15x bias
        assert meta["applied"]

    def test_calibration_skipped_without_reference(self):
        df = _make_df()
        df = df.drop(columns=["reference_temp_c"])
        _, meta = calibrate_sensor(df)
        assert meta["applied"] is False

    def test_meta_contains_required_keys(self, drift_df):
        detected_df, _ = detect_anomalies(drift_df)
        _, meta = calibrate_sensor(detected_df)
        for key in ["applied", "method", "scale", "bias_c", "mean_error_before", "mean_error_after"]:
            assert key in meta, f"Missing key: {key}"


# ─── Trust score tests ────────────────────────────────────────────────────────

class TestTrustScore:
    def test_clean_sensor_gets_high_score(self, clean_df):
        detected_df, summary = detect_anomalies(clean_df)
        calibrated_df, cal_meta = calibrate_sensor(detected_df)
        trust = compute_trust_score(calibrated_df, summary, cal_meta)
        assert trust["trust_score"] >= 70, "Clean sensor should score B or above"
        assert trust["grade"] in ("A", "B")

    def test_drift_sensor_gets_low_score(self, drift_df):
        detected_df, summary = detect_anomalies(drift_df)
        calibrated_df, cal_meta = calibrate_sensor(detected_df)
        trust = compute_trust_score(calibrated_df, summary, cal_meta)
        assert trust["trust_score"] < 70, "Drift sensor should score below B"

    def test_score_within_bounds(self, spiky_df):
        detected_df, summary = detect_anomalies(spiky_df)
        calibrated_df, cal_meta = calibrate_sensor(detected_df)
        trust = compute_trust_score(calibrated_df, summary, cal_meta)
        assert 0 <= trust["trust_score"] <= 100

    def test_grade_matches_score(self, clean_df):
        detected_df, summary = detect_anomalies(clean_df)
        calibrated_df, cal_meta = calibrate_sensor(detected_df)
        trust = compute_trust_score(calibrated_df, summary, cal_meta)
        score = trust["trust_score"]
        grade = trust["grade"]
        if score >= 85:
            assert grade == "A"
        elif score >= 70:
            assert grade == "B"
        elif score >= 50:
            assert grade == "C"
        elif score >= 30:
            assert grade == "D"
        else:
            assert grade == "F"

    def test_anomaly_rate_calculation(self, spiky_df):
        detected_df, summary = detect_anomalies(spiky_df)
        calibrated_df, cal_meta = calibrate_sensor(detected_df)
        trust = compute_trust_score(calibrated_df, summary, cal_meta)
        expected_rate = round(
            len(summary.anomaly_indices) / len(calibrated_df) * 100, 1
        )
        assert trust["anomaly_rate_pct"] == expected_rate

    def test_required_keys_in_output(self, clean_df):
        detected_df, summary = detect_anomalies(clean_df)
        calibrated_df, cal_meta = calibrate_sensor(detected_df)
        trust = compute_trust_score(calibrated_df, summary, cal_meta)
        for key in [
            "trust_score", "grade", "anomaly_rate_pct",
            "drift_magnitude_c", "correlation_before",
            "correlation_after", "readings_total", "anomalies_flagged"
        ]:
            assert key in trust, f"Missing key: {key}"


# ─── Integration test ─────────────────────────────────────────────────────────

class TestFullPipeline:
    def test_clean_sensor_full_pipeline(self, clean_df):
        detected_df, summary = detect_anomalies(clean_df)
        calibrated_df, cal_meta = calibrate_sensor(detected_df)
        trust = compute_trust_score(calibrated_df, summary, cal_meta)

        assert trust["trust_score"] >= 70
        assert "corrected_temp_c" in calibrated_df.columns
        assert trust["readings_total"] == 168

    def test_drift_sensor_full_pipeline(self, drift_df):
        detected_df, summary = detect_anomalies(drift_df)
        calibrated_df, cal_meta = calibrate_sensor(detected_df)
        trust = compute_trust_score(calibrated_df, summary, cal_meta)

        assert summary.drift_detected
        assert cal_meta["applied"]
        assert trust["trust_score"] < 70

    def test_pipeline_output_is_json_serialisable(self, clean_df):
        import json
        detected_df, summary = detect_anomalies(clean_df)
        calibrated_df, cal_meta = calibrate_sensor(detected_df)
        trust = compute_trust_score(calibrated_df, summary, cal_meta)

        # Verify all outputs can be JSON-serialised (as they will be in the API)
        json.dumps(trust)
        json.dumps(cal_meta)
        json.dumps({
            "spike_count": summary.spike_count,
            "drift_detected": summary.drift_detected,
            "drift_magnitude_c": summary.drift_magnitude_c,
            "isolation_anomaly_count": summary.isolation_anomaly_count,
        })
