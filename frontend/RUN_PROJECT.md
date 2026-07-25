# Running the AarogyaQ Project

This guide provides clear instructions to get the AarogyaQ Emergency Department Triage & Clinical Operations system up and running on a local development machine.

---

## 🚀 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version `20.x` or `22.x` (LTS is highly recommended)
- **npm**: Installed automatically with Node.js (Version `10.x` or higher)

---

## 🛠️ Project Configuration & Package Manager

- **Package Manager**: `npm` (Standard Node Package Manager)
- **Framework**: React 18+/19 with Vite 6+
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Animations**: Motion

---

## 💻 Commands Reference

Run the following commands from the root directory of the project:

### 1. Install Dependencies
To install all required packages listed in `package.json`:
```bash
npm install
```

### 2. Start Local Development Server
To boot the hot-reloading development server on `http://localhost:3000`:
```bash
npm run dev
```

### 3. Compile Production Build
To bundle the frontend application into a highly optimized, static, production-ready build in the `/dist` directory:
```bash
npm run build
```

### 4. Serve/Preview Production Build
To run a local server that serves the compiled assets from the `/dist` folder to preview the production build behavior:
```bash
npm run preview
```

### 5. Code Quality (Linter & Type Checker)
To check for syntax, type mismatch, or any potential runtime bugs using TypeScript compiler without outputting compiled code:
```bash
npm run lint
```

### 6. Clean Build Assets
To clean up previously compiled build directories and temporary server builds:
```bash
npm run clean
```

---

## 🌐 Environment Variables Setup

1. Copy the template from `.env.example` to create a new `.env` file at the root:
   ```bash
   cp .env.example .env
   ```
2. Open the `.env` file and configure any credentials or endpoints:
   - `GEMINI_API_KEY`: Required if triggering real server-side or client-side AI analysis.
   - `VITE_API_BASE_URL`: Set this if you wish to swap the local high-fidelity database simulator (`simulatedDb.ts`) with a live running FastAPI production backend gateway.
   - `VITE_OLLAMA_BASE_URL`: Set this if you are hosting local Llama 3.1 LLMs on an Ollama container.

---

## 🩺 Troubleshooting Common Issues

### 1. Missing Dependencies / Command Not Found
If you get errors such as `vite: command not found` or `lucide-react not found`, run:
```bash
rm -rf node_modules package-lock.json
npm install
```

### 2. Ports Collision (Port 3000 Busy)
By default, the development server is configured to bind to port `3000`. If port 3000 is occupied by another process, you can free the port or modify the script in `package.json` / command-line flags:
```bash
npm run dev -- --port 3001
```

### 3. Type-checking Failures
If `npm run lint` yields type errors, make sure you are using a compatible TypeScript version (`typescript ~5.8.2` or later). You can force a clean validation run using:
```bash
npx tsc --noEmit --skipLibCheck
```

### 4. Hot Module Replacement (HMR) / WS Connection Warnings
If you see console errors such as `[vite] failed to connect to websocket`, these are benign warnings in some virtual sandboxes or container platforms where WebSockets are proxied. The application remains fully functional.
