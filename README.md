# ClimateTrust AI

> **Restoring credibility to environmental sensor data, one reading at a time.**

[![Built for STEMINATE HACKS 2026](https://img.shields.io/badge/STEMINATE%20HACKS-2026-06b6d4?style=flat-square)](https://steminate.in)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

---

## The Problem

India's **MSV-2035 Instrument Crisis** revealed that widespread use of uncalibrated, imported scientific instruments has compromised the integrity of climate data entering national research journals — triggering global concerns about the credibility of Indian environmental science.

There is **no accessible validation layer** that checks whether sensor data is trustworthy before it gets published, cited, or used in policy decisions.

---

## What ClimateTrust AI Does

ClimateTrust AI is an **agentic validation platform** for environmental sensor data. It:

1. **Ingests** time-series sensor readings via CSV upload or pre-loaded demo sensors
2. **Cross-validates** against satellite-grade reference data from [Open-Meteo](https://open-meteo.com) (no API key needed)
3. **Detects anomalies** using a hybrid AI pipeline:
   - Rolling Z-Score for sudden temperature spikes
   - Cumulative deviation analysis for systematic drift
   - Isolation Forest (scikit-learn) for multivariate pattern anomalies
4. **Calibrates** the sensor with a drift-detrend + affine correction
5. **Scores** each sensor batch with a **Trust Score (0–100)** and letter grade
6. **Explains** every finding in plain English using the Gemini AI agent

---

## Live Demo

```
Frontend:  http://localhost:3000
ML API:    http://localhost:8000/docs
```

Pre-loaded demo sensors:
| Sensor | Fault | Expected Grade |
|--------|-------|----------------|
| Sensor A (Control) | None — clean reference | A (~90) |
| Sensor B (Drift) | Linear drift +0.08°C/hr | D (~45) |
| Sensor C (Spikes) | 8% random spikes + 1.15× scale bias | C (~55) |

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- pip

### 1. Generate Demo Data

```bash
python data/generate_sensors.py
```

### 2. Start the ML Service

```bash
cd ml-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Start the Web Dashboard

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Or use Docker Compose

```bash
docker-compose up --build
```

---

## Project Structure

```
STEMINATE HACKS 2026/
├── README.md
├── .wakatime-project          # WakaTime project tracking
├── docker-compose.yml
├── Dockerfile.ml
│
├── web/                       # Next.js 16 dashboard
│   ├── app/
│   │   ├── page.tsx           # Main dashboard
│   │   ├── about/page.tsx     # About & methodology
│   │   ├── components/        # Reusable UI components
│   │   └── lib/api.ts         # ML service API client
│   └── package.json
│
├── ml-service/                # FastAPI + ML pipeline
│   ├── main.py                # API endpoints
│   ├── pipeline.py            # Orchestrator
│   ├── detector.py            # Anomaly detection
│   ├── calibrator.py          # Drift correction
│   ├── trust_score.py         # 0–100 scoring
│   ├── reference.py           # Open-Meteo integration
│   ├── agent.py               # Gemini AI explainability
│   └── requirements.txt
│
├── data/
│   ├── generate_sensors.py    # Synthetic dataset generator
│   └── samples/               # Pre-built demo CSVs
│
└── docs/
    ├── ARCHITECTURE.md        # System design
    └── ETHICS.md              # AI ethics & limitations
```

---

## API Reference

### `GET /health`
Returns service status.

### `GET /demos`
Lists available demo sensors.

### `GET /demo/{sensor_id}`
Analyzes a pre-loaded demo sensor (`a`, `b`, or `c`).

### `POST /analyze`
Uploads and analyzes a custom CSV file.

**Required CSV columns:** `timestamp`, `temp_c`
**Optional:** `humidity_pct`

### `POST /analyze/json`
Same as above but accepts JSON body with `csv_text` field.

### Response Shape

```json
{
  "sensor_name": "Delhi Campus Sensor B",
  "location": { "latitude": 28.6139, "longitude": 77.2090 },
  "trust": {
    "trust_score": 42.3,
    "grade": "D",
    "anomaly_rate_pct": 12.5,
    "drift_magnitude_c": 3.8,
    "correlation_before": 0.61,
    "correlation_after": 0.94,
    "readings_total": 168,
    "anomalies_flagged": 21
  },
  "calibration": {
    "applied": true,
    "scale": 1.12,
    "bias_c": 2.1,
    "drift_slope_per_hour": 0.08,
    "mean_error_before": 3.4,
    "mean_error_after": 0.2
  },
  "explanation": {
    "text": "Sensor B drifted +3.8°C over 168 hours — consistent with an uncalibrated thermistor...",
    "source": "gemini"
  },
  "timeseries": [...],
  "alerts": [...]
}
```

---

## Trust Score Formula

```
score = 100
score -= min(40, anomaly_rate × 200)
score -= min(25, |drift_magnitude_c| × 5)
score -= max(0, (0.85 - correlation_before) × 30)
if calibrated:
    score += min(15, max(0, (correlation_after - correlation_before) × 30))
score = clamp(score, 0, 100)

Grades: A ≥ 85 · B ≥ 70 · C ≥ 50 · D ≥ 30 · F < 30
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_ML_URL` | No | ML service URL (default: `http://localhost:8000`) |
| `GEMINI_API_KEY` | No | Enables AI explanations (template fallback if absent) |
| `GOOGLE_API_KEY` | No | Alternative to `GEMINI_API_KEY` |

Create `web/.env.local`:
```
NEXT_PUBLIC_ML_URL=http://localhost:8000
```

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | Next.js 16 + Tailwind CSS v4 | Fast, deployable to Vercel |
| Charts | Recharts | Interactive time-series with custom tooltips |
| ML API | FastAPI + uvicorn | Async Python with auto-generated OpenAPI docs |
| Anomaly Detection | scikit-learn (Isolation Forest) + pandas | No GPU needed, interpretable |
| Reference Data | Open-Meteo Archive API | Free, global, satellite-grade, no API key |
| AI Explanations | Google Gemini 2.0 Flash | Free tier, context-aware narrative |
| Containerization | Docker + Docker Compose | Reproducible demo environment |

---

## Ethical AI Commitments

See [`docs/ETHICS.md`](docs/ETHICS.md) for full details. In brief:

- **No black-box rejection** — every anomaly flag includes a human-readable reason
- **Transparent scoring** — the trust formula is fully documented and auditable
- **Correction, not suppression** — we calibrate and improve data, not hide it
- **Limitation disclosure** — the system acknowledges when reference data is unavailable

---

## Impact

- **Universities** without calibration labs can validate student sensor projects
- **NGOs** deploying low-cost air quality monitors get actionable quality reports
- **Citizen scientists** contributing to environmental monitoring gaps gain credibility
- **Policy makers** receive data with attached integrity certificates

**Roadmap:** Real-time IoT webhooks → IMD station integration → National sensor registry

---

## Pitch Video Script

| Time | Content |
|------|---------|
| 0:00–0:15 | "India's MSV-2035 report warns uncalibrated instruments are polluting national climate data." |
| 0:15–1:45 | Live demo: click Sensor B → trust score 42 → AI explains drift → corrected chart overlay |
| 1:45–2:15 | Impact: universities, citizen scientists, policy credibility |
| 2:15–2:30 | Roadmap: IoT webhooks, IMD partnership, national sensor registry |

---

## License

MIT © 2026 — Built for [STEMINATE HACKS 2026](https://steminate.in)
