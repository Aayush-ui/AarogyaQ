<div align="center">
  <h1>🏥 AarogyaQ</h1>
  <p><b>AI-Powered Hospital Triage & Queue Management System</b></p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
  [![Streamlit](https://img.shields.io/badge/Streamlit-FF4B4B?style=flat&logo=streamlit&logoColor=white)](https://streamlit.io/)
  [![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue?logo=python&logoColor=white)](https://www.python.org/)
</div>

---

## 📖 What is AarogyaQ?

AarogyaQ is a **Clinical Decision Support System (CDSS)** designed specifically for hospital outpatient and emergency departments. It acts as an intelligent layer between patient intake and clinician care, ensuring that the most critical patients receive immediate attention.

It collects structured patient vitals and free-text symptom descriptions (including informal multi-lingual inputs), runs them through a highly deterministic clinical rule engine, and assigns a reproducible risk score and priority tier:

🟢 **Low** &nbsp;|&nbsp; 🟡 **Medium** &nbsp;|&nbsp; 🟠 **High** &nbsp;|&nbsp; 🔴 **Critical**

> **Note:** AarogyaQ is **not** a diagnosis engine — it never tells a patient what illness they have. Its sole purpose is to surface the right patients to the right care team at the right time, reducing missed deteriorations and queue bottlenecks.

---

## 🏗️ System Architecture

AarogyaQ is built with a strict separation of concerns between its API-driven backend and its interactive frontend.

### ⚙️ Backend Responsibilities (`backend/`)
The backend is a robust Python package powered by **FastAPI** and **SQLAlchemy (SQLite)**. It is the absolute source of truth for all clinical logic and data persistence.

* 🔌 **REST API**: Exposes versioned endpoints (`/api/v1/…`) for patient registration, triage scoring, queue management, and audit trails.
* 🧠 **Deterministic Rule Engine**: Converts patient data into reproducible priority tiers. The same input *always* produces the same output.
* 🤖 **Optional AI Integrations**: Safely delegates **only two tasks** to a local Ollama LLM (`llama3.1:8b`):
  1. Mapping informal, free-text symptoms to canonical clinical terms (`ai_symptom.py`).
  2. Generating plain-language narrative summaries for clinicians (`summary_gen.py`).
* 💾 **Data Persistence**: Stores all records securely in `backend/data/aarogyaq.db` using unified `ARQ-000001` format patient IDs.

👉 **[Read the full Backend Documentation here](backend/docs/README.md)**

### 🖥️ Frontend Responsibilities (`frontend/`)
The frontend is a dynamic, clinician-facing interface built with **Streamlit**.

* 📝 **Patient Intake**: Provides clean forms for registration and vitals entry.
* 📊 **Live Dashboard**: Displays real-time triage queues, intelligently sorted by priority tier and wait time SLA.
* 🩺 **Clinical Summaries**: Presents individual patient profiles, detailing rule-engine rationale and AI-generated narratives for rapid context acquisition.

> **⚠ Strict Architectural Rule:** The `frontend/` **never imports backend modules directly.** All communication between the frontend and backend is executed exclusively via HTTP requests to the FastAPI endpoints.

---

## 🚀 Getting Started

Please see the [Backend Documentation](backend/docs/README.md) for detailed installation instructions, API endpoint references, and clinical/business rule configurations.

### Quick Start (Development)
```bash
# 1. Install Backend
pip install -e backend/

# 2. Start the Backend Server
uvicorn aarogyaq.api:app --reload

# 3. Start the Frontend Application (In a separate terminal)
streamlit run frontend/app.py
```

---

## 🤝 Contributing
We love community contributions! Please review our [Contributing Guidelines](CONTRIBUTING.md) for information on running tests, code style requirements, and commit message formats.

---
<div align="center">
  <i>Built with ❤️ for modern healthcare teams.</i>
</div>
