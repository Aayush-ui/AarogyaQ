# AarogyaQ — AI-Powered Hospital Triage & Queue Management

## What is AarogyaQ?

AarogyaQ is a Clinical Decision Support System (CDSS) designed for hospital outpatient and emergency departments. It collects structured patient vitals and free-text symptom descriptions, runs them through a deterministic clinical rule engine to assign a reproducible risk score and priority tier (Critical / High / Medium / Low), and then presents an explainable, plain-language summary to the attending clinician. AarogyaQ is **not** a diagnosis engine — it never tells a patient what illness they have. Its sole purpose is to surface the right patients to the right care team at the right time, reducing missed deteriorations and queue bottlenecks.

## Backend Responsibilities (`backend/`)

The backend is a Python package built on **FastAPI** and **SQLAlchemy (SQLite)**. It owns all clinical logic and data persistence. Its responsibilities are:
- Exposing a versioned REST API (`/api/v1/…`) for patient registration, vitals ingestion, triage scoring, queue management, and audit retrieval.
- Running the **deterministic rule engine** that converts structured patient data (vitals, chief complaints, flags) into a reproducible priority tier and risk score — the same input always produces the same output.
- Delegating **only two tasks** to the Ollama LLM integration: (a) mapping free-text symptoms to canonical clinical terms (`ai_symptom.py`), and (b) generating the doctor-facing narrative summary (`summary_gen.py`). Both modules fall back silently to deterministic templates when Ollama is unavailable.
- Persisting all patient records, triage events, and audit trails in `backend/data/aarogyaq.db` using `ARQ-000001`-format patient IDs.

## Frontend Responsibilities (`frontend/`)

The frontend is a **Streamlit** application that provides the clinician-facing user interface. Its responsibilities are:
- Rendering patient registration and vitals-entry forms.
- Displaying the live triage queue, sorted by priority tier and wait time.
- Showing individual patient summaries, including the rule-engine rationale and (optionally) the LLM-generated narrative.
- Calling the backend exclusively through **HTTP requests to FastAPI endpoints** — it has no direct access to the database, rule engine, or any backend Python modules.

> **⚠ Import Rule:** `frontend/` **never imports backend modules directly.** All communication between the frontend and backend is through the FastAPI HTTP API only.
