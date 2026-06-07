# ClimateTrust AI — Hackathon Submission

## Project Name
**ClimateTrust AI**

## Tagline
*Restore credibility to climate data, one sensor at a time.*

## Category
AI for a Better World · Environmental AI Track

## Demo Link
- **Frontend:** https://climatetrust-ai.vercel.app (deploy after submission)
- **GitHub:** https://github.com/Angelflyhi/ClimateTrustAi

---

## 500-Word Description

India's scientific community faces an "Instrument Crisis." The MSV-2035 report submitted to the Office of the Principal Scientific Adviser reveals that heavy reliance on imported, uncalibrated scientific instruments has compromised the integrity of climate data entering national research journals — triggering global concerns about the credibility of Indian environmental science.

ClimateTrust AI addresses this gap with an **agentic validation layer** for environmental sensors. The platform ingests time-series data from research instruments, citizen science networks, or low-cost DIY sensors, then cross-validates readings against satellite-grade reference data from Open-Meteo — a free, global weather archive requiring no API key.

**The AI pipeline detects three failure modes** common in uncalibrated equipment:

1. **Sudden spikes** — identified via rolling Z-score analysis with a 24-hour window. Any reading deviating more than 3σ from the local mean is flagged with its Z-score value.

2. **Systematic drift** — detected by computing the cumulative deviation between sensor and reference temperatures over rolling 48-hour windows. Drift exceeding 1.5°C is flagged and quantified.

3. **Multivariate anomalies** — an Isolation Forest model (scikit-learn) trained on temperature, humidity, and reference data identifies readings that are collectively inconsistent with expected environmental patterns.

Detected issues trigger a **two-stage calibration engine**: first, linear drift is detrended using polynomial regression; then, an affine correction (scale + bias) is learned via least-squares fit against the reference, producing a corrected temperature stream comparable to research-grade instruments.

Each sensor batch receives a **transparent Trust Score (0–100)** — a weighted formula penalising anomaly rate, drift magnitude, and correlation gap, with a bonus for successful calibration. The formula is fully published in the README and shown in the UI. Every anomaly flag includes a machine-readable reason code — there is no black-box rejection of community data.

Finally, a **Gemini 2.0 Flash AI agent** generates a plain-English explanation of findings, citing specific numbers: drift magnitude, calibration improvement, correlation before and after. This makes the output accessible to researchers, students, and citizen scientists who may not interpret raw statistics.

**Social Impact:** ClimateTrust empowers universities without calibration labs, NGOs deploying low-cost air quality monitors, and citizen scientists contributing to India's environmental monitoring gap. By standardising heterogeneous sensor outputs before they reach publications or policy dashboards, the platform helps rebuild international trust in Indian climate data.

**Ethical AI:** Every decision is explainable. The scoring formula is auditable. Data is processed in-memory only and never retained. The platform corrects and improves community-contributed data rather than suppressing it — directly aligning with responsible AI principles discussed at the June 10 STEMINATE session.

**Scalability:** The MVP accepts CSV uploads today. The roadmap includes real-time IoT webhooks, integration with IMD stations as calibration anchors, and a national sensor registry — fulfilling the MSV-2035 call for indigenous, AI-driven monitoring infrastructure.

---

## Judging Criteria Self-Assessment

| Criterion | Points | Our Score | Rationale |
|-----------|--------|-----------|-----------|
| Innovation & Creativity | 20 | 18/20 | Trust layer for climate data is novel; agentic explanations differentiate from generic dashboards |
| Impact & Relevance | 20 | 19/20 | Directly cites MSV-2035; addresses national strategic problem with measurable outcomes |
| Technical Implementation | 20 | 18/20 | Multi-stage ML pipeline + reference cross-validation + live FastAPI + Next.js |
| Use of AI / Technology | 15 | 14/15 | Core product IS AI (detection + calibration + agent), not a chatbot wrapper |
| Feasibility & Scalability | 10 | 9/10 | MVP works with CSV today; roadmap to IoT, IMD, university partnerships |
| Presentation | 10 | 8/10 | Before/after demo inherently compelling; trust score badge is visual anchor |
| Design & UX | 5 | 5/5 | Premium dark dashboard; animated gauge; responsive layout |
| **Total** | **100** | **91/100** | |

---

## Team
Solo submission — built in 6 days for STEMINATE HACKS 2026.

---

## Pitch Video Script (2 min 30 sec)

**[0:00–0:15]** Hook
> "India's MSV-2035 report warns that uncalibrated instruments are polluting national climate data — compromising decades of environmental research. The problem isn't the data. It's that we have no way to trust it."

**[0:15–0:30]** Product intro
> "ClimateTrust AI is an AI-powered validation layer. You upload a sensor CSV — we tell you how trustworthy it is, why, and how to fix it."

**[0:30–1:30]** Live demo
- Click Sensor B (Drift)
- Trust Score appears: 42/100, Grade D
- Point to drift chart: "+3.8°C over 7 days — classic uncalibrated thermistor"
- Show corrected line overlaying reference
- Read AI explanation
- Switch to Sensor A (clean): 89/100, Grade A
- "Same pipeline, honest result"

**[1:30–2:00]** Impact
> "Universities without calibration labs. NGOs with ₹500 sensors. Citizen scientists. All can now validate their data before it enters publications."

**[2:00–2:30]** Roadmap + close
> "Today: CSV upload. Tomorrow: IoT webhooks and IMD integration. ClimateTrust AI — restoring credibility to climate data, one sensor at a time."

---

## Links

- **GitHub:** https://github.com/Angelflyhi/ClimateTrustAi
- **Live Demo:** (deploy before Jun 13)
- **Architecture:** [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- **Ethics:** [docs/ETHICS.md](ETHICS.md)
- **Build Guide:** [docs/BUILD_GUIDE.md](BUILD_GUIDE.md)
