"""Explainability agent — Gemini LLM with template fallback."""

from __future__ import annotations

import os
from typing import Any

import httpx

from detector import DetectionSummary


def _template_explanation(
    sensor_name: str,
    summary: DetectionSummary,
    trust: dict[str, Any],
    calibration_meta: dict,
) -> str:
    parts = [
        f"{sensor_name} received a trust score of {trust['trust_score']}/100 (Grade {trust['grade']})."
    ]

    if summary.drift_detected:
        parts.append(
            f"A systematic drift of {summary.drift_magnitude_c:+.1f}°C was detected — "
            "consistent with an uncalibrated or aging thermistor, as described in the MSV-2035 Instrument Crisis."
        )

    if summary.spike_count > 0:
        parts.append(
            f"{summary.spike_count} temperature spike(s) were flagged via rolling z-score analysis."
        )

    if summary.isolation_anomaly_count > 0:
        parts.append(
            f"The Isolation Forest model flagged {summary.isolation_anomaly_count} multivariate "
            "anomal(ies) where temperature and humidity patterns diverged from expected behavior."
        )

    if calibration_meta.get("applied"):
        parts.append(
            f"Linear calibration was applied (scale={calibration_meta['scale']}, "
            f"bias={calibration_meta['bias_c']}°C). Mean error improved from "
            f"{calibration_meta['mean_error_before']}°C to {calibration_meta['mean_error_after']}°C. "
            f"Reference correlation rose from {trust['correlation_before']} to {trust['correlation_after']}."
        )
    else:
        parts.append("Calibration could not be fully applied — insufficient overlapping reference data.")

    parts.append(
        "Recommendation: Re-calibrate this sensor against a research-grade reference "
        "before publishing data to national repositories."
    )
    return " ".join(parts)


async def generate_explanation(
    sensor_name: str,
    summary: DetectionSummary,
    trust: dict[str, Any],
    calibration_meta: dict,
) -> dict[str, str]:
    fallback = _template_explanation(sensor_name, summary, trust, calibration_meta)
    api_key = os.getenv("LLM_API_KEY") or os.getenv("GOOGLE_API_KEY")

    if not api_key:
        return {"text": fallback, "source": "template"}

    prompt = f"""You are ClimateTrust AI, an environmental data integrity agent.
Explain the following sensor analysis in 3-4 clear sentences for a hackathon judge.
Be specific, cite numbers, and briefly mention the MSV-2035 instrument crisis context.

Sensor: {sensor_name}
Trust Score: {trust['trust_score']}/100 (Grade {trust['grade']})
Drift: {summary.drift_magnitude_c}°C
Anomalies: {trust['anomalies_flagged']} of {trust['readings_total']} readings
Spikes: {summary.spike_count}
Isolation Forest flags: {summary.isolation_anomaly_count}
Calibration: {calibration_meta}
Correlation before/after: {trust['correlation_before']} / {trust['correlation_after']}
"""

    try:
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-2.0-flash:generateContent?key={api_key}"
        )
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                url,
                json={"contents": [{"parts": [{"text": prompt}]}]},
            )
            response.raise_for_status()
            data = response.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            return {"text": text.strip(), "source": "llm"}
    except Exception:
        return {"text": fallback, "source": "template"}
