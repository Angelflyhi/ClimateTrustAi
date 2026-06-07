# ClimateTrust AI — Build Guide

> **To auto-scaffold:** Switch Cursor Composer to **Agent** mode and say `build ClimateTrust AI from BUILD_GUIDE.md`.

## Quick Start (after scaffold)

```powershell
cd "c:\Users\PP\STEMINATE HACKS 2026"
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r ml-service\requirements.txt
python data\generate_sensors.py
cd ml-service; uvicorn main:app --reload --port 8000
# New terminal:
cd web; npm install; npm run dev
```

Open http://localhost:3000
