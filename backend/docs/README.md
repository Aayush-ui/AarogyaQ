# AarogyaQ - Emergency Triage System Backend

AarogyaQ is a highly deterministic, AI-assisted emergency triage and patient queue management system designed for clinical environments. It standardizes mixed-language free-text patient complaints (including Hinglish and Gujarati) into structured medical findings, evaluates them against a robust set of deterministic clinical and business rules to assign severity and risk, and routes patients to the appropriate department queues. Artificial Intelligence is strictly gated behind optional flags to preserve absolute determinism in priority assignments while providing deep linguistic processing and human-readable summaries when requested.

## Installation

```bash
pip install -e backend/
ollama pull llama3.1:8b
ollama serve
# In a new terminal window:
python -c "from aarogyaq.database import init_db, seed_departments; init_db(); seed_departments()"
uvicorn aarogyaq.api:app --reload
# React Frontend (Setup instructions TBD)
```
*(Note: `ollama serve` must be kept running in the background for AI features to work).*

## API Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/patients/register` | Register a new patient and perform initial triage |
| `GET` | `/queue/emergency` | Retrieve the list of patients in the Emergency queue |
| `GET` | `/queue/general` | Retrieve the list of patients in the General OPD queue |
| `GET` | `/queue/stale` | Retrieve patients who have been waiting beyond SLA thresholds |
| `PATCH` | `/visits/{visit_id}/status` | Update a visit's status (e.g., Attending, Completed) |
| `POST` | `/visits/{visit_id}/reassess` | Re-evaluate priority based on new/updated symptom severity |
| `GET` | `/patients/{patient_id}/history` | Retrieve a specific patient's visit and assessment history |
| `GET` | `/shift/report` | Generate aggregated statistics for visits within a time window |
| `PATCH` | `/departments/{dept_name}/status` | Update department capacity status (Available, Busy, Full) |
| `GET` | `/departments` | List all departments and their current operational status |
| `GET` | `/health` | API and database health check |

## Clinical Rules Reference

Deterministic Layer 2 clinical rules mapped to base score modifiers.

| Rule ID | Label |
| --- | --- |
| `RULE-001` | Cardiac-Respiratory Emergency |
| `RULE-002` | Cardiac High-Risk Comorbidity |
| `RULE-003` | Neurological Emergency |
| `RULE-004` | Severe Pain |
| `RULE-005` | Chest Pain Unspecified |
| `RULE-006` | Respiratory Distress |
| `RULE-007` | Sepsis Indicator |
| `RULE-008` | Active Seizure |
| `RULE-009` | Stroke Symptoms |
| `RULE-010` | Obstetric Concern |
| `RULE-011` | Trauma Head |
| `RULE-012` | Active Haemorrhage |
| `RULE-013` | GI Distress with Dehydration |
| `RULE-014` | Anaphylaxis Risk |
| `RULE-015` | Elderly Cardiac Concern |

## Business Rules Reference

Hard overrides applied post-scoring for organizational policies.

| Flag | Trigger Condition | Override Action |
| --- | --- | --- |
| `ELDERLY_CARDIAC_CRITICAL` | Age > 70 AND includes `chest_pain` | Force priority to Critical |
| `PEDIATRIC_NEURO_CRITICAL` | Age < 5 AND includes `loss_of_consciousness` | Force priority to Critical |
| `MAX_PAIN_OVERRIDE` | Pain Level == 10 | Minimum priority set to High |
| `PREGNANCY_HIGH_RISK` | Includes `pregnancy` AND Pain Level >= 6 | Force priority to High |
| `ANAPHYLAXIS_IMMEDIATE` | Includes `allergic_reaction_severe` | Force priority to Critical |

## Priority Thresholds

The base score calculated from clinical factors maps to the following bounds:

| Priority Level | Score Range |
| --- | --- |
| **Low** | 0 - 25 |
| **Medium** | 26 - 50 |
| **High** | 51 - 75 |
| **Critical** | 76 - 100 |

## How to Add New Clinical Rules
To add new clinical rules, **you do not need to change any Python code.** 
Simply add a new JSON object to `backend/config/clinical_rules.json`. The rule engine will dynamically load and evaluate it at runtime based on the `conditions`, `operator` (AND/OR), and `score`.

## How to Replace the Ollama Model
The system is currently configured to use `llama3.1:8b`. To swap the underlying LLM:
1. Ensure the new model is pulled locally via `ollama pull <model_name>`
2. Edit the `OLLAMA_MODEL` constant in exactly two files:
   - `backend/src/aarogyaq/ai_symptom.py`
   - `backend/src/aarogyaq/summary_gen.py`

## Architecture Deviations
* **AI Module Isolation**: While initial playbook guidance restricted AI to exactly one module per package (`explainer.py`), deep NLP triage parsing requirements necessitated AI usage across two distinct functional boundaries: `ai_symptom.py` (for mapping raw multi-lingual symptoms to canonical terms) and `summary_gen.py` (for generating clinical hand-off text). Both modules strictly enforce the `use_ai` gate to preserve default deterministic behavior.
