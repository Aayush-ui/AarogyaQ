# AarogyaQ Frontend Redesign Reference

> **Purpose**: Complete, self-contained reference for rebuilding the AarogyaQ frontend.  
> **Who uses this**: Any AI model or developer taking over the frontend redesign work.  
> **Written**: 2026-07-27  
> **Backend Status**: Fully implemented, 149 tests passing. Do NOT modify backend code.

---

## 1. Project Overview

**AarogyaQ** is an Explainable AI and Dynamic Patient Prioritization system for Smart Emergency Departments. The frontend is a React + TypeScript single-page app that visualises triage queues, patient assessments, AI explanations, and reinforcement learning state from a FastAPI backend.

**Core academic pillars the UI must demonstrate:**
1. **XAI** — Show fired clinical rules, override reasons, RL threshold context per patient
2. **Dynamic Prioritization** — Live queue that re-sorts when Digital Twin detects deterioration
3. **Reinforcement Learning** — RL agent state, Q-table, epsilon, reward history
4. **Smart ED** — Real-time queue management, triage flow, shift analytics

---

## 2. Tech Stack (do not change)

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript (Vite) |
| Routing | Hash-based (`#/route`) via custom `AppRouter` |
| State | Zustand stores |
| HTTP | Axios (`apiClient` from `src/api/client.ts`) |
| Styling | TailwindCSS utility classes |
| Icons | Lucide React |
| Charts | Recharts |
| Animation | `motion/react` (Framer Motion) |
| Font | Inter (Google Fonts) |

**Backend URL**: `http://localhost:8000` (configured in `src/api/client.ts`)

---

## 3. Current File Structure

```
frontend/src/
├── App.tsx                          ← Shell: auth gate + layout + router mount
├── main.tsx                         ← Entry point
├── index.css                        ← Global CSS + Tailwind base
├── types.ts                         ← ALL shared TypeScript interfaces
├── api/
│   ├── client.ts                    ← Axios instance (baseURL: http://localhost:8000)
│   ├── queue.ts                     ← GET /queue/* endpoints
│   ├── visits.ts                    ← PATCH/POST /visits/* endpoints
│   ├── patient.ts                   ← POST /patients/register + GET history
│   ├── analytics.ts                 ← GET /shift/report, /departments, /health
│   ├── twin.ts                      ← GET /visits/{id}/twin
│   └── simulatedDb.ts               ← ⚠️ FAKE DATA — to be DELETED
├── config/
│   └── rbac.ts                      ← Role definitions, allowed routes, permissions
├── store/
│   ├── useUIStore.ts                ← Auth state, theme, toasts, audit logs
│   ├── useQueueStore.ts             ← Emergency/general/stale queue state
│   └── usePatientStore.ts           ← Patient registration + intake state
├── routes/
│   └── AppRouter.tsx                ← Hash route → page component mapping
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   └── PageTransition.tsx
│   ├── ui/
│   │   ├── Card.tsx, Button.tsx, Badge.tsx, Input.tsx
│   │   ├── Spinner.tsx, Toast.tsx, Tooltip.tsx
│   │   ├── Stepper.tsx              ← Can be removed after NurseIntake simplification
│   │   ├── Slider.tsx               ← Can be removed after NurseIntake simplification
│   │   └── ProgressRing.tsx         ← Can be removed
│   ├── charts/
│   │   └── AnimatedCounter.tsx
│   ├── queue/
│   │   ├── QueueColumn.tsx
│   │   ├── PriorityBadge.tsx
│   │   └── ExplainabilityPanel.tsx  ← Exists but not fully wired; reuse/replace
│   └── patient/
│       └── (patient detail components)
└── pages/
    ├── Login.tsx          (712 lines)  ← KEEP — simplify
    ├── Dashboard.tsx      (199 lines)  ← KEEP — minor cleanup
    ├── LiveQueue.tsx      (261 lines)  ← KEEP — add twin badges
    ├── NurseIntake.tsx    (597 lines)  ← KEEP — simplify significantly
    ├── DoctorDashboard.tsx(254 lines)  ← KEEP — add XAI reasoning panel
    ├── ShiftReport.tsx    (31KB)       ← KEEP — strip fake data
    ├── AdminDashboard.tsx (11KB)       ← KEEP — wire real RL endpoints
    ├── CommandCenter.tsx  (33KB)       ← ❌ DELETE
    ├── PatientHistory.tsx (30KB)       ← ❌ DELETE
    ├── NurseDashboard.tsx (13KB)       ← ❌ DELETE
    └── DepartmentControl.tsx (8KB)     ← ❌ DELETE
```

---

## 4. Backend API Contract

> All endpoints are at `http://localhost:8000`. No auth header required yet (JWT is planned as R-SEC-01 but not implemented). All responses are JSON.

### 4.1 Queue Endpoints

#### `GET /queue/emergency`
Returns all Waiting/Attending visits with `queue_type="Emergency"`, sorted by priority then wait time.

**Response**: `TriageQueueItem[]`

```json
[
  {
    "patient": {
      "patient_id": "ARQ-000001",
      "name": "Rajesh Kumar",
      "age": 45,
      "gender": "Male",
      "phone": "9876543210"
    },
    "visit": {
      "visit_id": "1",
      "status": "Waiting",
      "queue_type": "Emergency",
      "department_assigned": "Cardiology",
      "pain_level": 8,
      "chief_complaint": "chest pain",
      "registered_at": "2026-07-27T10:30:00",
      "bed_assigned": null,
      "needs_reassessment": false,
      "clinical_notes": [],
      "medication_orders": [],
      "laboratory_orders": [],
      "radiology_orders": [],
      "vitals": {
        "heart_rate": 102,
        "systolic_bp": 145,
        "diastolic_bp": 92,
        "spo2": 94,
        "temperature": 37.2,
        "respiratory_rate": 18
      }
    },
    "assessment": {
      "risk_score": 78.5,
      "priority_level": "Critical",
      "mapped_symptoms": ["chest pain", "shortness of breath"],
      "confidence_scores": { "chest pain": 0.95, "shortness of breath": 0.82 },
      "contributing_factors": ["RULE-001: Red flag symptom", "RULE-007: Elevated HR"],
      "score_breakdown": { "RULE-001": 30, "RULE-007": 15, "AGE_MODIFIER": 5 }
    },
    "summary": {
      "summary_text": "High-risk cardiac presentation..."
    },
    "twin": {
      "visit_id": 1,
      "initial_risk_score": 78.5,
      "projected_risk_score": 84.2,
      "twin_priority": "Critical",
      "deterioration_rate": 0.18,
      "minutes_waiting": 22,
      "alert_level": "DETERIORATING",
      "alert_reasons": ["SPO2 < 95% with elevated HR", "Age > 40 with cardiac complaint"],
      "computed_at": "2026-07-27T11:02:00"
    }
  }
]
```

**`visit.status` values**: `"Waiting"` | `"Attending"` | `"Completed"`  
**`twin.alert_level` values**: `"STABLE"` | `"MONITOR"` | `"DETERIORATING"` | `"CRITICAL_ALERT"`  
**`assessment.priority_level` values**: `"Low"` | `"Medium"` | `"High"` | `"Critical"`

#### `GET /queue/general`
Same shape. `queue_type` will be `"General"`.

#### `GET /queue/stale`
Same shape. Returns visits waiting > 45 minutes.

---

### 4.2 Patient Registration

#### `POST /patients/register`

**Request body:**
```json
{
  "name": "string (required)",
  "age": 35,
  "gender": "Male",
  "phone": "9876543210",
  "chief_complaint": "chest pain (required)",
  "pain_level": 7,
  "symptom_duration": 2,
  "existing_conditions": ["hypertension"],
  "use_ai": false,
  "vitals": {
    "heart_rate": 98,
    "systolic_bp": 140,
    "diastolic_bp": 88,
    "spo2": 95,
    "temperature": 37.1,
    "respiratory_rate": 16
  }
}
```
- `vitals` is **optional** — omit the key entirely if not provided
- `use_ai`: when `true`, runs Gemini-based symptom mapping (R-SED-03 feature)
- `existing_conditions`: array of strings, can be `[]`
- `symptom_duration`: integer, hours

**Response**: Full `TriageQueueItem` (same shape as queue response above)

---

### 4.3 Visit Actions

#### `PATCH /visits/{visit_id}/status`
```json
{ "status": "Attending" }
```
Valid transitions: `Waiting → Attending → Completed`  
Triggering `Completed` auto-fires RL feedback internally.

#### `POST /visits/{visit_id}/reassess`
```json
{ "pain_level": 6 }
```
Response: Updated `TriageQueueItem`

#### `POST /visits/{visit_id}/twin/alert`
No body. Sets `needs_reassessment = true`.  
Response: `{ "status": "alert_triggered", "needs_reassessment": true }`

#### `GET /visits/{visit_id}/explanation`
```json
{
  "visit_id": 1,
  "risk_score": 78.5,
  "priority_level": "Critical",
  "rule_breakdown": {
    "RULE-001": 30,
    "RULE-007": 15,
    "AGE_MODIFIER": 5
  },
  "contributing_factors": ["RULE-001: Red flag symptom", "RULE-007: Elevated HR"],
  "business_overrides": {
    "MAX_PAIN_OVERRIDE": "Patient reported maximum pain score (10/10) — priority escalated regardless of risk score"
  },
  "twin_alert_reasons": ["SPO2 < 95% with elevated HR"],
  "rl_threshold_at_assessment": {
    "Critical": [75, 100],
    "High": [50, 75],
    "Medium": [25, 50],
    "Low": [0, 25]
  }
}
```

#### `POST /visits/{visit_id}/notes`
```json
{ "author": "Dr. Smith", "note": "Patient stable, monitoring..." }
```

#### `POST /visits/{visit_id}/medications`
```json
{ "doctor": "Dr. Smith", "name": "Aspirin", "dosage": "75mg", "frequency": "Once daily" }
```

#### `POST /visits/{visit_id}/labs`
```json
{ "doctor": "Dr. Smith", "test_name": "CBC" }
```

#### `POST /visits/{visit_id}/radiology`
```json
{ "doctor": "Dr. Smith", "scan_type": "Chest X-Ray" }
```

#### `PATCH /visits/{visit_id}/bed`
```json
{ "bed": "ER-3B" }
```

#### `PATCH /visits/{visit_id}/transfer`
```json
{ "department": "Cardiology" }
```

---

### 4.4 Analytics

#### `GET /shift/report`
Query params (optional): `shift_start`, `shift_end` (ISO datetime strings)

```json
{
  "total_patients": 42,
  "critical_count": 5,
  "avg_wait_time": 18.5,
  "longest_wait_time": 67,
  "priority_distribution": [
    { "name": "Critical", "value": 5 },
    { "name": "High", "value": 12 },
    { "name": "Medium", "value": 18 },
    { "name": "Low", "value": 7 }
  ],
  "queue_distribution": [
    { "name": "Emergency", "value": 22 },
    { "name": "General", "value": 20 }
  ],
  "department_workload": [
    { "name": "Cardiology", "count": 8 },
    { "name": "General Medicine", "count": 14 }
  ]
}
```

#### `GET /departments`
```json
[
  { "name": "Cardiology", "status": "Active", "active_patients": 5, "wait_time_mins": 12 }
]
```

#### `GET /health`
```json
{ "status": "ok" }
```

---

### 4.5 Reinforcement Learning

#### `GET /rl/state`
```json
{
  "qtable": {
    "Emergency|morning|low": [0.12, -0.05, 0.0, 0.08, -0.02],
    "General|afternoon|medium": [-0.1, 0.03, 0.0, 0.15, 0.07]
  },
  "epsilon": 0.38,
  "total_updates": 142
}
```
Q-values correspond to actions: `[-5, -2, 0, +2, +5]` threshold offset adjustments.

#### `GET /rl/thresholds`
```json
{
  "Emergency": { "Critical": [75, 100], "High": [50, 75], "Medium": [25, 50], "Low": [0, 25] },
  "General": { "Critical": [80, 100], "High": [55, 80], "Medium": [30, 55], "Low": [0, 30] }
}
```

#### `POST /rl/feedback`
```json
{
  "visit_id": 1,
  "priority_level": "Critical",
  "minutes_to_attend": 8,
  "queue_type": "Emergency",
  "queue_depth": 5
}
```
Response: `{ "status": "updated", "reward": 0.85 }`

#### `GET /rl/history`
> ⚠️ **This endpoint does NOT exist yet** (pending R-RL-02).  
> Call it with try/catch. If it fails, show a placeholder: "Reward history will appear here once the RL agent has processed completed visits."

---

## 5. TypeScript Types (`src/types.ts`)

The following types exist. **Add** the three new ones at the bottom when creating the new API modules.

```typescript
// ── Existing types ─────────────────────────────────────────────────────────

export interface Patient {
  patient_id: string;
  name: string;
  age: number;
  gender: string;
  phone?: string;
}

export interface Visit {
  visit_id: string;
  status: 'Waiting' | 'Attending' | 'Completed' | string;
  queue_type: 'Emergency' | 'General' | string;
  department_assigned: string;
  pain_level: number;
  chief_complaint?: string;
  registered_at?: string;
  attended_at?: string;
  completed_at?: string;
  bed_assigned?: string;
  needs_reassessment?: boolean;   // ← Digital Twin flag; lives on Visit, not Assessment
  existing_conditions?: string[];
  clinical_notes?: { timestamp: string; author: string; note: string }[];
  medication_orders?: { timestamp: string; doctor: string; name: string; dosage: string; frequency: string; status: "Pending" | "Administered" }[];
  laboratory_orders?: { timestamp: string; doctor: string; test_name: string; status: "Ordered" | "Processing" | "Completed"; result?: string }[];
  radiology_orders?: { timestamp: string; doctor: string; scan_type: string; status: "Ordered" | "Processing" | "Completed"; result?: string }[];
  vitals?: {
    heart_rate?: number;
    systolic_bp?: number;
    diastolic_bp?: number;
    spo2?: number;
    temperature?: number;
    respiratory_rate?: number;
  };
}

export interface Assessment {
  risk_score: number;            // 0-100
  priority_level: 'Low' | 'Medium' | 'High' | 'Critical';
  mapped_symptoms: string[];
  confidence_scores: Record<string, number>;
  contributing_factors: string[];
  score_breakdown: Record<string, number>;
}

export interface Summary { summary_text: string; }

export type TwinAlertLevel = "STABLE" | "MONITOR" | "DETERIORATING" | "CRITICAL_ALERT";

export interface TwinState {
  visit_id: number;
  initial_risk_score: number;
  projected_risk_score: number;
  twin_priority: "Critical" | "High" | "Medium" | "Low";
  deterioration_rate: number;
  minutes_waiting: number;
  alert_level: TwinAlertLevel;
  alert_reasons: string[];
  computed_at: string;
}

export interface TriageQueueItem {
  patient: Patient;
  visit: Visit;
  assessment: Assessment;
  summary: Summary;
  twin?: TwinState | null;
}

export interface Department {
  name: string;
  status: 'Active' | 'Overloaded' | 'Inactive' | string;
  active_patients: number;
  wait_time_mins: number;
}

export interface ShiftReportData {
  total_patients: number;
  critical_count: number;
  avg_wait_time: number;
  longest_wait_time: number;
  priority_distribution: { name: string; value: number }[];
  queue_distribution: { name: string; value: number }[];
  department_workload: { name: string; count: number }[];
}

// ── New types — ADD THESE to types.ts ──────────────────────────────────────

export interface ExplanationData {
  visit_id: number;
  risk_score: number;
  priority_level: string;
  rule_breakdown: Record<string, number>;
  contributing_factors: string[];
  business_overrides: Record<string, string>;
  twin_alert_reasons: string[];
  rl_threshold_at_assessment: Record<string, [number, number]>;
}

export interface RLState {
  qtable: Record<string, number[]>;   // key: "QueueType|time_bucket|depth_bucket"
  epsilon: number;
  total_updates: number;
}

export interface RLThresholds {
  Emergency: Record<string, [number, number]>;
  General: Record<string, [number, number]>;
}
```

---

## 6. Zustand Stores (existing — do not restructure)

### `useUIStore` — auth, theme, toasts
```typescript
// Key state:
isAuthenticated: boolean     // gates the whole app in App.tsx
activeRole: "Nurse" | "Doctor" | "Administrator"
currentUser: { username, email, name, role } | null
theme: "light" | "dark"
isOffline: boolean           // set true when health check fails

// Key actions:
login(username, role)        // sets isAuthenticated = true. No backend call yet.
logout()
addToast(message, type?, duration?)
setIsOffline(status)
```

### `useQueueStore` — queue data
```typescript
// Key state:
emergencyQueue: TriageQueueItem[]
generalQueue: TriageQueueItem[]
staleQueue: TriageQueueItem[]
isLoading: boolean

// Key actions:
fetchQueues(silent?)          // fetches all 3 queues + health in parallel
updatePatientStatus(visitId, status)
reassessPatient(visitId, painLevel)
```

### `usePatientStore` — patient registration
```typescript
// Key state:
isSubmitting: boolean
triageResult: TriageQueueItem | null

// Key actions:
submitIntake(formData)        // POST /patients/register
resetIntake()
```

---

## 7. Routing

App uses **hash-based routing** (`#/route`) via a custom `AppRouter` in `src/routes/AppRouter.tsx`.  
Navigation: `window.location.hash = "#/route"` or `<a href="#/route">`.

**New simplified route map:**

| Hash | Page | Roles Allowed |
|---|---|---|
| `#/dashboard` | Dashboard | All |
| `#/intake` | NurseIntake | Nurse, Administrator |
| `#/queue` | LiveQueue | All |
| `#/doctor` | DoctorDashboard | Doctor, Administrator |
| `#/shift` | ShiftReport | Administrator |
| `#/admin` | AdminDashboard | Administrator |

Update `src/config/rbac.ts` `ROLE_ALLOWED_ROUTES` and `ROLE_LANDING_PAGES` to match. Landing pages:
- Nurse → `#/intake`
- Doctor → `#/doctor`
- Administrator → `#/dashboard`

---

## 8. Design System

Apply uniformly. **No per-page color improvisation.**

```css
Background:  #0f1117
Surface:     #1a1f2e
Border:      #2a3040
Text:        #e8ecf4
Muted:       #8492a6
Blue:        hsl(220, 85%, 58%)
Green:       #22c55e
Yellow:      #f59e0b
Orange:      #f97316
Red:         #ef4444
```

**Priority → color mapping:**
- Critical → `#ef4444` (red)
- High → `#f97316` (orange)
- Medium → `#f59e0b` (yellow)
- Low → `#22c55e` (green)

**Twin alert level → color + animation:**
- `CRITICAL_ALERT` → red + `animate-pulse`
- `DETERIORATING` → orange + `animate-pulse`
- `MONITOR` → yellow, static
- `STABLE` → render nothing (no badge)

**Standard card**: `bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-4`  
**Primary button**: `bg-[hsl(220,85%,58%)] text-white rounded-lg px-4 py-2 text-sm font-medium hover:brightness-110 transition`  
**Ghost button**: `border border-[#2a3040] text-[#8492a6] rounded-lg px-4 py-2 text-sm hover:border-[#4a5060] transition`

**Label style**: `text-xs font-medium text-[#8492a6] uppercase tracking-wide`  
**Body text**: `text-sm text-[#e8ecf4]`

**Animation rule**: `motion/react` enter animation (`opacity: 0→1, y: 10→0`) on page/card mount only. No looping decorative animations.

---

## 9. Deletion Manifest

Delete these **first**, before rewriting any surviving page:

| File | Reason |
|---|---|
| `src/pages/CommandCenter.tsx` | Removed from page set |
| `src/pages/PatientHistory.tsx` | Removed from page set |
| `src/pages/NurseDashboard.tsx` | Removed from page set |
| `src/pages/DepartmentControl.tsx` | Removed from page set |
| `src/api/simulatedDb.ts` | All fake data removed |

**After deletion, remove all references from:**
- `src/routes/AppRouter.tsx` — delete import statements + route cases for deleted pages
- `src/components/layout/Sidebar.tsx` — remove nav items for deleted pages
- `src/api/queue.ts` — remove `simulatedDb` import + all fallback catch blocks
- `src/api/visits.ts` — remove all `simulatedDb` imports + fallback catch blocks
- `src/api/patient.ts` — remove `simulatedDb` import + fallback catch block
- `src/api/analytics.ts` — remove `simulatedDb` import + fallback catch blocks
- `src/App.tsx` — remove `#/command` keyboard hotkey

**API function pattern after removing fallbacks:**
```typescript
// BEFORE (with fake data fallback):
export async function getEmergencyQueue(): Promise<TriageQueueItem[]> {
  try {
    const response = await apiClient.get<TriageQueueItem[]>("/queue/emergency");
    return response.data;
  } catch (error) {
    return simulatedQueue.filter(...);  // DELETE THIS
  }
}

// AFTER (let it throw — store handles the error):
export async function getEmergencyQueue(): Promise<TriageQueueItem[]> {
  const response = await apiClient.get<TriageQueueItem[]>("/queue/emergency");
  return response.data;
}
```

The Zustand stores already wrap API calls in `try/catch` with `addToast` error messages — they will handle the thrown error cleanly.

---

## 10. New API Modules to Create

### `src/api/explanation.ts`
```typescript
import apiClient from "./client";
import { ExplanationData } from "../types";

export async function getExplanation(visitId: string): Promise<ExplanationData> {
  const response = await apiClient.get<ExplanationData>(`/visits/${visitId}/explanation`);
  return response.data;
}

export async function triggerTwinAlert(visitId: string): Promise<void> {
  await apiClient.post(`/visits/${visitId}/twin/alert`);
}
```

### `src/api/rl.ts`
```typescript
import apiClient from "./client";
import { RLState, RLThresholds } from "../types";

export async function getRLState(): Promise<RLState> {
  const response = await apiClient.get<RLState>("/rl/state");
  return response.data;
}

export async function getRLThresholds(): Promise<RLThresholds> {
  const response = await apiClient.get<RLThresholds>("/rl/thresholds");
  return response.data;
}

// NOTE: /rl/history does not exist yet (pending R-RL-02)
// Call with try/catch and show placeholder on failure
export async function getRLHistory(): Promise<{ rewards: number[] }> {
  const response = await apiClient.get<{ rewards: number[] }>("/rl/history");
  return response.data;
}
```

---

## 11. New Components to Create

### `src/components/queue/TwinAlertBadge.tsx`
```typescript
// Props: alertLevel: TwinAlertLevel
// Renders:
//   CRITICAL_ALERT → <span class="animate-pulse text-red-400 ...">🔴 Critical Alert</span>
//   DETERIORATING  → <span class="animate-pulse text-orange-400 ...">⚠ Deteriorating</span>
//   MONITOR        → <span class="text-yellow-400 ...">👁 Monitor</span>
//   STABLE         → null (render nothing)
```

### `src/components/queue/XAIPanel.tsx`
```typescript
// Props: explanation: ExplanationData | null, isLoading: boolean, error: string | null
// Renders 4 sections:
//   1. "Fired Clinical Rules" — table of rule_breakdown entries + contributing_factors labels
//   2. "Business Override Flags" — key: human-readable-description pairs from business_overrides
//   3. "Digital Twin Alerts" — list from twin_alert_reasons (or "Patient is stable")
//   4. "RL Thresholds at Assessment" — table: priority | score range
// Shows Spinner when isLoading
// Shows error card when error is not null
```

---

## 12. Per-Page Specifications

### Login (`src/pages/Login.tsx`)
**Target**: ~150 lines  
**Purpose**: Credential form with role selection  

Must have:
- "AarogyaQ" branding + subtitle
- `username` input (required)
- `password` input with show/hide toggle
- Role selector: `select` dropdown with options Nurse / Doctor / Administrator
- Submit button → `useUIStore.login(username, role)` → `window.location.hash = ROLE_LANDING_PAGES[role]`
- Inline validation: username cannot be empty
- Brief loading state on submit (200ms spinner is fine)

Must NOT have:
- Demo account cards or carousel
- Multi-step fake loading with "Connecting to Hospital Network" etc.
- Any credential bypass visible to users

---

### Dashboard (`src/pages/Dashboard.tsx`)
**Target**: ~150 lines  
**Purpose**: ED status at a glance  

Must have:
- 3 stat cards: Patients Waiting, Critical Count, Stale Alerts
- Stale alert banner if `staleQueue.length > 0`
- Quick action: "Register Patient" → `#/intake`, "Live Queue" → `#/queue`
- 5-second background polling (already implemented — keep)
- Offline banner if `isOffline === true`
- Loading skeleton on first load

Data from: `useQueueStore` (already wired correctly)

---

### LiveQueue (`src/pages/LiveQueue.tsx`)
**Target**: ~220 lines  
**Purpose**: Real-time sortable queue + Digital Twin visual cues (R-DYN-03)

Must have:
- Tab or toggle: Emergency Queue | General Queue
- Sort controls: Wait Time | Risk Score | Pain Level
- Priority filter dropdown
- For each patient row:
  - Name, age, ARQ patient ID
  - `PriorityBadge`
  - Wait time (compute from `registered_at`)
  - Risk score (numeric)
  - `TwinAlertBadge` if `twin.alert_level` is DETERIORATING or CRITICAL_ALERT
  - Yellow chip "⚡ Needs Reassessment" if `visit.needs_reassessment === true`
  - Action buttons: Attending / Completed / Reassess
- Keep existing `getActiveSortValues` twin-aware sort logic (do NOT simplify)

Data from: `useQueueStore`

---

### NurseIntake (`src/pages/NurseIntake.tsx`)
**Target**: ~300 lines  
**Purpose**: Patient registration + triage result with XAI score breakdown

Form fields (single page, no stepper):
- **Patient**: name (required), age (1-120), gender (Male/Female/Other), phone
- **Clinical**: chief complaint (required), pain level (1-10 number), symptoms (checkbox list + custom), existing conditions (checkbox list + custom), symptom duration (hours)
- **Vitals (collapsible, optional)**: SpO2, Heart Rate, Systolic BP, Diastolic BP, Resp Rate, Temperature
- **AI Toggle (R-SED-03)**: Checkbox "Use AI Symptom Mapping" → sets `use_ai: true` in POST body. When checked show note: "Gemini will canonicalize symptom names"

Submit → `usePatientStore.submitIntake(formData)`

On success, show result card:
- Patient ID (ARQ-XXXXXX format)
- Priority badge + color
- Risk score (0-100)
- `score_breakdown` as table: Rule | Points
- `contributing_factors` as bullet list
- If `use_ai` was checked and `confidence_scores` populated: show AI confidence table
- Reset button

Validation: name, chief_complaint required; age 1-120; pain_level 1-10

---

### DoctorDashboard (`src/pages/DoctorDashboard.tsx`)
**Target**: ~280 lines  
**Purpose**: Patient selection + XAI Reasoning Panel (R-XAI-01)

Layout:
- Left pane (~35%): scrollable patient list from emergency + general queue combined
  - Each row: name, priority badge, TwinAlertBadge if deteriorating
  - Click to select
- Right pane (~65%): XAI panel for selected patient
  - Header: patient name, ARQ ID, priority badge, risk score
  - Calls `getExplanation(visitId)` from `src/api/explanation.ts`
  - Renders `<XAIPanel explanation={...} isLoading={...} error={...} />`
  - Action buttons: Mark Attending, Mark Completed, Reassess

Data from: `useQueueStore` (patient list), `getExplanation()` (explanation panel)

---

### ShiftReport (`src/pages/ShiftReport.tsx`)
**Target**: ~250 lines  
**Purpose**: Shift analytics from real `/shift/report` endpoint

Must have:
- Optional date range selector (default: no filter = full history)
- 4 stat tiles: Total Patients, Critical Count, Avg Wait Time (mins), Longest Wait (mins)
- Priority distribution: Recharts `PieChart` or `BarChart` (from `priority_distribution`)
- Department workload: Recharts `BarChart` horizontal (from `department_workload`)
- Queue split: simple `PieChart` (from `queue_distribution`)
- Loading skeleton while fetching
- Error card with retry button on failure

Data from: `getShiftReport()` from `src/api/analytics.ts`

---

### AdminDashboard (`src/pages/AdminDashboard.tsx`)
**Target**: ~280 lines  
**Purpose**: RL agent monitoring (R-RL-04, R-RL-02)

Must have:
- **RL Status card**: Shows `ε = {epsilon}`, Total Updates, note explaining epsilon-greedy policy
- **Active Thresholds table** (from `/rl/thresholds`): Two sub-tables (Emergency / General), each row = Priority | Min Score | Max Score
- **Q-Table Viewer** (R-RL-04): For each state key, show the 5 Q-values as a small bar chart, highlight the max-value action. States are named like `"Emergency|morning|low"`.
- **Reward History** (R-RL-02): Try `getRLHistory()`. On failure (404 expected): show placeholder card "Reward history will appear here once the RL agent has processed completed visits." Do NOT crash.
- Each section loads independently with its own spinner

Data from: `getRLState()`, `getRLThresholds()`, `getRLHistory()` from `src/api/rl.ts`

---

## 13. Constraint Checklist

An implementing model MUST verify all of these before writing code:

- [ ] **Do not touch any file in `backend/`** — backend is complete and must not be modified
- [ ] **Do not add new npm packages** without checking if an equivalent already exists in `package.json`
- [ ] **`simulatedDb.ts` must be deleted**, not imported anywhere
- [ ] **Every API function must throw on error** — no silent fallbacks to fake data
- [ ] **Every page must have a loading state** and a visible error state
- [ ] **The backend must be running** (`uvicorn aarogyaq.main:app --reload`) for real data — this is intended, not a bug
- [ ] **Design tokens from Section 8 apply to all pages** — no per-page color invention
- [ ] **Routing is hash-based** — `window.location.hash = "#/route"` or `<a href="#/route">`
- [ ] **`needs_reassessment` is a field on `visit`**, not on `assessment` or `twin`
- [ ] **`twin` can be `null`** — always guard with `item.twin?.alert_level`
- [ ] **Keep `getActiveSortValues` in LiveQueue.tsx** — do not simplify or remove this twin-aware sort function
- [ ] **`/rl/history` does not exist yet** — wrap in try/catch and show placeholder, do not throw
- [ ] **Visit status transitions**: Waiting → Attending → Completed only
- [ ] **Patient IDs are in `ARQ-XXXXXX` format** (string) — never display raw numeric visit IDs
- [ ] **`score_breakdown` keys are rule IDs** like `"RULE-001"`, values are numeric point contributions
- [ ] **`business_overrides` keys are flag names** like `"MAX_PAIN_OVERRIDE"`, values are full human-readable strings

---

## 14. Session Order

| Session | Deliverables |
|---|---|
| **S1** | Delete 4 pages + `simulatedDb.ts`. Clean all imports. Update router + sidebar to 7-page set. Create `src/api/explanation.ts` and `src/api/rl.ts`. Add `ExplanationData`, `RLState`, `RLThresholds` to `types.ts`. Rewrite `Login.tsx`. |
| **S2** | `Dashboard.tsx` cleanup. `LiveQueue.tsx` + `TwinAlertBadge` component (completes R-DYN-03). |
| **S3** | `NurseIntake.tsx` rewrite (completes R-SED-03 AI toggle). |
| **S4** | `DoctorDashboard.tsx` rewrite + `XAIPanel` component (completes R-XAI-01). |
| **S5** | `ShiftReport.tsx` rewrite. `AdminDashboard.tsx` rewrite (completes R-RL-04, placeholder for R-RL-02). |

Each session ends with `npm run dev` — the app must build and the changed pages must render without console errors.

---

## 15. Running the Stack

**Backend** (must be running for real data):
```bash
cd backend
..\.venv\Scripts\uvicorn aarogyaq.main:app --reload --port 8000
```

**Frontend**:
```bash
cd frontend
npm run dev
# Opens at http://localhost:5173
```

The app at `http://localhost:5173` uses hash routing — navigate via `#/dashboard`, `#/queue`, etc.

