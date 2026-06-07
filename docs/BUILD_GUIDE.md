# ClimateTrust AI — Build Guide

A step-by-step guide to running, testing, and deploying ClimateTrust AI from scratch.

---

## Prerequisites

| Tool | Minimum Version | Check |
|------|----------------|-------|
| Python | 3.11+ | `python --version` |
| Node.js | 20+ | `node --version` |
| npm | 9+ | `npm --version` |
| Docker | 24+ (optional) | `docker --version` |

---

## 1. Clone / open the project

```bash
# If using git
git clone <your-repo-url> "STEMINATE HACKS 2026"
cd "STEMINATE HACKS 2026"
```

Or simply open the folder in your editor.

---

## 2. Generate demo sensor data

```bash
python data/generate_sensors.py
```

This creates three CSV files in `data/samples/`:
- `sensor_a_clean.csv` — control sensor, expected Grade A
- `sensor_b_drift.csv` — linear drift +0.08°C/hr, expected Grade D
- `sensor_c_spikes.csv` — random spikes + scale bias, expected Grade C

---

## 3. Start the ML service

### Option A — Direct (recommended for development)

```bash
cd ml-service
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

The API will be live at:
- **API base:** http://localhost:8000
- **Interactive docs:** http://localhost:8000/docs
- **Health check:** http://localhost:8000/health

### Option B — Docker

```bash
docker build -f Dockerfile.ml -t climatetrust-ml .
docker run -p 8000:8000 -v ./data:/app/data climatetrust-ml
```

### Verify it works

```bash
# Should return {"status":"ok","service":"climatetrust-ml"}
curl http://localhost:8000/health

# Should return list of 3 demo sensors
curl http://localhost:8000/demos

# Should return full analysis result for Sensor A
curl http://localhost:8000/demo/a
```

---

## 4. Start the web dashboard

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

### Environment variables (web)

Create `web/.env.local` if it doesn't exist:

```env
NEXT_PUBLIC_ML_URL=http://localhost:8000
```

---

## 5. Optional — Enable AI explanations (Gemini)

Without a key, the system falls back to deterministic template explanations.

```bash
# In ml-service, set environment variable:
$env:GEMINI_API_KEY="your-key-here"   # PowerShell
# or
export GEMINI_API_KEY="your-key-here"  # bash
```

Get a free key at https://ai.google.dev/

---

## 6. Run with Docker Compose (full stack)

```bash
# Build and start both services
docker-compose up --build

# Rebuild after code changes
docker-compose up --build --force-recreate
```

Services:
- `ml-service` → http://localhost:8000
- `web` → http://localhost:3000

---

## 7. Testing the upload feature

Any CSV with at minimum `timestamp` and `temp_c` columns works.

Example minimal CSV:
```csv
timestamp,temp_c
2026-06-01T00:00:00,28.4
2026-06-01T01:00:00,27.9
2026-06-01T02:00:00,27.3
2026-06-01T03:00:00,26.8
2026-06-01T04:00:00,26.4
```

For multivariate analysis, add `humidity_pct`:
```csv
timestamp,temp_c,humidity_pct
2026-06-01T00:00:00,28.4,62.1
2026-06-01T01:00:00,27.9,63.5
```

---

## 8. API testing with curl / httpie

```bash
# Upload a CSV
curl -X POST http://localhost:8000/analyze \
  -F "file=@data/samples/sensor_b_drift.csv" \
  -F "sensor_name=Test Sensor" \
  -F "latitude=28.6139" \
  -F "longitude=77.2090"

# Fetch Open-Meteo reference for a date range
curl "http://localhost:8000/reference?start_date=2026-06-01&end_date=2026-06-07&latitude=28.6139&longitude=77.2090"
```

---

## 9. Project structure overview

```
STEMINATE HACKS 2026/
├── .wakatime-project           # WakaTime project name
├── README.md
├── docker-compose.yml
├── Dockerfile.ml
│
├── web/                        # Next.js 16 (TypeScript)
│   ├── .wakatime-project
│   ├── .env.local              # NEXT_PUBLIC_ML_URL
│   ├── app/
│   │   ├── .wakatime-project
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Main dashboard
│   │   ├── globals.css
│   │   ├── about/
│   │   │   └── page.tsx        # Methodology & ethics
│   │   └── components/
│   │       ├── TrustGauge.tsx
│   │       ├── ChartPanel.tsx
│   │       ├── AlertsList.tsx
│   │       ├── UploadPanel.tsx
│   │       └── ResultSidebar.tsx
│   └── lib/
│       └── api.ts              # Typed ML service client
│
├── ml-service/                 # FastAPI (Python 3.11+)
│   ├── .wakatime-project
│   ├── main.py                 # Endpoints
│   ├── pipeline.py             # Orchestrator
│   ├── detector.py             # Anomaly detection
│   ├── calibrator.py           # Drift correction
│   ├── trust_score.py          # Scoring formula
│   ├── reference.py            # Open-Meteo client
│   ├── agent.py                # Gemini explainability
│   └── requirements.txt
│
├── data/
│   ├── .wakatime-project
│   ├── generate_sensors.py     # Synthetic data generator
│   └── samples/                # Pre-built demo CSVs
│       ├── sensor_a_clean.csv
│       ├── sensor_b_drift.csv
│       └── sensor_c_spikes.csv
│
└── docs/
    ├── .wakatime-project
    ├── ARCHITECTURE.md
    └── ETHICS.md
```

---

## 10. Deploying for the hackathon demo

### Vercel (frontend)

1. Push to GitHub
2. Import in Vercel → set root directory to `web/`
3. Add environment variable: `NEXT_PUBLIC_ML_URL=<backend-url>`
4. Deploy

### Railway (ML backend)

1. New project → Deploy from GitHub repo
2. Set root directory to `ml-service/`
3. Set start command: `python -m uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add env var: `GEMINI_API_KEY=<your-key>` (optional)
5. Add a volume mount for the `data/samples/` directory

### Pre-generate data before deploy

The Railway service needs the `data/samples/` CSVs present. Either:
- Commit the generated CSVs to git (they're small, ~15KB each)
- Or add a startup script: `python ../data/generate_sensors.py && uvicorn main:app ...`

---

## 11. Troubleshooting

| Problem | Likely cause | Fix |
|---------|-------------|-----|
| `Cannot connect to ML service` | ML service not running | Run step 3 |
| `Demo file not found` | CSVs not generated | Run `python data/generate_sensors.py` |
| `CSV missing required columns` | Wrong CSV format | Add `timestamp` and `temp_c` columns |
| `Open-Meteo fetch failed` | Network issue or future date | Use demo sensors (use embedded reference) |
| `Unknown` in WakaTime | Missing `.wakatime-project` | File exists in every subdirectory now |
| ML service starts but `import` error | Missing pip packages | `pip install -r requirements.txt` |
| Next.js build error on `@/lib/api` | Missing tsconfig path | Check `tsconfig.json` has `"@/*": ["./*"]` |

---

## 12. Judging demo script (2-minute run)

1. Open http://localhost:3000
2. Click **"Delhi Campus Sensor B (Drift)"** → wait 1s → results load
3. Point out: Trust Score ~42 (Grade D), drift +3.8°C, 21 anomalies
4. Click **Temperature** chart tab → show sensor vs reference gap
5. Click **Deviation** tab → show systematic drift line
6. Read the AI explanation panel
7. Click **Download JSON Report**
8. Switch to Sensor A (clean) → show Grade A, ~0 anomalies, high correlation

Total time: ~90 seconds of demo, 30 seconds of narration.
