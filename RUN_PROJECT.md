# Running AarogyaQ Locally

This guide provides step-by-step instructions for setting up and running the AarogyaQ full-stack application from scratch.

## 1. Prerequisites

Ensure you have the following installed on your machine:
- **OS**: Windows, macOS, or Linux
- **Node.js**: v18.0 or higher
- **npm**: v9.0 or higher (comes with Node.js)
- **Python**: v3.10 or higher
- **Git**: For version control
- **Ollama**: (Optional) For local LLM capabilities, if enabled

## 2. Project Structure

- **`frontend/`**: Contains the React application powered by Vite, TailwindCSS, and Zustand.
- **`backend/`**: Contains the FastAPI backend application and tests.
  - **`backend/src/aarogyaq/`**: The main Python package holding models, routes, and business logic.
  - **`backend/data/`**: Directory where the SQLite database (`hospital.db`) is automatically created.
  - **`backend/config/`**: Configuration files (e.g., rules engine configs).
  - **`backend/docs/`**: Backend-specific documentation.

## 3. Installation

### Clone the Repository
```bash
git clone <repository_url>
cd AarogyaQ
```

### Backend Setup
We recommend using a standard Python virtual environment. (If you prefer `poetry`, you can use `poetry install`).

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

## 4. Environment Variables

Create a `.env` file in the `frontend/` directory based on the provided `.env.example`. 

**Sample `frontend/.env`:**
```env
# Required for Gemini AI API calls (if using Google's AI endpoints)
GEMINI_API_KEY=your_secret_key_here

# The URL of the FastAPI backend API
VITE_API_BASE_URL=http://localhost:8000

# Optional direct Ollama backend connection for local LLM routing
VITE_OLLAMA_BASE_URL=http://localhost:11434
```

*Note: The backend currently reads SQLite by default and does not require complex environment setup for a standard run.*

## 5. Running the Frontend

```bash
cd frontend
npm run dev
```
The frontend will start and be accessible at `http://localhost:3000`.

## 6. Running the Backend

Make sure your virtual environment is active.
```bash
cd backend
# With standard venv:
uvicorn aarogyaq.api:app --reload

# Or with poetry (if you used poetry to install):
poetry run uvicorn aarogyaq.api:app --reload
```
The backend will start and be accessible at `http://localhost:8000`. The SQLite database will be initialized automatically upon the first request.

## 7. Running Ollama (if enabled)

If you plan to use local AI models instead of cloud APIs:

1. Start the Ollama service:
   ```bash
   ollama serve
   ```
2. Pull the required model (e.g., Llama 3):
   ```bash
   ollama run llama3.1
   ```
3. Verify it is running by checking `http://localhost:11434`.

## 8. Running the Entire Project (Startup Order)

For a smooth startup, follow this exact order:

1. **Database**: Not required. SQLite initializes automatically.
2. **Ollama (Optional)**: Start `ollama serve` if you are using local AI models.
3. **Backend**: Start the FastAPI server (`uvicorn aarogyaq.api:app --reload`). Verify it's running by visiting `http://localhost:8000/health`.
4. **Frontend**: Start the React server (`npm run dev`). Verify it's running by visiting `http://localhost:3000`.

## 9. Preview URLs

Once everything is running, you can access the following local URLs:

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **Backend API Base**: [http://localhost:8000](http://localhost:8000)
- **Backend Health Check**: [http://localhost:8000/health](http://localhost:8000/health)
- **Interactive API Docs (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Alternative API Docs (ReDoc)**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

## 10. Test Commands

### Backend
To run unit and integration tests, ensure your virtual environment is active:
```bash
cd backend
pytest -q
```

### Frontend
To run linting and type checking:
```bash
cd frontend
npm run lint
```

## 11. Build Commands

### Frontend Production Build
```bash
cd frontend
npm run build
```
This generates static files in the `frontend/dist/` directory, which can be served by Nginx, Apache, or any static file host.

### Backend Production Build
Python applications are not "built" in the same way as React apps. For production, run the application using a production ASGI server with multiple workers (e.g., Gunicorn with Uvicorn workers) and omit the `--reload` flag:
```bash
gunicorn aarogyaq.api:app -w 4 -k uvicorn.workers.UvicornWorker
```

## 12. Troubleshooting

- **Port 8000 in use**: Ensure no other services (like other FastAPI apps) are running on port 8000. To run on a different port: `uvicorn aarogyaq.api:app --port 8001`. (Remember to update `VITE_API_BASE_URL` in the frontend `.env`).
- **Python module not found**: Make sure you have activated your virtual environment and installed the backend as a package (`pip install -e .`).
- **Vite host error**: `npm run dev` uses `--host=0.0.0.0`. If you face binding issues on Windows, you can omit the `--host` flag or ensure your firewall allows it.
- **Database issues**: If you encounter SQLite locking issues or schema mismatches, delete the `.db` file in `backend/data/` (if it exists) and let the app recreate it on the next run.

## 13. Quick Start (Copy & Paste)

Open two terminal windows/tabs.

**Terminal 1 (Backend):**
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate   # Use `source venv/bin/activate` on Mac/Linux
pip install -e .[dev]
uvicorn aarogyaq.api:app --reload
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm install
npm run dev
```
