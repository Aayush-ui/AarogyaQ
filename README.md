<div align="center">
  <h1>🏥 AarogyaQ</h1>
  <p><b>AI-Powered Hospital Triage & Queue Management System</b></p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
  [![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue?logo=python&logoColor=white)](https://www.python.org/)
</div>

---

## 📖 What is AarogyaQ?

AarogyaQ is a **Clinical Decision Support System (CDSS)** and **Command Center** designed specifically for hospital outpatient and emergency departments. It acts as an intelligent, real-time layer between patient intake and clinician care, ensuring that the most critical patients receive immediate attention.

It collects structured patient vitals and free-text symptom descriptions (supporting informal multilingual/Hinglish/Gujarati inputs), runs them through a highly deterministic clinical rule engine, and assigns a reproducible risk score and priority tier:

🟢 **Low** &nbsp;|&nbsp; 🟡 **Medium** &nbsp;|&nbsp; 🟠 **High** &nbsp;|&nbsp; 🔴 **Critical**

Beyond static scoring, AarogyaQ optimizes hospital operations via a **Reinforcement Learning (RL) agent** that dynamically adjusts priority thresholds to balance patient flow, and a **Digital Twin simulator** that predicts patient wait times and alerts clinicians to potential physiological deterioration.

> **Note:** AarogyaQ is **not** a diagnosis engine — it never tells a patient what illness they have. Its sole purpose is to surface the right patients to the right care team at the right time, reducing missed deteriorations, mitigating bottlenecks, and maintaining wait-time SLAs.

---

## ✨ Core Features

* **⚖️ Deterministic Clinical Rules Engine**: Evaluates 15+ complex clinical rules (such as cardiac distress, sepsis indicators, stroke symptoms) against vitals and complaints to calculate reproducible patient risk scores. Configured fully via `backend/config/clinical_rules.json`.
* **🛑 Safety-Critical Business Overrides**: Implements high-priority overrides (e.g., pain score of 10, elderly cardiac presentation, severe pediatric neuro symptoms) that instantly override base scores to force immediate clinical escalation.
* **🤖 Gated AI Integration**: Safely delegates language processing tasks to a local Ollama LLM (`llama3.1:8b`):
  1. Standardizing informal, multilingual free-text complaints to canonical clinical symptoms (`ai_symptom.py`).
  2. Generating clear clinical narrative summaries to speed up doctor hand-offs (`summary_gen.py`).
* **🧠 Reinforcement Learning Optimization**: A Q-learning feedback agent (`rl_agent.py`) that monitors queue length and treatment latency to dynamically tune clinical triage boundaries, ensuring the department adapts to resource constraints without manual intervention.
* **🔮 Predictive Digital Twin Simulation**: Simulates the active queue state machine (`digital_twin.py`) to estimate real-time projected wait times for each patient, monitoring deterioration risks if a patient sits too long in the queue.
* **🖥️ Clinician-Specific Interfaces**: Tailored React dashboards for different roles:
  * **Nurse Intake**: Direct vitals documentation, demographic registration, and symptom standardisation.
  * **Doctor Workspace (CPOE)**: Comprehensive Physician order entry for clinical notes, medications, lab tests, radiology scans, and bed allocation.
  * **Command Center & Admin**: Live operational queues, department capacity status controllers, and RL agent state visualization.

---

## 🏗️ System Architecture

AarogyaQ is built with a strict separation of concerns between its API-driven backend and its interactive frontend.

### ⚙️ Backend Responsibilities (`backend/`)
The backend is a robust Python package powered by **FastAPI** and **SQLAlchemy (SQLite)**. It is the absolute source of truth for all clinical logic, intelligence agents, and data persistence.

* 🔌 **REST API**: Exposes endpoints for patient registration, triage scoring, queue management, clinical notes, order entries, and audit trails.
* 🧠 **RL Agent & Digital Twin**: Houses the state-machine modeling (`digital_twin.py`) and reinforcement learning logic (`rl_agent.py`).
* 💾 **Data Persistence**: Stores records securely in `backend/data/aarogyaq.db` using unified `ARQ-000001` format patient IDs.

👉 **[Read the full Backend Documentation here](backend/docs/README.md)**

### 🖥️ Frontend Responsibilities (`frontend/`)
The frontend is a dynamic, high-density React application built with **React 19, TypeScript, Vite, Tailwind CSS v4, Motion, Recharts, and Zustand**.

* 📊 **Real-time Dashboards**: Interactive interfaces mapping active patient queues, live workload metrics, and departmental capacities.
* 🩺 **Clinical Command Panel**: Clinical interfaces for order entries (medication, lab, radiology), patient transfers, bed assignments, and timeline audits.
* 💾 **Hybrid API Adapter**: Integrates directly with the FastAPI endpoints, featuring a fallback to a fully operational local simulator (`simulatedDb.ts`) for standalone demonstration mode.

> **⚠ Strict Architectural Rule:** The frontend **never imports backend modules directly.** All communication between the frontend and backend is executed exclusively via HTTP requests to the FastAPI endpoints.

---

## 🚀 Getting Started

To run AarogyaQ locally, follow these steps to set up both the backend and frontend.

### Prerequisites
Before starting, ensure you have the following installed:
* **Python 3.11+**
* **Node.js (v18+) & npm**
* **Ollama** (optional, for local clinical AI summarization and symptom mapping)

---

### Step-by-Step Setup

#### 1. Backend Setup & Run
Open a terminal and navigate to the backend directory:
```bash
# Navigate to the backend directory
cd backend

# Create and activate a Python virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install the backend package in editable mode with development dependencies
pip install -e .[dev]

# Initialize and seed the SQLite database
python -c "from aarogyaq.database import init_db, seed_departments; init_db(); seed_departments()"

# Start the FastAPI server
uvicorn aarogyaq.api:app --reload
```
The backend API will be available at [http://localhost:8000](http://localhost:8000). You can explore the interactive Swagger documentation at [http://localhost:8000/docs](http://localhost:8000/docs).

#### 2. Frontend Setup & Run
Open a second terminal window/tab:
```bash
# Navigate to the frontend directory
cd frontend

# Install Node dependencies
npm install

# Start the frontend dev server
npm run dev
```
The React frontend will start and be accessible at [http://localhost:3000](http://localhost:3000) (or the port specified in your console).

#### 3. AI Capabilities with Ollama (Optional)
If you wish to use the local LLM integration for clinical summaries and chief complaint standardisation:
```bash
# Start the local Ollama service
ollama serve

# Pull the required clinical/reasoning model (in a separate terminal)
ollama pull llama3.1
```
Make sure the local FastAPI server has access to the Ollama endpoint (default: `http://localhost:11434`).

---

## 🔍 Detailed Guides & References

For comprehensive details on specific sub-components, configuration variables, database architecture, or testing protocols, refer to the individual documents:

* 📖 **[Full Project Launch & Setup Guide](RUN_PROJECT.md)** - Detailed environment setups, port management, and advanced troubleshooting.
* ⚙️ **[Backend Operations & Config Reference](backend/docs/README.md)** - Explains how to add new clinical/business rules dynamically via JSON, configure Ollama models, and review priority thresholds.
* 💾 **[Database Architecture Design](backend/docs/DB_DESIGN.md)** - Detailed breakdown of schemas, patient indexing (unified `ARQ-000001` format), audit logs, and status state machines.
* 🖥️ **[Frontend Architecture & Integration](frontend/README.md)** - Full clinician command center layout, Zustand stores structure, high-density visualization components, and integration parameters.


---

## 🤝 Contributing
We love community contributions! Please review our [Contributing Guidelines](CONTRIBUTING.md) for information on running tests, code style requirements, and commit message formats.

---
<div align="center">
  <i>Built with ❤️ for modern healthcare teams.</i>
</div>
