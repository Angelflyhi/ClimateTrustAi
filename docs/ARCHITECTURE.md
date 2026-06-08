# ClimateTrust AI — System Architecture

## Overview

ClimateTrust AI is built as a two-service monorepo:

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                        │
│  Next.js 16 Dashboard (port 3000)                               │
│   · Hero + Demo Selector                                        │
│   · CSV Upload                                                  │
│   · Trust Score Gauge                                           │
│   · Recharts Timeseries                                         │
│   · Anomaly Alerts List                                         │
│   · Diagnostic Panel                                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP (fetch / FormData)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  FastAPI ML Service (port 8000)                                  │
│                                                                 │
│  ┌──────────┐   ┌──────────┐   ┌────────────┐   ┌──────────┐  │
│  │ Ingest   │──▶│ Detector │──▶│ Calibrator │──▶│  Trust   │  │
│  │ Pipeline │   │          │   │            │   │  Score   │  │
│  └──────────┘   └──────────┘   └────────────┘   └──────────┘  │
│       │                                               │         │
│       │                                               ▼         │
│       │                                         ┌──────────┐   │
│       │                                         │Diagnostic│   │
│       │                                         │  Module  │   │
│       │                                         └──────────┘   │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Open-Meteo Archive API (external, no auth)              │  │
│  │  Hourly temp / humidity / precipitation for any location │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Ingestion

**CSV Upload path:**
```
POST /analyze
  → parse_uploaded_csv(bytes) → DataFrame[timestamp, temp_c, humidity_pct?]
  → run_analysis(df, sensor_name, lat, lon, use_open_meteo=True)
```

**Demo sensor path:**
```
GET /demo/{id}
  → load_demo_sensor(id) → DataFrame (includes reference_temp_c column)
  → run_analysis(df, ..., use_open_meteo=False)   # uses embedded reference
```

Both paths converge at `run_analysis()` in `pipeline.py`.

---

### 2. Reference Cross-Validation

When `use_open_meteo=True`:

```python
start, end = date_range_from_timestamps(sensor_df["timestamp"])
reference_df = await fetch_reference(start, end, latitude, longitude)
# Open-Meteo Archive API — hourly temp_2m, relative_humidity_2m
merged = merge_sensor_with_reference(sensor_df, reference_df)
# pd.merge_asof with tolerance=1h (nearest-hour alignment)
```

When the sensor CSV already contains `reference_temp_c` (demo sensors):
```python
merged = sensor_df  # skip external fetch for offline reliability
```

---

### 2a. Edge Case Handling: Sparse or Unavailable Reference Data

In remote or off-grid areas, high-resolution Open-Meteo satellite/reanalysis data might be sparse or temporally misaligned. The system handles this gracefully:

1.  **Tolerance Window Limit**: `pd.merge_asof` restricts matching to a strict `tolerance="1h"`. If the reference data gap exceeds this, the row receives `NaN` for reference temperature.
2.  **Graceful Degradation**: 
    - The **Rolling Z-Score** (Spikes) continues to function normally (univariate).
    - The **Drift Detection** and **Isolation Forest** require reference data. They simply skip evaluation for rows with missing reference values, avoiding false positives.
3.  **Trust Score Penalty Bound**: If `<50%` of rows have reference data, the calibration engine aborts (`applied: false`). The trust score is conservatively lower-bounded and flagged with an explanation that reference overlap was insufficient, ensuring users don't mistake an "unverifiable" sensor for a "broken" one.

---

### 3. Anomaly Detection (`detector.py`)

Three detection methods run sequentially and their flags accumulate:

#### 3a. Rolling Z-Score (Spikes)
```
window = 24 readings
z = (value - rolling_mean) / rolling_std
flag if |z| > 3.0  →  weight 1.5
```

#### 3b. Drift Detection
```
deviation = sensor_temp - reference_temp
rolling_dev = deviation.rolling(48).mean()
drift_magnitude = rolling_dev.iloc[-1]
flag row if |deviation| > 2.5C  →  weight 1.0
drift_detected = True if |drift_magnitude| > 1.5C
```

#### 3c. Isolation Forest (Multivariate)
```python
features = [temp_c, humidity_pct, reference_temp_c]  # available columns
model = IsolationForest(contamination=0.05, n_estimators=100, random_state=42)
preds = model.fit_predict(features)
flag if pred == -1  →  weight 0.8
```

**Output:** `DetectionSummary` dataclass with spike count, drift flag, drift magnitude,
isolation anomaly count, anomaly indices, and per-index reason lists.

---

### 4. Calibration (`calibrator.py`)

Two-stage correction:

**Stage 1 — Drift Detrend:**
```python
drift_slope, drift_intercept = np.polyfit(time_idx, deviation, deg=1)
detrended = sensor - (slope * time + intercept)
```

**Stage 2 — Affine Correction:**
```python
# Least-squares fit: detrended ≈ scale × reference + bias
[scale, bias] = lstsq([[ref_i, 1] for ref_i in reference], detrended)
corrected = (detrended - bias) / scale
```

Produces `corrected_temp_c` column and `calibration_meta` dict with scale, bias,
drift slope, mean error before/after.

---

### 5. Trust Score (`trust_score.py`)

```
score = 100.0
score -= min(40.0, anomaly_rate * 200)           # anomaly penalty
score -= min(25.0, |drift_magnitude_c| * 5)      # drift penalty
score -= max(0.0, (0.85 - corr_before) * 30)    # correlation penalty
if calibrated:
    score += min(15.0, (corr_after - corr_before) * 30)  # calibration bonus
score = clamp(score, 0, 100)
```

Grades: `A >= 85  ·  B >= 70  ·  C >= 50  ·  D >= 30  ·  F < 30`

---

### 6. Diagnostic Engine (`agent.py`)

Builds a structured prompt from all pipeline outputs and calls the LLM API:

```
Model: LLM provider
Prompt includes: sensor name, trust score, drift magnitude,
                 anomaly counts, calibration results, correlation
```

Falls back to a deterministic template string if:
- LLM API key is not set
- The API call fails (any exception)

The `source` field in the response (`"llm"` vs `"template"`) is surfaced in the UI.

---

## Frontend Architecture

### Next.js App Router structure

```
web/app/
├── layout.tsx          # Root layout — metadata, fonts
├── globals.css         # Design system (CSS variables, utility classes)
├── page.tsx            # Main dashboard (single-page app feel)
├── about/
│   └── page.tsx        # Methodology, ethics, judging criteria
└── components/
    ├── TrustGauge.tsx  # SVG circular gauge
    ├── MetricCard.tsx  # Individual metric display
    ├── AlertsList.tsx  # Anomaly event list
    └── ChartPanel.tsx  # Recharts timeseries wrapper
```

### API Client (`lib/api.ts`)

All ML service calls go through a typed API client that handles:
- Base URL from `NEXT_PUBLIC_ML_URL` env var
- Error parsing from FastAPI's `detail` field
- Typed request/response interfaces

---

## Docker Setup

```yaml
# docker-compose.yml
services:
  ml-service:
    build: { context: ., dockerfile: Dockerfile.ml }
    ports: ["8000:8000"]
    environment:
      - LLM_API_KEY=${LLM_API_KEY}
    volumes:
      - ./data:/app/data

  web:
    image: node:20-alpine
    working_dir: /app
    volumes: [./web:/app]
    ports: ["3000:3000"]
    environment:
      - NEXT_PUBLIC_ML_URL=http://ml-service:8000
    command: sh -c "npm install && npm run dev"
    depends_on: [ml-service]
```

---

## Deployment

### Vercel (Frontend)
1. Connect GitHub repo to Vercel
2. Set root directory to `web/`
3. Set env var: `NEXT_PUBLIC_ML_URL=<railway-or-render-url>`

### Railway / Render (ML Service)
1. Set root directory to `ml-service/`
2. Start command: `uvicorn main:app --host 0.0.0.0 --port 8000`
3. Set env var: `LLM_API_KEY=<your-key>` (optional)

---

## Performance Characteristics

| Operation | Typical Duration | Notes |
|-----------|-----------------|-------|
| Demo sensor analysis | < 200ms | No external API call |
| CSV upload + Open-Meteo | 1–4s | Network-dependent |
| Isolation Forest (168 rows) | ~50ms | sklearn, in-process |
| LLM explanation | 1–3s | External call |
| Template explanation | < 1ms | Fallback |

---

## Scalability & Roadmap (National Sensor Registry)

The current architecture is an MVP tailored for batch CSV ingestion. Moving toward a "National Sensor Registry" requires a transition from synchronous batch processing to real-time streaming ingestion. 

### Future Streaming Architecture:
1.  **Ingestion Layer**: IoT webhooks and MQTT brokers (e.g., AWS IoT Core or Eclipse Mosquitto) will receive live sensor telemetry.
2.  **Streaming Pipeline**: Real-time event streaming via **Apache Kafka** or **Redpanda** will handle high-throughput data streams.
3.  **Time-Series Database**: Instead of in-memory Pandas dataframes, sensor telemetry will be persisted in a specialised TSDB like **TimescaleDB** or **ClickHouse**. This enables efficient windowing queries and downsampling for millions of sensors.
4.  **Continuous Calibration**: The anomaly detection and calibration models will transition from static batch fits to online learning algorithms (e.g., River ML), continuously updating their drift estimates.
5.  **Reference Anchor Network**: Instead of purely relying on Open-Meteo, IMD (Indian Meteorological Department) research-grade stations will act as "Level 1 Anchors", continuously providing localized ground truth to dynamically calibrate thousands of surrounding "Level 2" (commercial) and "Level 3" (citizen/low-cost) sensors.
