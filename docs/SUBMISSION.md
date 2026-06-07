# STEMINATE HACKS 2026 — Submission Materials

## Project Description (500 words)

**ClimateTrust AI — Restoring Credibility to Environmental Sensor Data**

India's scientific community faces an "Instrument Crisis." The MSV-2035 report submitted to the Office of the Principal Scientific Adviser reveals that heavy reliance on imported, uncalibrated scientific instruments has compromised the integrity of climate data entering national research journals — triggering global concerns about the credibility of Indian environmental science.

ClimateTrust AI addresses this gap with an agentic validation layer for environmental sensors. The platform ingests time-series data from research instruments, citizen science networks, or low-cost DIY sensors, then cross-validates readings against satellite-grade reference data from Open-Meteo. A hybrid AI pipeline detects three failure modes common in uncalibrated equipment: sudden spikes (rolling z-score), systematic drift (cumulative deviation from reference), and multivariate anomalies (Isolation Forest). Detected issues trigger a linear calibration engine that normalizes sensor output, producing corrected data streams comparable to research-grade instruments.

Each sensor receives a transparent Trust Score (0–100) and an AI-generated explanation of flagged anomalies — ensuring builders understand *why* data was questioned, not just *that* it was. This directly aligns with ethical AI principles: no black-box rejection of community-contributed data.

**Social Impact:** ClimateTrust empowers universities without calibration labs, NGOs deploying low-cost air quality monitors, and citizen scientists contributing to India's environmental monitoring gap. By standardizing heterogeneous sensor outputs before they reach publications or policy dashboards, the platform helps rebuild international trust in Indian climate data.

**Scalability:** The MVP accepts CSV uploads today. The roadmap includes real-time IoT webhooks, integration with IMD stations as calibration anchors, and a national sensor registry — fulfilling the MSV-2035 call for indigenous, AI-driven monitoring infrastructure.

*Built for STEMINATE HACKS 2026 — AI for a Better World.*

---

## Pitch Video Script (2–3 min)

| Time | Content |
|------|---------|
| 0:00–0:15 | Hook: "India's MSV-2035 report warns that uncalibrated instruments are polluting national climate data." |
| 0:15–1:45 | Demo: Click Sensor B (Drift) → trust score drops → AI explains drift → show corrected chart vs reference |
| 1:45–2:15 | Impact: universities, citizen scientists, policy credibility |
| 2:15–2:30 | Roadmap: IoT webhooks, IMD partnership, national sensor registry |

---

## What to Submit

- [ ] Live demo URL
- [ ] GitHub repository link
- [ ] This project description
- [ ] 2–3 minute pitch video
- [ ] Working prototype (local or deployed)
