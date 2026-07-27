# AarogyaQ — Project Progress Tracker

> **Topic:** *AarogyaQ: An Explainable AI and Dynamic Patient Prioritization Framework Using Reinforcement Learning for Smart Emergency Departments*
> **Last Updated:** 2026-07-27

---

## Overall Completion

`
███████████████████████████░░░░░░░░░░░░░  68%  [68 / 100 points]
`

---

## Progress by Pillar

### 🔵 Backend Core Infrastructure
`
████████████████████████████████████████  100%  COMPLETE
`
- [x] FastAPI application with CORS, routing, error handlers
- [x] SQLAlchemy models (Patient, Visit, Assessment, Vitals, Orders, Departments)
- [x] ARQ-000001 format unified patient ID system
- [x] SQLite persistence with init_db() / seed_departments()
- [x] Audit logging (udit.py)
- [x] Audit logging ( udit.py)
- [x] Shift report aggregation (shift_report.py)

---

### 🟣 Clinical Rules Engine (XAI Foundation)
`
████████████████████████████████████████  100%  COMPLETE
`
- [x] 3-layer evaluation: Red Flag → Clinical Rules → Risk Weights → Business Override
- [x] 15+ clinical rules in clinical_rules.json (RULE-001 → RULE-015)
- [x] 5 business override rules in business_rules.json
- [x] score_breakdown and contributing_factors returned per assessment
- [x] Multilingual symptom mapping (ai_symptom.py) with confidence scores
- [x] R-XAI-02 — GET /visits/{visit_id}/explanation endpoint
- [x] R-XAI-05 — Human-readable business flag descriptions in summary_gen.py

---

### 🟤 Reinforcement Learning Agent
`
████████████████████████████████░░░░░░░░  80%
`
- [x] Q-learning epsilon-greedy contextual bandit (l_agent.py)
- [x] State space: (queue_type, time_of_day, queue_depth_bucket)
- [x] Action space: {-5, -2, 0, +2, +5} threshold adjustments
- [x] SLA-based reward function in [-1.0, +1.0]
- [x] Q-table persisted in l_qtable.json
- [x] REST endpoints: POST /rl/feedback, GET /rl/state, GET /rl/thresholds
- [x] R-RL-01 — Auto-trigger RL feedback on visit completion
- [ ] R-RL-02 — GET /rl/history endpoint + reward convergence chart
- [ ] R-RL-04 — Q-value / epsilon decay visualization in AdminDashboard
- [x] R-RL-05 — Wire RL-adjusted thresholds into live triage pipeline

---

### 🟢 Digital Twin & Dynamic Prioritization
`
████████████████████████░░░░░░░░░░░░░░░░  60%
`
- [x] compute_twin_state() with physiology-based deterioration rates
- [x] NEWS2/MEWS inspired alert levels: STABLE / MONITOR / DETERIORATING / CRITICAL_ALERT
- [x] XAI reasons per alert level ( lert_reasons list)
- [x] GET /visits/{visit_id}/twin endpoint
- [x] Twin state embedded in all queue responses
- [x] R-DYN-01 — Queue re-sort by twin_priority on deterioration
- [ ] R-DYN-02 — Auto-reassessment trigger endpoint
- [ ] R-DYN-03 — Visual deterioration urgency cues in Command Center
- [ ] R-DYN-04 — Mid-visit vitals patch and re-score

---

### 🟡 Frontend — Clinician Interfaces
`
████████████████████████████████░░░░░░░░  80%
`
- [x] 11 pages implemented (Login, Dashboard, NurseIntake, DoctorDashboard, CommandCenter, LiveQueue, ShiftReport, PatientHistory, AdminDashboard, DepartmentControl, NurseDashboard)
- [x] Zustand state stores (Patient, Queue, UI)
- [x] Recharts data visualization in dashboards
- [x] Motion micro-animations
- [x] CPOE order entry (notes, medications, labs, radiology, bed, transfer)
- [x] Hybrid API adapter with simulatedDb.ts fallback
- [ ] R-XAI-01 — Reasoning Panel component in DoctorDashboard
- [ ] R-XAI-03 — AI confidence score display in NurseIntake
- [ ] R-SED-03 — AI toggle in NurseIntake with before/after symptom view
- [ ] R-SED-04 — Role-based navigation enforcement in Login

---

### 🔴 Explainability (XAI) — End-to-End
`
██████████████████████████░░░░░░░░░░░░░░  66%
`
- [x] score_breakdown stored per assessment
- [x] contributing_factors per assessment
- [x] alert_reasons in Digital Twin
- [x] confidence_scores per mapped symptom (stored)
- [ ] R-XAI-01 — Reasoning Panel UI component
- [x] R-XAI-02 — /explanation API endpoint
- [ ] R-XAI-03 — Confidence score display in frontend
- [ ] R-XAI-04 — XAI export endpoint
- [x] R-XAI-05 — Business flag human-readable descriptions

---

### ⚫ Smart ED & Operational Intelligence
`
████████████████████████████░░░░░░░░░░░░  70%
`
- [x] Department routing (8 departments)
- [x] Department capacity management (Available / Busy / Full)
- [x] SLA-based stale patient detection (/queue/stale)
- [x] Shift report (/shift/report)
- [x] CORS configured for frontend integration
- [ ] R-SED-01 — Real-time SSE / WebSocket push for live queue
- [ ] R-SED-02 — Throughput analytics charts in AdminDashboard

---

## Change Tracking

| Change ID | Description | Status | Completed On |
|-----------|-------------|--------|-------------|
| R-XAI-01 | Reasoning Panel in DoctorDashboard | ⬜ Pending | — |
| R-XAI-02 | /visits/{id}/explanation endpoint | ✅ Done | 2026-07-27 |
| R-XAI-03 | AI confidence display in NurseIntake | ⬜ Pending | — |
| R-XAI-04 | XAI export endpoint | ⬜ Pending | — |
| R-XAI-05 | Business flag human descriptions | ✅ Done | 2026-07-27 |
| R-DYN-01 | Queue re-sort by twin_priority | ✅ Done | 2026-07-27 |
| R-DYN-02 | Auto-reassessment trigger endpoint | ⬜ Pending | — |
| R-DYN-03 | Deterioration urgency UI cues | ⬜ Pending | — |
| R-DYN-04 | Mid-visit vitals patch endpoint | ⬜ Pending | — |
| R-RL-01 | Auto RL feedback on completion | ✅ Done | 2026-07-27 |
| R-RL-02 | /rl/history + reward chart | ⬜ Pending | — |
| R-RL-03 | Document bandit constraint | ⬜ Pending | — |
| R-RL-04 | Q-value / epsilon decay chart | ⬜ Pending | — |
| R-RL-05 | Wire RL thresholds into triage | ✅ Done | 2026-07-27 |
| R-SED-01 | SSE / WebSocket live queue | ⬜ Pending | — |
| R-SED-02 | Throughput analytics charts | ⬜ Pending | — |
| R-SED-03 | AI toggle in NurseIntake form | ⬜ Pending | — |
| R-SED-04 | Role-based login enforcement | ⬜ Pending | — |

---

## Notes

- Progress bar denominator is qualitative (feature completeness weight, not raw line count).
- Scores are re-evaluated after each major task or bulk completion event, or at minimum every 2 days.
- See [REVISED.md](REVISED.md) for full gap analysis and per-change rationale.
- Passing test suite confirms backend correctness at each milestone: **139 tests / 0 failures**.
