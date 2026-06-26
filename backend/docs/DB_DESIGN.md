# AarogyaQ — Database Design

> **Status:** FINAL — column names, types, and constraints defined here are
> canonical. Every later implementation step (models, migrations, API schemas)
> **must** reuse these names verbatim. No renaming without an explicit DB
> design revision.

---

## Storage

| Property | Value |
|---|---|
| Engine | SQLite 3 |
| File path | `backend/data/aarogyaq.db` |
| ORM | SQLAlchemy (declarative base) |
| Naming convention | `lowercase_underscore` for all tables and columns |
| Patient ID format | `ARQ-000001` (zero-padded 6-digit autoincrement, prefixed `ARQ-`) |

---

## Tables

### 1. `patients`

Stores one record per unique patient. A patient may have many visits over time.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `patient_id` | `VARCHAR` | **PRIMARY KEY** | Format: `ARQ-000001` |
| `name` | `VARCHAR` | `NOT NULL` | Full name of patient |
| `age` | `INTEGER` | `NOT NULL` | Age in years at time of registration |
| `gender` | `VARCHAR` | `NOT NULL` | Allowed values: `"Male"` / `"Female"` / `"Other"` |
| `phone` | `VARCHAR` | nullable | Used for history lookup; not unique-constrained |
| `created_at` | `DATETIME` | `NOT NULL`, `DEFAULT now` | UTC timestamp of first registration |

---

### 2. `visits`

Stores one record per patient visit/encounter. A single patient may have
multiple visits on different dates.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `visit_id` | `INTEGER` | **PRIMARY KEY AUTOINCREMENT** | |
| `patient_id` | `VARCHAR` | `NOT NULL`, **FK → `patients.patient_id`** | |
| `visit_timestamp` | `DATETIME` | `NOT NULL`, `DEFAULT now` | UTC time the visit was opened |
| `chief_complaint` | `TEXT` | `NOT NULL` | Free-text entry by nurse |
| `pain_level` | `INTEGER` | `NOT NULL` | Scale 1–10 |
| `symptom_duration` | `INTEGER` | nullable | Duration in **minutes** |
| `existing_conditions` | `TEXT` | nullable | JSON-serialised `list[str]` of condition labels |
| `queue_type` | `VARCHAR` | `NOT NULL` | `"Emergency"` or `"General"` |
| `status` | `VARCHAR` | `NOT NULL` | `"Waiting"` / `"Attending"` / `"Completed"` |
| `department_assigned` | `VARCHAR` | nullable | Null until the visit is routed |
| `attended_at` | `DATETIME` | nullable | UTC time doctor began attending |
| `completed_at` | `DATETIME` | nullable | UTC time visit was closed |

---

### 3. `assessments`

Stores the triage engine output for a visit. A new row is inserted for every
reassessment (`is_reassessment = True`), so there may be multiple rows per
`visit_id`. The **most recent** row for a given `visit_id` is the active
assessment.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `assessment_id` | `INTEGER` | **PRIMARY KEY AUTOINCREMENT** | |
| `visit_id` | `INTEGER` | `NOT NULL`, **FK → `visits.visit_id`** | |
| `raw_symptoms` | `TEXT` | `NOT NULL` | Original free-text chief complaint |
| `mapped_symptoms` | `TEXT` | nullable | JSON-serialised `list[str]` of canonical clinical terms |
| `confidence_scores` | `TEXT` | nullable | JSON-serialised `dict[str, float]` — term → confidence |
| `risk_score` | `FLOAT` | `NOT NULL` | Deterministic numeric score from rule engine |
| `priority_level` | `VARCHAR` | `NOT NULL` | `"Critical"` / `"High"` / `"Medium"` / `"Low"` |
| `score_breakdown` | `TEXT` | `NOT NULL` | JSON-serialised `list[dict]` of fired rule objects |
| `contributing_factors` | `TEXT` | `NOT NULL` | JSON-serialised `list[str]` of human-readable factor labels |
| `business_rule_flags` | `TEXT` | nullable | JSON-serialised `list[str]` of override flag strings |
| `assessed_at` | `DATETIME` | `NOT NULL`, `DEFAULT now` | UTC timestamp of assessment |
| `is_reassessment` | `BOOLEAN` | `NOT NULL`, `DEFAULT False` | `True` for any assessment after the first |

---

### 4. `doctor_summaries`

Stores the generated narrative for each visit. The `UNIQUE` constraint on
`visit_id` ensures at most one active summary per visit (regeneration replaces
the row).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `summary_id` | `INTEGER` | **PRIMARY KEY AUTOINCREMENT** | |
| `visit_id` | `INTEGER` | `NOT NULL`, `UNIQUE`, **FK → `visits.visit_id`** | One summary per visit |
| `summary_text` | `TEXT` | `NOT NULL` | Plain-language narrative for the clinician |
| `generated_at` | `DATETIME` | `NOT NULL`, `DEFAULT now` | UTC timestamp of generation |

---

### 5. `audit_logs`

Append-only log of all state-changing events. Never updated or deleted.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `log_id` | `INTEGER` | **PRIMARY KEY AUTOINCREMENT** | |
| `visit_id` | `INTEGER` | nullable, **FK → `visits.visit_id`** | Null for system-level events not tied to a visit |
| `actor` | `VARCHAR` | `NOT NULL` | `"nurse"` / `"doctor"` / `"system"` |
| `action` | `VARCHAR` | `NOT NULL` | e.g. `"REGISTERED"`, `"ASSESSED"`, `"REASSESSED"`, `"ROUTED"`, `"COMPLETED"` |
| `notes` | `TEXT` | nullable | Free-text context for the event |
| `logged_at` | `DATETIME` | `NOT NULL`, `DEFAULT now` | UTC timestamp |

---

### 6. `departments`

Reference table listing hospital departments and their current availability.
Standalone — not foreign-keyed from other tables (department name is stored
as a plain string in `visits.department_assigned`).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `dept_id` | `INTEGER` | **PRIMARY KEY AUTOINCREMENT** | |
| `name` | `VARCHAR` | `NOT NULL`, `UNIQUE` | e.g. `"Cardiology"`, `"Emergency"` |
| `status` | `VARCHAR` | `NOT NULL`, `DEFAULT "Available"` | `"Available"` / `"Busy"` / `"Full"` |
| `updated_at` | `DATETIME` | `NOT NULL`, `DEFAULT now` | UTC timestamp of last status change |

---

## Relationships

```
patients  ──< visits >──── assessments   (one visit → many assessments; latest = active)
                    └────  doctor_summaries  (one visit → exactly one summary)
                    └────< audit_logs         (one visit → many log entries)

departments  (standalone reference table)
```

| Relationship | Cardinality | Notes |
|---|---|---|
| `patients` → `visits` | **1 : N** | One patient, many visits over time |
| `visits` → `assessments` | **1 : N** | One per triage + one per reassessment; latest row is active |
| `visits` → `doctor_summaries` | **1 : 1** | Enforced by `UNIQUE(visit_id)` |
| `visits` → `audit_logs` | **1 : N** | Append-only event log |
| `departments` | standalone | Referenced by name string in `visits.department_assigned` |

---

## JSON Column Conventions

Several columns store structured data serialised as JSON strings (SQLite has
no native array/map type). The expected Python types after deserialisation are:

| Column | Table | Deserialised type |
|---|---|---|
| `existing_conditions` | `visits` | `list[str]` |
| `mapped_symptoms` | `assessments` | `list[str]` |
| `confidence_scores` | `assessments` | `dict[str, float]` |
| `score_breakdown` | `assessments` | `list[dict]` |
| `contributing_factors` | `assessments` | `list[str]` |
| `business_rule_flags` | `assessments` | `list[str]` |

---

## Patient ID Generation

`patient_id` values are **not** SQLite autoincrement integers. They are
application-generated strings following this format:

```
ARQ-{n:06d}
```

where `n` is the next available sequence number derived from
`SELECT COUNT(*) FROM patients` + 1, or from a dedicated sequence counter.
The backend service layer is responsible for generating and validating this
format before any insert.

---

*Last revised: Step DB-1 (repo scaffold). No code exists yet.*
