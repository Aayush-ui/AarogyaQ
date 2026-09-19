# Running AarogyaQ Locally

A step-by-step developer and clinician guide to setting up, running, and testing the AarogyaQ CDSS and Smart Emergency Department platform.

---

## 1. System Requirements

* **Operating System**: Windows 10/11, macOS, or Linux
* **Python**: 3.10 or higher
* **Node.js**: v18.0 or higher (with `npm` v9+)
* **Ollama** *(Optional)*: Local LLM service (`llama3.1:8b`) for AI symptom mapping and natural language summary rephrasing.

---

## 2. Architecture & Directory Overview

```
AarogyaQ/
├── backend/                  # FastAPI REST + SSE API
│   ├── src/aarogyaq/         # Core package: clinical rules, digital twin, RL bandit, models
│   ├── data/                 # SQLite database (`hospital.db`) & persisted Q-table
│   ├── config/               # JSON clinical rules, business overrides, synonyms
│   └── tests/                # Comprehensive pytest suite (161+ tests)
├── frontend/                 # React 19 + TypeScript + Vite + Tailwind/Vanilla CSS
│   ├── src/pages/            # 7 views: Login, Dashboard, Queue, Intake, Doctor, Shift, Admin
│   ├── src/components/       # Modular UI, XAIPanel, Explainability, Digital Twin badges
│   ├── src/store/            # Zustand stores: usePatientStore, useQueueStore, useUIStore
│   └── src/api/              # Typed Axios HTTP & SSE streaming clients
└── config/                   # Global application configuration
```

---

## 3. Installation & Setup

### Step 1: Clone the Repository
```bash
git clone <repository_url>
cd AarogyaQ
```

### Step 2: Backend Environment Setup
Create and activate a virtual environment, then install the package in editable mode:

**On Windows (PowerShell):**
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e .[dev]
```

**On macOS / Linux:**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
```

### Step 3: Frontend Environment Setup
Open a new terminal window in the project root:
```bash
cd frontend
npm install
```

---

## 4. Starting the Application

### 🚀 1-Click Launch (Recommended for Windows)
You can launch both the backend, frontend, and open the browser with a single double-click:
* **Double-click `start_aarogyaq.bat`** in the project root.
  - Automatically starts FastAPI on port 8000.
  - Automatically starts Vite on port 3000.
  - Automatically launches Chrome / default browser straight to `http://localhost:3000`.
* **To stop all services**: Double-click `stop_aarogyaq.bat`.

---

### Manual Launch (Terminal by Terminal)

#### A. Start the Backend API Server
Ensure the Python virtual environment is active:
```bash
cd backend
python -m uvicorn aarogyaq.api:app --host 127.0.0.1 --port 8000 --app-dir src --reload
```
* **API Base**: [http://localhost:8000](http://localhost:8000)
* **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)
* **Interactive Swagger Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **Alternative ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### B. Start the Frontend Development Server
In your frontend terminal:
```bash
cd frontend
npm run dev
```
* **Web App URL**: [http://localhost:3000](http://localhost:3000)

### C. (Optional) Start Ollama for Local AI Inference
If you want to use the optional LLM-assisted symptom mapping during nurse intake:
1. Start the daemon:
   ```bash
   ollama serve
   ```
2. Pull the medical-grade language model:
   ```bash
   ollama pull llama3.1:8b
   ```
*If Ollama is not running, AarogyaQ automatically falls back to deterministic clinical rules and synonym mapping with zero errors.*

---

## 5. Quick Demo Credentials & Roles

AarogyaQ enforces Role-Based Access Control (RBAC) backed by real JWT tokens. On the login screen (`http://localhost:3000`), you can click any of the **Quick Demo Profile** buttons or type credentials:

| Role | Email | Password | Allowed Navigation Areas |
| :--- | :--- | :--- | :--- |
| **Physician (Doctor)** | `doctor@aarogyaq.org` | `doctor123` | Doctor Console, Live Queue, Clinical Audit Dossier |
| **Triage Nurse** | `nurse@aarogyaq.org` | `nurse123` | Nurse Intake Form, Live Queue, Vitals Reassessment |
| **Administrator** | `admin@aarogyaq.org` | `admin123` | Full Access: Admin Console, RL Bandit, Shift Ledger, Queues |

---

## 6. End-to-End Clinical Triage Walkthrough

Try the core clinical decision support workflow:

1. **Patient Intake (`#/intake`)**:
   - Log in as **Triage Nurse**.
   - Enter patient demographics, chief complaint (e.g., `"severe chest pain radiating to jaw"`), pain scale, and vitals.
   - Click **Run Clinical Triage Assessment**. Review the real-time risk score, priority assignment, and mapped symptoms.
2. **Live Queue & Digital Twin (`#/queue`)**:
   - Navigate to the Queue. Observe the split between **Emergency Care Stream** and **General Care Stream**.
   - Click **Clinical Audit** on any patient card to inspect the fired rule breakdown and physiological deterioration trajectory.
   - Click **Intake Action** to record mid-visit vitals (SpO2, BP, HR) and observe dynamic re-triage.
3. **Doctor Console & XAI Dossier (`#/doctor`)**:
   - Switch to **Physician** role and open Doctor Console.
   - Click on a patient from the queue to load their comprehensive **Explainable AI (XAI) Panel**:
     - Dynamic Risk Score (`/100`)
     - Assigned Priority Tier
     - Fired Layer 2 Clinical Rules
     - Layer 3 Safety Override Flags
     - Digital Twin physiological warning flags
     - Active RL Bandit Threshold Cutoffs
   - Issue CPOE orders (medications, laboratory orders, bedside radiology) and update patient status (`Attending` -> `Completed`).
4. **Shift Summary & Ledger (`#/shift`)**:
   - View aggregated shift metrics: Total Registries, Critical Cases, Average and Longest Wait Times.
   - Inspect the Triage Level Distribution, Department Workload, and Care Stream Split charts.
   - Click **Export CSV** to download a certified shift audit ledger.
5. **RL Bandit Control Center (`#/admin`)**:
   - Inspect the learned Q-table matrix, epsilon exploration decay, and reward convergence curves.

---

## 7. Keyboard Shortcuts & UI Themes

* **Theme Toggle**: Click the Sun/Moon icon in the top navigation bar to toggle between **Dark Mode** (Clean Midnight Slate `#0A0C12`) and **Light Mode** (Clinical White `#F8FAFC`).
* **Navigation Hotkeys**:
  * `Alt + D`: Switch to Main Desk (`#/dashboard`)
  * `Alt + S`: Switch to Live Queue (`#/queue`)
  * `Alt + N`: Switch to Nurse Intake (`#/intake`)

---

## 8. Verification & Testing Commands

### Backend Automated Test Suite
Ensure the backend virtual environment is active:
```bash
cd backend
pytest -q
```
*Expected: `161 passed` with zero failures.*

### Frontend Typecheck & Production Build
```bash
cd frontend

# TypeScript strict type checking
npx tsc --noEmit

# Production bundle compilation
npm run build
```

---

## 9. Troubleshooting & Common Questions

| Issue | Cause | Resolution |
| :--- | :--- | :--- |
| **Port 8000 already in use** | An existing background server is running | Run uvicorn on another port: `uvicorn aarogyaq.api:app --port 8001` and update `VITE_API_URL` in `frontend/.env` if configured. |
| **Port 3000 already in use** | Another frontend instance is open | Vite will automatically suggest port 3001. You can access the app at `http://localhost:3001`. |
| **`ModuleNotFoundError: No module named 'aarogyaq'`** | Package not installed in editable mode | Activate your virtual environment and run `pip install -e .` from `backend/`. |
| **Database out of sync or locked** | Corrupted development SQLite file | Stop uvicorn, remove `backend/data/hospital.db`, and restart uvicorn. The database will cleanly re-initialize and seed departments automatically. |
| **Ollama connection refused** | Ollama is stopped or not installed | AarogyaQ works 100% deterministically without Ollama. You can either leave "Use AI" unchecked or start Ollama with `ollama serve`. |
