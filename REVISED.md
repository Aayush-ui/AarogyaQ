# AarogyaQ — Revised Project Alignment Document

> **Revised Topic (Mentor-Approved):**
> *"AarogyaQ: An Explainable AI and Dynamic Patient Prioritization Framework Using Reinforcement Learning for Smart Emergency Departments"*

---

## 🎯 What the Revised Topic Demands

The revised topic title introduces three explicit academic pillars that must be deeply evidenced throughout the project:

| Pillar | Keyword in Title | What it Means for the Project |
|--------|-----------------|-------------------------------|
| **Explainable AI (XAI)** | "Explainable AI" | Every prioritization decision must carry a human-readable, traceable justification. Black-box scoring is insufficient. |
| **Dynamic Prioritization** | "Dynamic Patient Prioritization" | The system must adapt thresholds in real-time based on operational feedback, not use static cutoffs. |
| **Reinforcement Learning** | "Using Reinforcement Learning" | The RL agent must be the *mechanism* for dynamic adjustment — not a peripheral module but a core evidenced component. |
| **Smart Emergency Department** | "Smart Emergency Departments" | The system should demonstrate ED-specific intelligence: real-time queue awareness, SLA compliance, and predictive deterioration alerting. |

---

## 🗺️ Current State vs. Required State

### 1. Explainable AI (XAI) — *Partially Implemented → Must Be Strengthened*

#### ✅ What Exists
- `orchestrator.py` returns `score_breakdown` (list of fired rules) and `contributing_factors` (rule labels) per assessment.
- `digital_twin.py` outputs `alert_reasons` — human-readable strings explaining each deterioration modifier.
- `rule_engine.py` implements a multi-layer evaluation (Red Flags → Clinical Rules → Risk Weights → Business Override) with per-rule firing conditions.

#### ❌ What is Missing / Must Be Added

| # | Gap | Required Change |
|---|-----|-----------------|
| R-XAI-01 | Score breakdown returned to API but **not surfaced clearly in the frontend** | Add a dedicated Reasoning Panel in Doctor Dashboard / Command Center showing rule-by-rule score contributions |
| R-XAI-02 | **No XAI explanation API endpoint** | Add `GET /visits/{visit_id}/explanation` returning `{ rule_breakdown, business_overrides, twin_alert_reasons, rl_threshold_at_time }` |
| R-XAI-03 | `confidence_scores` from `ai_symptom.py` stored but **not displayed** | Surface AI confidence scores per mapped symptom in the NurseIntake review screen |
| R-XAI-04 | **No XAI export** for academic evaluation | Add `GET /visits/{visit_id}/explanation/export` returning a structured Markdown/PDF of the full decision chain |
| R-XAI-05 | Business rule override reasoning stored as flag IDs only | Add human-readable mapping of flag IDs → explanatory sentences in `summary_gen.py` |

---

### 2. Dynamic Patient Prioritization — *Core Engine Exists → Must Be Connected End-to-End*

#### ✅ What Exists
- `rule_engine.py` implements 3-layer scoring (15+ clinical rules, 5 business overrides, red flags, risk weight modifiers).
- `priority.py` classifies 0–100 score into Low / Medium / High / Critical.
- `digital_twin.py` projects risk score forward in real-time, generating `twin_priority` that can diverge from initial triage.

#### ❌ What is Missing / Must Be Added

| # | Gap | Required Change |
|---|-----|-----------------|
| R-DYN-01 | **Digital Twin `twin_priority` computed but queue NOT re-sorted by it** | Modify `queue_manager.py` and/or `LiveQueue.tsx` to sort by `twin_priority` when `alert_level == DETERIORATING` |
| R-DYN-02 | **No automatic re-assessment trigger** when Digital Twin detects deterioration | Add `POST /visits/{visit_id}/twin/alert` endpoint to auto-flag deteriorating patients for reassessment |
| R-DYN-03 | SLA breach monitoring exists but **no visual urgency cues** | Add pulsing/animated indicators in Command Center for patients whose `twin_priority` has escalated |
| R-DYN-04 | **Vitals re-scoring is manual only** | Add `PATCH /visits/{visit_id}/vitals` endpoint that triggers re-assessment when new mid-visit vitals are logged |

---

### 3. Reinforcement Learning — *Agent Exists → Must Be Formally Evidenced*

#### ✅ What Exists
- `rl_agent.py` implements a full Q-learning epsilon-greedy contextual bandit.
- State space: `(queue_type, time_of_day, queue_depth_bucket)`.
- Action space: threshold adjustments `{-5, -2, 0, +2, +5}` applied to score cutoffs.
- Reward function: SLA-based reward in `[-1.0, +1.0]`.
- Q-table persisted in `backend/config/rl_qtable.json`.
- Endpoints: `POST /rl/feedback`, `GET /rl/state`, `GET /rl/thresholds`.

#### ❌ What is Missing / Must Be Added

| # | Gap | Required Change |
|---|-----|-----------------|
| R-RL-01 | **RL feedback not called automatically on visit completion** | In `queue_manager.py` `update_visit_status()`, auto-trigger `POST /rl/feedback` when `status == "Completed"` |
| R-RL-02 | **No RL learning curve dashboard** | Add `GET /rl/history` endpoint (rolling reward log) and display reward convergence chart in AdminDashboard |
| R-RL-03 | **RL agent is a single-step contextual bandit** (no multi-step look-ahead) | Document this as current constraint; plan future MDP upgrade |
| R-RL-04 | **Frontend RL state panel lacks visualization** | Add Q-value per state chart and epsilon decay curve in AdminDashboard |
| R-RL-05 | **RL-adjusted thresholds NOT fed back into triage pipeline** | Wire `get_adjusted_thresholds()` into `orchestrator.py` so RL offsets affect real-time triage decisions |

---

### 4. Smart Emergency Department Features — *Foundation Exists → Must Be Completed*

#### ✅ What Exists
- Department routing (`department.py`) for 8 clinical departments.
- Department capacity status management (Available / Busy / Full).
- Shift report (`shift_report.py`) for aggregated ED metrics.
- CPOE order entry: clinical notes, medications, lab, radiology, bed assignment, transfers.
- 11 fully implemented React frontend pages (Login, Dashboard, NurseIntake, DoctorDashboard, CommandCenter, LiveQueue, ShiftReport, PatientHistory, AdminDashboard, DepartmentControl, NurseDashboard).

#### ❌ What is Missing / Must Be Added

| # | Gap | Required Change |
|---|-----|-----------------|
| R-SED-01 | **No real-time push updates** — frontend polls on-demand | Implement `GET /queue/stream` using Server-Sent Events (SSE) or WebSocket for push-based live queue updates |
| R-SED-02 | **No patient throughput analytics** beyond shift report | Add charts to AdminDashboard: avg time-to-attend per priority, priority distribution over time, RL threshold trend |
| R-SED-03 | **AI integration hidden behind `use_ai=False` flag** | Add toggle in NurseIntake form to activate AI symptom mapping and display before/after canonical translations |
| R-SED-04 | **No role-based login enforcement** | Harden Login page to map roles (Nurse, Doctor, Admin) to specific dashboard views and restrict navigation accordingly |

---

## 📋 Summary of All Required Changes

| ID | Module/File | Category | Priority | Status |
|----|-------------|----------|----------|--------|
| R-XAI-01 | `frontend/pages/DoctorDashboard.tsx` | XAI | 🔴 High | ⬜ Pending |
| R-XAI-02 | `backend/api.py` | XAI | 🔴 High | ⬜ Pending |
| R-XAI-03 | `frontend/pages/NurseIntake.tsx` | XAI | 🟡 Medium | ⬜ Pending |
| R-XAI-04 | `backend/api.py` | XAI | 🟢 Low | ⬜ Pending |
| R-XAI-05 | `backend/src/aarogyaq/summary_gen.py` | XAI | 🟡 Medium | ⬜ Pending |
| R-DYN-01 | `queue_manager.py` + `LiveQueue.tsx` | Dynamic | 🔴 High | ⬜ Pending |
| R-DYN-02 | `backend/api.py` | Dynamic | 🟡 Medium | ⬜ Pending |
| R-DYN-03 | `frontend/pages/CommandCenter.tsx` | Dynamic | 🟡 Medium | ⬜ Pending |
| R-DYN-04 | `backend/api.py` | Dynamic | 🟢 Low | ⬜ Pending |
| R-RL-01 | `backend/src/aarogyaq/queue_manager.py` | RL | 🔴 High | ⬜ Pending |
| R-RL-02 | `backend/api.py` + `AdminDashboard.tsx` | RL | 🟡 Medium | ⬜ Pending |
| R-RL-03 | Academic write-up / documentation | RL | 🟢 Low | ⬜ Pending |
| R-RL-04 | `frontend/pages/AdminDashboard.tsx` | RL | 🟡 Medium | ⬜ Pending |
| R-RL-05 | `orchestrator.py` + `priority.py` | RL | 🔴 High | ⬜ Pending |
| R-SED-01 | `backend/api.py` | Smart ED | 🟡 Medium | ⬜ Pending |
| R-SED-02 | `frontend/pages/AdminDashboard.tsx` | Smart ED | 🟡 Medium | ⬜ Pending |
| R-SED-03 | `frontend/pages/NurseIntake.tsx` | Smart ED | 🟡 Medium | ⬜ Pending |
| R-SED-04 | `frontend/pages/Login.tsx` | Smart ED | 🟢 Low | ⬜ Pending |

---

## 🏷️ Recommended Abstract for Academic Submission

> *AarogyaQ is an Explainable AI and Dynamic Patient Prioritization framework for Smart Emergency Departments. It combines a deterministic, 3-layer clinical rule engine with a Reinforcement Learning agent (Q-learning, epsilon-greedy) that learns from patient outcome feedback to dynamically adapt priority score thresholds to current department load. A Digital Twin module projects each patient's real-time risk trajectory without new measurements, enabling proactive deterioration alerting. All triage decisions expose full XAI justification chains — including fired clinical rules, business override flags, AI symptom-mapping confidence scores, and RL threshold offsets — ensuring every prioritization is auditable, traceable, and clinician-legible.*

---
