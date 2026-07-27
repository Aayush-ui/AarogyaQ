# Running AarogyaQ Locally

This guide provides step-by-step instructions for setting up and running the AarogyaQ full-stack application from scratch.

## 1. Prerequisites

Ensure you have the following installed on your machine:
- **OS**: Windows, macOS, or Linux
- **Node.js**: v18.0 or higher
- **npm**: v9.0 or higher (comes with Node.js)
- **Python**: v3.10 or higher
- **Ollama**: For running the local neural triage LLM model (`llama3.1:8b`)

## 2. Project Structure

- **`frontend/`**: Contains the React application powered by Vite, Zustand, Recharts, and styled with Vanilla CSS.
  - Features a clean 7-page layout: Login, Dashboard, Live Queue, Nurse Intake, Doctor Dashboard, Shift Report, and Admin Dashboard.
  - Communicates directly with the backend; all mock databases and catch fallbacks have been eliminated.
- **`backend/`**: Contains the FastAPI backend application and pytest test suites.
  - **`backend/src/aarogyaq/`**: The main Python package holding models, routes, rules engine, and RL bandit logic.
  - **`backend/data/`**: Directory where the SQLite database (`hospital.db`) is automatically initialized.
  - **`backend/config/`**: Configuration JSON files holding clinical rules, override parameters, and symptom synonym dictionaries.

## 3. Installation

### Clone the Repository
```bash
git clone <repository_url>
cd AarogyaQ
```

### Backend Setup
We recommend using a standard Python virtual environment.

```bash
# Navigate to backend directory
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
.\venv\Scripts\activate

# Install dependencies in editable mode, including development dependencies
pip install -e .[dev]
```

### Frontend Setup
```bash
# Navigate to frontend directory from project root
cd frontend

# Install Node dependencies
npm install
```

## 4. Running the Backend

Make sure your virtual environment is active.
```bash
cd backend
# Run server via uvicorn
uvicorn aarogyaq.api:app --reload
```
The backend will start and be accessible at `http://localhost:8000`. The SQLite database will be initialized automatically upon the first request.

## 5. Running the Frontend

```bash
cd frontend
npm run dev
```
The frontend Vite dev server will start and be accessible at `http://localhost:3000`.

## 6. Running Ollama (For AI Symptom Mapping)

If you check the "Use AI Symptom Mapping" box during nurse patient intake:

1. Start the Ollama local service:
   ```bash
   ollama serve
   ```
2. Pull the required model:
   ```bash
   ollama pull llama3.1:8b
   ```
3. Verify it is running by checking `http://localhost:11434`. The backend will communicate with it automatically at runtime when `use_ai=True` is requested.

## 7. Startup Order Summary

For a smooth startup, follow this exact order:

1. **Ollama**: Start `ollama serve` (if utilizing the AI mapping features).
2. **Backend**: Start the FastAPI server (`uvicorn aarogyaq.api:app --reload`). Verify it's running by visiting `http://localhost:8000/health`.
3. **Frontend**: Start the React server (`npm run dev`). Access the client dashboard at `http://localhost:3000`.

## 8. Preview URLs

Once everything is running, you can access the following local URLs:

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **Backend API Base**: [http://localhost:8000](http://localhost:8000)
- **Backend Health Check**: [http://localhost:8000/health](http://localhost:8000/health)
- **Interactive API Docs (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Alternative API Docs (ReDoc)**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

## 9. Test Commands

### Backend
To run unit and integration tests, ensure your virtual environment is active:
```bash
cd backend
pytest -q
```

### Frontend
To run type checking and validation compile:
```bash
cd frontend
npm run build
```

## 10. Troubleshooting

- **Port 8000 in use**: Ensure no other services are running on port 8000. To run on a different port: `uvicorn aarogyaq.api:app --port 8001`. (Update the `API_BASE_URL` in `frontend/src/api/client.ts` accordingly).
- **Python module not found**: Make sure you have activated your virtual environment and installed the backend package in editable mode (`pip install -e .`).
- **Database lock or schema errors**: If you encounter SQLite locking issues or schema mismatches, delete the `.db` file in `backend/data/` (if it exists) and restart the FastAPI server to recreate it.
- **Ollama connection refused**: Ensure `ollama serve` is running. If it is running on a different port or machine, update the `OLLAMA_URL` in `backend/src/aarogyaq/ai_symptom.py`.
