# AarogyaQ: Emergency Department Triage & Clinical Operations System
## Canonical Frontend Technical Context & Enterprise Integration Guide

This document serves as the absolute, single source of truth for the **AarogyaQ** frontend application. It is engineered specifically for system integrators, software architects, and AI coding agents (such as Antigravity IDE, Claude Code, Cursor, and GitHub Copilot) who will connect this high-fidelity React interface with a robust, production-grade FastAPI backend, an enterprise database, and clinical AI modeling layers (e.g., Ollama/Llama 3.1).

---

## 1. Project Overview

### 1.1 The Healthcare Challenge
Emergency Departments (EDs) worldwide operate under high pressure, characterized by unpredictable patient surges, critical staffing constraints, and severe overcrowding. The most critical bottleneck in an ED is the **Triage Process**—the initial evaluation that determines the order of care based on clinical urgency rather than arrival time. 
*   **The Problem:** Traditional triage processes rely heavily on manual paper charting or outdated Electronic Health Record (EHR) systems that lack real-time visibility. This results in misclassified patients, delayed care for critical emergencies (e.g., myocardial infarction, stroke, or sepsis), high clinical cognitive load, and "boarding" bottlenecks where admitted patients occupy ED beds due to delayed departmental transfers.
*   **The Impact:** Increased patient mortality, prolonged wait times, clinician burnout, and high litigation risk for hospital systems.

### 1.2 The AarogyaQ Solution
**AarogyaQ** (Sanskrit for *Disease-Free Triage*) is an advanced, local-first, AI-assisted Emergency Triage and Clinical Command Center designed for busy clinicians. By leveraging high-density data visualization, secure local-first synchronization, real-time metrics, and clinically-backed AI prioritization, AarogyaQ streamlines emergency workflows from front-desk reception to definitive ward admission or discharge.

```
       [ Arriving Patient ]
               │
               ▼
   [ 1. FRONT RECEPTION DESK ] ──► (Simulate Barcode/QR Scanning)
               │
               ▼
  [ 2. CLINICAL NURSE INTAKE ] ──► (Input Demographics, Chief Complaint, Vitals)
               │
               ▼
    [ 3. NEURAL TRIAGE ENGINE ] ──► (Local/Server Llama 3.1 Core Risk Profiling)
               │
               ▼
     [ 4. HIGH-DENSITY QUEUE ] ──► (Visual Priority Columns: Critical, Urgent, Non-Urgent)
               │
               ▼
   [ 5. PHYSICIAN WORKSPACE ] ──► (CPOE: Notes, Medication, Labs, Radiology, Beds)
               │
               ▼
  [ 6. PATIENT WARD DISPOSITION ] ──► (Admitted, Discharged, Transferred, Bed Assigned)
```

### 1.3 System Maturity & Purpose
AarogyaQ is currently delivered as a **production-ready frontend application** featuring a high-fidelity local simulator (`simulatedDb.ts`) and mock HTTP adapter services. It acts as a complete visual and logical framework, maintaining state, executing local validations, and managing offline sync. The frontend is structurally decoupled from the backend, prepared to immediately bind to a live FastAPI endpoints gateway via JWT authentication and HL7/FHIR-compliant payload specifications.

### 1.4 Core Technology Stack
*   **Runtime Framework:** React 18+ with Vite (Hot Module Replacement disabled by control plane, utilizing standard client-side SPA routing).
*   **Programming Language:** TypeScript 5.0+ (Strict type enforcement, standard enums, named type imports, explicit contract interfaces).
*   **Styling Engine:** Tailwind CSS via global `@import "tailwindcss";` compiler, adhering to strict visual hierarchy guidelines.
*   **State Management:** Zustand (Modular, reactive store modules with memory-optimized local caching).
*   **Interactions & Animations:** Motion (Imported from `motion/react` for GPU-accelerated micro-interactions).
*   **Data Visualizations:** Recharts and D3 (Responsive sizing, debounced resize observers, highly contextual clinical color scales).
*   **Icons & Brand Assets:** Lucide React (Clean, scalable SVG vector elements; no inline SVGs or hardcoded path elements are permitted).

---

## 2. Frontend Folder Structure

The project codebase utilizes an enterprise-grade, highly modular folder layout that enforces strict separation of concerns. This structure prevents token-limit cutoffs during AI generation and ensures developers can locate resources cleanly.

```
/ (Workspace Root)
├── .env.example                # Templates for system environment variables (API URLs, features)
├── index.html                  # Core single-page application entry-point
├── metadata.json               # Platform configuration, frame permissions, and capabilities
├── package.json                # Project dependencies, build scripts, and entry points
├── tsconfig.json               # TypeScript compiler rules and path mappings
├── vite.config.ts              # Vite server build configuration
├── src/
│   ├── main.tsx                # Mounts App.tsx to the DOM
│   ├── App.tsx                 # Base application frame (Navbar, global Alert banner, router wrapper)
│   ├── index.css               # Global Tailwind CSS imports, typography declarations, and themes
│   ├── types.ts                # Canonical data models, enums, and clinical types
│   ├── api/
│   │   ├── client.ts           # Axios/Fetch API client wrapping headers, base URL, and offline hooks
│   │   ├── patient.ts          # Endpoint mapping for patient clinical records
│   │   ├── visits.ts           # Endpoint mapping for clinical orders, notes, and dispositions
│   │   └── simulatedDb.ts      # Clinical state simulator, mock patients, and metrics database
│   ├── routes/
│   │   └── AppRouter.tsx       # Hash-based routing table mapping view states
│   ├── store/
│   │   ├── useQueueStore.ts    # Central Zustand state for triage streams and queues
│   │   ├── useUIStore.ts       # Global UI settings (theme, offline state, activeRole, auditLogs, alerts)
│   │   └── usePatientStore.ts  # Current clinician-selected patient context and historical records
│   └── components/
│       ├── charts/
│       │   └── AnimatedCounter.tsx  # Optimized counters with fluid numeric transitions
│       ├── layout/
│       │   ├── Navbar.tsx      # Top global brand bar, role switcher, sync status, and active timers
│       │   ├── Sidebar.tsx     # Collapsible clinical navigation rail
│       │   └── PageTransition.tsx  # Framer-motion layout page animation wrappers
│       ├── patient/
│       │   └── TimelineEntry.tsx   # Detailed vertical timeline block for historical patient visits
│       ├── queue/
│       │   ├── ExplainabilityPanel.tsx  # Dynamic panel explaining neural AI triage scoring
│       │   ├── PriorityBadge.tsx        # Color-coded clinical urgency indicators
│       │   ├── QueueCard.tsx            # Patient summary card optimized for high-density reading
│       │   └── QueueColumn.tsx          # Scrollable swimlane for sorting clinical urgency pools
│       └── ui/
│           ├── Button.tsx      # Core buttons with loaders and size profiles
│           ├── Card.tsx        # standard container framing borders and shadows
│           ├── Drawer.tsx      # Slide-out contextual action drawer
│           ├── EmptyState.tsx  # Clean placeholders for empty queries or clinical lists
│           ├── Input.tsx       # Standard inputs with focus rings and error states
│           ├── Modal.tsx       # Accessible modal dialog overlays
│           ├── ProgressRing.tsx # Radial progress loaders for risk scores
│           ├── Skeleton.tsx    # Content-agnostic loading card indicators
│           ├── Slider.tsx      # Range selectors for manual vital entries
│           ├── Spinner.tsx     # Ring loaders
│           ├── Stepper.tsx     # Progression bars for multi-step triage registration
│           ├── Tabs.tsx        # Styled button group controllers
│           └── Toast.tsx       # Screen notification system with automatic timeouts
```

---

## 3. Complete User Roles

AarogyaQ is optimized for five specific clinician personas. Users can switch roles instantly in the global navbar, which filters UI access, changes write privileges, and records compliance logs.

| Clinician Role | Responsibility | Accessible Screens | Editable Information | Read-Only Information | Permissions Scope |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Receptionist** | Front-desk triage registration, demographic checking, phone verification, patient lookup. | Dashboard, Nurse Intake, CommandCenter | Patient demographics, primary chief complaint, contact details. | Vitals, AI risk score, clinical notes, order history. | Create new patient record, assign initial queue priority (Low). |
| **Triage Nurse** | Secondary clinical screening, full vital signs capture, pain scale assessment, initial triage. | Dashboard, Live Stream, Nurse Intake, Patient History | Vital signs, pain score, updated chief complaint, initial routing. | Doctor notes, medications, lab/radiology results. | Create vital signs record, initiate AI analysis request, route to queue. |
| **Emergency Physician (MD)** | Definitive medical evaluation, diagnostics ordering, prescription, clinical note drafting, disposition. | Dashboard, Patient History, CommandCenter, Department Control | Clinical progress notes, medication orders (CPOE), labs, radiology, disposition. | Nurse intake vital history, basic demographic logs. | Full clinical write privileges (Notes, CPOE), update final disposition. |
| **Charge Nurse** | Bed board orchestration, ward flow operations, active patient routing and tracking. | Dashboard, Department Control, CommandCenter | Physical bed assignments, ward routing department, transfer protocols. | Full patient clinical history, vitals, physician orders. | Bed allocation, transfer patient to inpatient wards, clear empty beds. |
| **Hospital Administrator (IT)** | Security auditing, pipeline telemetry, compliance checking, system analytics. | Dashboard, Shift Report, CommandCenter | System configuration, network overrides, emergency alert resolutions. | Full audit logs, raw HL7 schemas, clinical performance statistics. | Global system write privileges, clear/override critical system logs. |

---

## 4. Complete Application Workflow

AarogyaQ replicates the rigorous clinical workflow of modern Level-1 Trauma and Tertiary Care emergency departments:

```
[PATIENT ARRIVAL]
       │
       ▼
[1. RECEPTION REGISTRATION]
  - Staff checks if patient exists in EMR via Patient Directory Search.
  - If new, enters Name, Age, Gender, Contact, and Chief Complaint.
  - Alternatively, simulates scanning of arrival barcode or EMT wristband.
       │
       ▼
[2. NURSE INTAKE & TRIAGE SCREENING]
  - Triage Nurse escorts patient to screening cubicle.
  - Logs Vitals: Heart Rate, Blood Pressure (Sys/Dia), Resp Rate, Temp, SpO2, and Pain Level (1-10).
  - System dynamically evaluates vitals against standard physiological warning flags (red text indicators).
       │
       ▼
[3. NEURAL AI RISK ANALYSIS]
  - Nurse clicks "Run AI Clinical Assessment".
  - Frontend packages payload and requests Ollama/Llama 3.1 inference.
  - Model returns Risk Score (0-100%), Urgency Tier (Critical/Urgent/Non-Urgent), Clinical Reasoning, and Urgent Red Flags.
       │
       ▼
[4. QUEUE PLACEMENT]
  - Patient is routed into the High-Density Triage Queue.
  - Patients are sorted automatically: Risk Score (Descending) × Urgent Tier Priority.
  - Dashboard displays color-coded cards alerting physicians to incoming critical patients.
       │
       ▼
[5. CLINICIAN DIAGNOSTICS & CPOE]
  - MD opens Patient History profile.
  - Enters rich, timestamped Clinical Notes.
  - Issues Medication Orders (e.g., Fentanyl, NTG, Aspirin) via computerized provider order entry (CPOE).
  - Submits Laboratory Requests (e.g., Troponin, CBC) and Radiology Scans (e.g., ECG, CT Head).
       │
       ▼
[6. BED & WARD ALLOCATION]
  - Charge Nurse monitors the Emergency Bed Board.
  - Allocates patient to physical beds (e.g., "Resus Bed A-1", "Observation B-3").
  - Identifies routing ward (e.g., Cardiology, Traumatology).
       │
       ▼
[7. DISPOSITION & DISCHARGE]
  - Patient is updated to final disposition status: ADMITTED, TRANSFERRED, or DISCHARGED.
  - Emptying the patient's status automatically clears the bed from the physical commands board.
  - System logs an explicit HIPAA-compliant audit entry for the discharge transaction.
```

---

## 5. Screen-by-Screen Documentation

### 5.1 Dashboard (`Dashboard.tsx`)
*   **Purpose:** The central high-density terminal displaying active ED workloads, wait times, department statuses, and the live clinical queue.
*   **Displayed Information:** 
    *   ED metrics (active patients, average wait times, active resus beds, and clinical alerts count).
    *   Dynamic bar chart mapping department patient volumes.
    *   Three-column Urgency Queue board (Critical, Urgent, Non-Urgent) with drag/click interaction.
*   **User Roles:** All roles (Read-only for Receptionists, interactable clinical actions for Nurses and MDs).
*   **Inputs & Buttons:**
    *   *Search filter* input to locate patient cards on the active board.
    *   *Trigger emergency alert* button in the commands panel.
    *   *Open clinical profile* on each patient card.
*   **Empty State:** If the active queue is empty, displays an optimized `EmptyState` graphic indicating "ED is quiet - No patients currently in waitlist."
*   **Expected APIs:** `GET /visits/active` to fetch queue items; `GET /departments/metrics` for ward volumes.

### 5.2 Live Triage Streams (`LiveQueue.tsx`)
*   **Purpose:** An optimized list view designed for heavy telemetry monitoring during sudden mass casualty events.
*   **Displayed Information:** Expanded data-table layout displaying patient names, current vitals, pain indexes, physiological warning states, and AI risk scores on a single screen.
*   **User Roles:** Triage Nurses, Emergency Physicians, and Charge Nurses.
*   **Inputs & Buttons:**
    *   *Quick reassessment* slider to update a patient's pain index on the fly.
    *   *Action menu* to immediately change disposition or assign beds without leaving the list view.
*   **Loading State:** Framer-motion layout skeletons mimicking table rows.

### 5.3 Nurse Intake Desk (`NurseIntake.tsx`)
*   **Purpose:** A structured, multi-step stepper wizard for registering and triaging a patient.
*   **Step 1 (Demographics):** Capture Name, Age, Gender, Phone, and Chief Complaint. Validation: Name must be ≥ 2 characters; Age must be > 0 and ≤ 125.
*   **Step 2 (Vitals Capture):** Form inputs with sliding limits for:
    *   Heart Rate (BPM) [Range: 30-220]
    *   Systolic BP (mmHg) [Range: 60-250]
    *   Diastolic BP (mmHg) [Range: 40-150]
    *   Resp Rate ( breaths/min) [Range: 6-60]
    *   SpO2 (%) [Range: 50-100]
    *   Temperature (°F) [Range: 94-108]
    *   Pain Level (1-10)
*   **Step 3 (Neural Assessment):** Display package JSON, click to trigger Llama 3.1 analysis, render risk outputs.
*   **Expected APIs:** `POST /patients/register` on step completion; `POST /ai/triage` for neural analysis.

### 5.4 Patient Clinical Archive (`PatientHistory.tsx`)
*   **Purpose:** The definitive Electronic Health Record (EHR) view for an individual patient. Includes a tabbed CPOE (Computerized Provider Order Entry) console.
*   **Clinical Notes Tab:** Rich text form allowing physicians and nurses to log signed progress notes. Shows historical timeline of notes.
*   **Medication Orders Tab:** Inputs for Med Name, Dosage, and Frequency. Lists ordered medications with "Pending" or "Administered" status indicators.
*   **Labs & Radiology Tab:** Selection drop-downs to order diagnostic panels (e.g., Troponin, ABG, CT Head, FAST Ultrasound).
*   **Bed & Disposition Tab:** Drop-down inputs to assign physical beds, direct ward transfers, or sign discharge orders.
*   **Expected APIs:** `POST /visits/{id}/notes`, `POST /visits/{id}/medications`, `POST /visits/{id}/labs`, `POST /visits/{id}/radiology`, `PATCH /visits/{id}/bed`.

### 5.5 Bed & Department Control (`DepartmentControl.tsx`)
*   **Purpose:** Monitors physical ward capacity across the hospital to prevent ED boarding bottlenecks.
*   **Displayed Information:** Grid cards representing wards (Cardiology, Neurology, Traumatology, Pediatrics, Pulmonology, General Medicine). Each card shows:
    *   Current occupancy percentage.
    *   Total and available beds (e.g., "14/18 Beds Occupied").
    *   Average wait times for transfer admittance.
*   **User Roles:** Charge Nurses and Hospital Administrators.

### 5.6 Shift Analytics (`ShiftReport.tsx`)
*   **Purpose:** High-level dashboard presenting key performance indicators (KPIs) of the active shift.
*   **Displayed Information:**
    *   Total patient throughput counter.
    *   Average wait time distribution line charts.
    *   Urgency breakdown radial progress rings.
    *   Clinical staff assignments grid.
*   **User Roles:** Hospital Administrators, Shift Leads.

### 5.7 Operations Command Center (`CommandCenter.tsx`)
*   **Purpose:** Central hub for real-time compliance tracking, barcode tracking, global emergency broadcasts, and system telemetry.
*   **Sub-Tab 1 (Reception & Barcode):**
    *   *Scan simulation* trigger with visual laser sweep animation.
    *   Resolves scanned barcode into a valid Patient Profile context, allowing one-click routing to the EHR.
*   **Sub-Tab 2 (Physical Bed Grid):**
    *   Interactive display of 12 critical ED beds (Resus, Critical Care, Observation, Triage chairs).
    *   Shows occupied names, patient IDs, and instant discharge triggers.
*   **Sub-Tab 3 (Alerts Hub):**
    *   Clinical broadcast dashboard. Select "Code Blue", "Trauma Alert", or "Stroke Protocol" and target location.
    *   Broadcasting triggers a high-impact, pulsing global banner visible on all screens.
*   **Sub-Tab 4 (Security Audit Log):**
    *   Real-time HIPAA auditing tracker capturing timestamp, role, specific clinician user, and the action taken. Filters logs by role.
*   **Sub-Tab 5 (Offline Telemetry):**
    *   Monitors status of FastAPI backend connection, HL7 schemas, and local state sync latencies.

---

## 6. Reusable Components

The interface is built on a highly modular typography and atomic component kit inside `/src/components`:

### 6.1 Atomic UI Library (`src/components/ui/`)
*   **`Button`:** Context-aware action trigger. Props: `variant` ("primary" | "secondary" | "danger" | "ghost"), `size` ("sm" | "md" | "lg"), `isLoading` (renders a spinner and disables actions), `leftIcon`/`rightIcon` (Lucide nodes).
*   **`Card`:** Structural box panel. Configured with standard dark slate borders (`border-white/10 bg-white/5`), responsive padding, hover scale states, and drop shadow profiles.
*   **`Drawer`:** Slide-out right side-panel for secondary actions without losing primary screen focus. Animates via `motion/react`.
*   **`Modal`:** Overlay dialog requiring action. Features backdrop filters (`backdrop-blur-md`), key binding observers (Escape to close), and focus containment.
*   **`ProgressRing`:** Dynamic SVG circle charting scores (0-100%). Evaluates value thresholds to colorize rings (Green: <40%, Yellow: 40-75%, Red: >75%).
*   **`Slider`:** Range selector featuring dual color trails, numerical ticks, and step parameters. Fully compliant with keyboard navigation.
*   **`Toast`:** Floating notification container. Animates entering/leaving, supports types (`success` | `info` | `warning` | `error`), and automatically executes timeout threads.

### 6.2 Domain-Specific Triage Components (`src/components/queue/`)
*   **`QueueCard`:** High-density patient card. Props: `patient` model, `visit` details, `index`. Features:
    *   Dynamic vital indicator alerts (e.g., heart icon flashes if HR >100).
    *   AI risk progress ring.
    *   Click triggers routing to Patient History context.
*   **`QueueColumn`:** Sorts patient pools. Props: `title`, `items` (Queue items list), `borderColor` (theme accent), `isLoading`. Handles responsive spacing and empty list states.
*   **`ExplainabilityPanel`:** Deconstructs the Llama 3.1 inference results. Presents structured collapsible cards containing reasoning parameters, vitals impact, and recommended precautions.

---

## 7. Routing Architecture

AarogyaQ utilizes a lightweight, declarative **Hash-Based Client Route Controller** inside `/src/routes/AppRouter.tsx`. 

*   **Routing Mechanism:** Evaluates `window.location.hash` changes. Hash routes bypass the server routing constraints of static web containers, making them highly reliable for offline-first local deployment.
*   **Navigational Table:**
    *   `#/dashboard` ──► `Dashboard.tsx` (Central ED operations board)
    *   `#/live` ──► `LiveQueue.tsx` (High-density telemetry streams)
    *   `#/nurse` ──► `NurseIntake.tsx` (Triage intake registration form)
    *   `#/departments` ──► `DepartmentControl.tsx` (Physical beds & ward capacity board)
    *   `#/shift` ──► `ShiftReport.tsx` (Shift transition metrics and analytics)
    *   `#/command` ──► `CommandCenter.tsx` (Command deck, audit log, barcodes, system alerts)
    *   `#/patient/:id` ──► `PatientHistory.tsx` (EHR history & active CPOE workstation)
*   **Role-Based Constraints:** The router is synchronized with the global `activeRole` state in `useUIStore.ts`. In a production-ready environment, if the role does not have authorization (e.g., a Receptionist attempting to navigate to `#/patient/:id` to write CPOE prescriptions), the route can block action, display a security error toast, and log a violation in the Security Audit database.

---

## 8. UI State Management (Zustand Core Engine)

State management is decoupled into three major Zustand stores located in `/src/store`:

### 8.1 `useUIStore.ts`
Manages general configuration, notifications, active security states, and global alert broadcasts:
*   `theme` ("light" | "dark"): Tracks user display preferences. Default is dark theme optimized for night shift eye strain.
*   `activeRole` ("Receptionist" | "Triage Nurse" | "ER Physician" | "ER Charge Nurse" | "IT Administrator"): The central context guiding write privileges.
*   `isOffline` (boolean): Global connection state switcher.
*   `auditLogs` (AuditLog[]): Standard HIPAA trail caching active user actions.
*   `erAlerts` (ERAlert[]): Code-blue emergency vectors currently visible across all views.
*   `toasts` (Toast[]): Contextual clinical message queues.

### 8.2 `useQueueStore.ts`
Manages waitlist arrays, live department capacity figures, and query filters:
*   `emergencyQueue` (TriageQueueItem[]): High-risk patient profiles.
*   `generalQueue` (TriageQueueItem[]): Stable, lower-acuity patient lists.
*   `isLoading` (boolean): Telemetry sync state.
*   `fetchQueues()`: Pulls active ED arrays. Auto-resolves to simulated fallback databases on connection faults.

### 8.3 `usePatientStore.ts`
Manages active physician sessions and historical timeline events:
*   `selectedPatient` (TriageQueueItem | null): Active patient loaded in EHR.
*   `patientHistory` (TriageQueueItem[]): Prior clinical encounters logged in database registers.
*   `fetchPatientHistory(patientId)`: Populates longitudinal timelines.

---

## 9. Backend Integration Guide (FastAPI Specification)

AarogyaQ is prepared for complete FastAPI endpoints mapping. When integrating, swap out the mock methods in `/src/api/` with fetch hooks matching this specification.

### 9.1 Patient Registration (`POST /api/v1/patients`)
*   **Request Body:**
```json
{
  "name": "Arjun Mehta",
  "age": 42,
  "gender": "Male",
  "phone": "+91 98765 43210"
}
```
*   **Response Body (201 Created):**
```json
{
  "patient_id": "P-902",
  "name": "Arjun Mehta",
  "age": 42,
  "gender": "Male",
  "phone": "+91 98765 43210",
  "created_at": "2026-06-26T22:04:59Z"
}
```

### 9.2 Log Triage Session (`POST /api/v1/visits`)
*   **Request Body:**
```json
{
  "patient_id": "P-902",
  "chief_complaint": "Acute onset of crushing left-sided chest pain radiating to back",
  "pain_level": 9,
  "department_assigned": "Cardiology",
  "vitals": {
    "heart_rate": 105,
    "systolic_bp": 160,
    "diastolic_bp": 95,
    "respiratory_rate": 24,
    "spo2": 93,
    "temperature": 98.9
  },
  "assessment": {
    "risk_score": 88.5,
    "priority": "Critical",
    "reasoning": "Hypertensive crisis, tachycardia, hypoxia (SpO2 93%) on room air with severe chest pressure. High potential for Acute Coronary Syndrome.",
    "red_flags": ["Chest Pressure", "Hypoxia"],
    "recommended_department": "Cardiology"
  }
}
```
*   **Response Body (200 OK):**
```json
{
  "visit_id": "V-4011",
  "patient_id": "P-902",
  "status": "TRIAGED",
  "registered_at": "2026-06-26T22:06:12Z",
  "bed_assigned": null,
  "vitals": { "heart_rate": 105, "systolic_bp": 160, "diastolic_bp": 95, "respiratory_rate": 24, "spo2": 93, "temperature": 98.9 }
}
```

### 9.3 Write Clinical Note (`POST /api/v1/visits/{visit_id}/notes`)
*   **Request Body:**
```json
{
  "author": "Dr. Arvind Swamy",
  "note": "12-Lead ECG completed. Shows ST-elevations in II, III, aVF. Confirming Acute Inferior Wall Myocardial Infarction. Preparing for STAT cardiac catheterization."
}
```
*   **Response Body (200 OK):**
```json
{
  "note_id": "N-1011",
  "timestamp": "2026-06-26T22:08:44Z",
  "author": "Dr. Arvind Swamy",
  "note": "12-Lead ECG completed..."
}
```

### 9.4 Create Medication Order (`POST /api/v1/visits/{visit_id}/medications`)
*   **Request Body:**
```json
{
  "doctor": "Dr. Arvind Swamy",
  "name": "Clopidogrel",
  "dosage": "300 mg",
  "frequency": "Once Stat"
}
```
*   **Response Body (201 Created):**
```json
{
  "order_id": "M-2211",
  "timestamp": "2026-06-26T22:09:15Z",
  "doctor": "Dr. Arvind Swamy",
  "name": "Clopidogrel",
  "dosage": "300 mg",
  "frequency": "Once Stat",
  "status": "Pending"
}
```

---

## 10. AI Neural Triage Integration (Ollama / Llama 3.1)

AarogyaQ utilizes high-fidelity generative AI models (Llama 3.1 via local Ollama ports or Google Gemini APIs) to perform deep automated clinical prioritization.

```
       [ Demographics & Chief Complaint ]
                       +
               [ Vital Signs ]
                       │
                       ▼
          [ POST /api/v1/ai/triage ]
                       │
                       ▼
         [ Llama 3.1 System Prompt ]
                       │
                       ▼
         [ Structured JSON Response ]
                       │
                       ▼
          [ Clinical Decision Board ]
```

### 10.1 Structured System Prompt Template
To ensure safety and reliability, the AI core must consume a highly rigid system prompt instruction set:

```text
You are the AI Clinical Expert Core for AarogyaQ Emergency Department.
Analyze the arriving patient's physiological vitals, age, gender, and chief complaint.
Output a strict JSON clinical summary. You are prohibited from outputting markdown wrap, conversational pleasantries, or non-JSON files.

Input Structure:
{
  "patient": { "age": 45, "gender": "Female" },
  "vitals": { "heart_rate": 112, "systolic_bp": 90, "diastolic_bp": 60, "resp_rate": 26, "spo2": 91, "temp": 101.4 },
  "complaint": "Sudden onset of rigors, progressive confusion, hot to touch, flank pain."
}

Output JSON Schema:
{
  "risk_score": float (Range 0-100 indicating likelihood of clinical deterioration),
  "priority": "Critical" | "Urgent" | "Stable",
  "reasoning": string (Max 2 sentences of clinical justification based on physiological trends),
  "red_flags": [string] (List of specific high-risk signs present),
  "recommended_department": "Traumatology" | "Cardiology" | "Neurology" | "Pulmonology" | "Pediatrics" | "General Medicine"
}
```

### 10.2 Structured Output Parse Guide
The API middleware parses this response directly. If the model outputs unstructured text or missing fields, the middleware executes a fallback schema parser, assigning standard priorities based on clinical risk algorithms (e.g., if SpO2 <90, auto-assigns "Critical" and 95% risk score).
*   **Crucial Disclaimer:** *The neural triage risk scoring is a decision-support asset only. It acts as an advisory assistant to clinicians and never overrules physical evaluations conducted by licensed medical practitioners.*

---

## 11. Database Schema Mapping

The following catalog outlines how frontend form fields, states, and arrays map to database columns and relational schemas (Drizzle/SQL standard):

### 11.1 Table: `patients`
Stores static demographic profiles.
*   `patient_id` ──► `VARCHAR(32) PRIMARY KEY` (Maps from `patient.patient_id` in frontend)
*   `name` ──► `VARCHAR(255) NOT NULL` (Maps from registration text inputs)
*   `age` ──► `INT NOT NULL` (Maps from registration numerical step)
*   `gender` ──► `VARCHAR(32) NOT NULL` (Maps from gender dropdown selection)
*   `phone` ──► `VARCHAR(64)` (Maps from intake registration fields)

### 11.2 Table: `visits`
Tracks individual ER encounters and clinical routing parameters.
*   `visit_id` ──► `VARCHAR(32) PRIMARY KEY` (Relational key linking clinical order arrays)
*   `patient_id` ──► `VARCHAR(32) FOREIGN KEY REFERENCES patients(patient_id)`
*   `status` ──► `VARCHAR(64)` (Enums: "REGISTERED", "TRIAGED", "ADMITTED", "DISCHARGED", "TRANSFERRED")
*   `chief_complaint` ──► `TEXT`
*   `pain_level` ──► `INT` (Range: 1-10)
*   `registered_at` ──► `TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
*   `bed_assigned` ──► `VARCHAR(64) NULL` (Physical bed mapping)
*   `department_assigned` ──► `VARCHAR(128)` (e.g., Cardiology, Neurology)

### 11.3 Table: `vitals`
Captures physiological metrics logged by triage nurses.
*   `vital_id` ──► `SERIAL PRIMARY KEY`
*   `visit_id` ──► `VARCHAR(32) FOREIGN KEY REFERENCES visits(visit_id)`
*   `heart_rate` ──► `INT`
*   `systolic_bp` ──► `INT`
*   `diastolic_bp` ──► `INT`
*   `respiratory_rate` ──► `INT`
*   `spo2` ──► `INT`
*   `temperature` ──► `DECIMAL(4,2)`
*   `logged_at` ──► `TIMESTAMP WITH TIME ZONE DEFAULT NOW()`

### 11.4 Table: `clinical_notes`
Tracks written clinical documentations.
*   `note_id` ──► `SERIAL PRIMARY KEY`
*   `visit_id` ──► `VARCHAR(32) FOREIGN KEY REFERENCES visits(visit_id)`
*   `author` ──► `VARCHAR(255) NOT NULL` (Clinician name tied to role context)
*   `note` ──► `TEXT NOT NULL`
*   `timestamp` ──► `TIMESTAMP WITH TIME ZONE DEFAULT NOW()`

### 11.5 Table: `medication_orders`
Tracks active and administered drug logs (CPOE).
*   `order_id` ──► `SERIAL PRIMARY KEY`
*   `visit_id` ──► `VARCHAR(32) FOREIGN KEY REFERENCES visits(visit_id)`
*   `doctor` ──► `VARCHAR(255)`
*   `name` ──► `VARCHAR(255)`
*   `dosage` ──► `VARCHAR(128)`
*   `frequency` ──► `VARCHAR(128)`
*   `status` ──► `VARCHAR(64)` (Enums: "Pending", "Administered")

---

## 12. Implemented Feature Inventory

AarogyaQ boasts an exceptionally complete visual, administrative, and clinical toolset:

*   **Clinical Triage Matrix (Dashboard):** High-density, real-time board grouping active waitlists into drag-and-drop Critical, Urgent, and Non-Urgent columns.
*   **Computerized Provider Order Entry (CPOE Workspace):** Interactive EHR workstation permitting clinicians to draft notes, issue medication orders, and request lab panels or radiology imaging.
*   **Operations & Command Board:** Real-time bed grid board controlling 12 active physical beds, triggering Code Blue emergency protocols, and monitoring live HL7 connection standards.
*   **Dynamic Physiological Flagging:** Input fields highlighting critical patient vitals in warning colors if values breach standard clinical safety ranges (e.g., Heart Rate >100, SpO2 <94%).
*   **Integrated HIPAA Auditing Terminal:** Live, real-time compliance ledger recording clinicians' shift switches, vital registrations, and patient discharges to prevent security leaks.
*   **Clinician Hotkeys (Keyboard Navigation):** Standardized clinical Alt combinations ensuring rapid terminal switching during active resuscitation:
    *   `ALT + D` ──► Switches context immediately to Main Dashboard.
    *   `ALT + S` ──► Navigates instantly to High-Density Telemetry Streams.
    *   `ALT + N` ──► Sweeps screen context to Nurse Intake Stepper wizard.
    *   `ALT + O` ──► Commands the view context to Central Operations Command.
*   **Simulated Barcode Scanner:** Interactive wristband camera scanning simulator that parses data packets and routes users directly to active patient charts.

---

## 13. Placeholder Features vs. Active Core Modules

To ensure subsequent development waves proceed without architectural confusion, this matrix differentiates between simulated, UI-only, and fully integrated components:

| Feature Area | Frontend Component | Real / Active Core | Mock / Simulated | Integration Target |
| :--- | :--- | :---: | :---: | :--- |
| **Triage State Engine** | `useQueueStore.ts` | **Active** | - | Zustand memory handles sorting and queue states directly. |
| **Demographics Database** | `usePatientStore.ts` | **Active** | - | Binds directly to browser Session Cache. |
| **Physiological Warnings** | `NurseIntake.tsx` | **Active** | - | Real-time calculations comparing numeric bounds. |
| **CPOE Orders (Labs/Prescriptions)**| `PatientHistory.tsx` | - | **Simulated** | Post requests route to mock arrays in `simulatedDb.ts`. Needs API endpoints mapping. |
| **Emergency Alerts System** | `App.tsx`, `CommandCenter.tsx` | **Active** | - | Event state triggers local banners and plays visual warning pulses. |
| **Security Auditing Log** | `CommandCenter.tsx` | **Active** | - | Logs actions locally; requires remote logging API sink. |
| **Barcode Scan Resolution** | `CommandCenter.tsx` | - | **Simulated** | Scan trigger runs visual laser and resolves randomly to pre-loaded IDs. |
| **HL7/FHIR Output Schemas** | `CommandCenter.tsx` | - | **Simulated** | Displays schema structures. Ready to bind to post processors. |

---

## 14. Enterprise Backend Integration Checklist

Follow these steps to transition AarogyaQ from stand-alone simulated operation to full production deployment:

### Step 1: Environment Configuration
*   Create a production `.env` file at the root.
*   Define `VITE_API_BASE_URL` pointing to your FastAPI container gateway (e.g., `https://api.aarogyaq.in/v1`).
*   Define `VITE_OLLAMA_BASE_URL` if connecting the frontend directly to a local GPU server.

### Step 2: Establish client.ts Adapter
*   Configure the Axios hook inside `/src/api/client.ts` to consume the environment's `VITE_API_BASE_URL`.
*   Ensure that whenever a request fails with an HTTP `503 Service Unavailable` or connection timeout, the client transparently logs an offline warning, flips `useUIStore.isOffline = true`, and pulls data from the local simulation backup so clinical operations never freeze.

### Step 3: Implement Authentication Gates
*   Insert JWT authorization headers on the API client.
*   Hook up `activeRole` with the server's session parameters so changing roles requires a verified pin or passcode.

### Step 4: Map Simulated Database to Postgres
*   Map all mock endpoints inside `/src/api/visits.ts` and `/src/api/patient.ts` to their corresponding FastAPI routes as documented in Section 9.

### Step 5: Test HL7/FHIR Streaming
*   Verify that registering a patient in `NurseIntake.tsx` sends a valid JSON payload matching standard FHIR Encounter formatting.

---

## 15. Future System Enhancements

*   **Integrated PACS Image Viewer:** Permits physicians to review raw X-Ray and CT imaging directly within the Diagnostics tab of the EHR dashboard.
*   **Live IoT Vitals Monitoring:** Streams clinical data directly from bedside monitors via WebSocket protocols, updating patients' vitals cards without manual nurse entry.
*   **Speech-to-Text Clinical Scribe:** Uses localized Whisper AI models to automatically dictate clinicians' verbal evaluations into structured clinical progress notes.
*   **Multi-Site Emergency Command:** Aggregates waitlist volumes and bed boards across multiple hospitals to optimize city-wide ambulance routing.

---

## 16. Instructions for AI Coding Agents

When editing or extending the AarogyaQ codebase, you must adhere to these rigid rules:

1.  **Respect Scope & Clinical Workflow:** Do not redesign, over-complicate, or remove the existing clinical steps. Every interface element exists to mirror actual clinical procedures.
2.  **Maintain High-Density UI Density:** Busy clinicians require high information density. Do not replace compact, data-rich layouts with large, oversized designs. Ensure fonts are clean, tabular, and high contrast.
3.  **Preserve Offline Fail-Safe Hooks:** Always ensure that any edit to API endpoints maintains a transparent fallback to the simulated database layer (`simulatedDb.ts`). If the backend crashes, the interface must continue to function.
4.  **Enforce Strict Type Safety:** Never use `any` in TypeScript. Map complete interfaces, use strict enums for statuses and priority levels, and import named parameters at the top of every file.
5.  **Adhere to Tailwind Guidelines:** Rely entirely on Tailwind classes. Do not use custom external CSS files or inline styling properties. Use standard colors (Deep slate background `#0A0C12`, alert red text, clinical blue highlights).

---

## 17. System Architecture Summary

```
                      ┌────────────────────────────────────────┐
                      │                BROWSER                 │
                      │                                        │
                      │   ┌────────────────────────────────┐   │
                      │   │       React Application        │   │
                      │   │         (Hash Router)          │   │
                      │   └────────────────▲───────────────┘   │
                      │                    │                   │
                      │   ┌────────────────▼───────────────┐   │
                      │   │      Zustand Store Layers      │   │
                      │   │  (Queue, Patient, UI, Audit)   │   │
                      │   └────────────────▲───────────────┘   │
                      │                    │                   │
                      │   ┌────────────────▼───────────────┐   │
                      │   │      API Routing Gateway       │   │
                      │   │      (visits.ts, patient.ts)   │   │
                      │   └────────┬───────────────┬───────┘   │
                      │            │               │           │
                      └────────────┼───────────────┼───────────┘
                                   │               │
                            If Online              If Offline
                                   │               │
                                   ▼               ▼
                      ┌────────────────────┐ ┌────────────────────┐
                      │    FASTAPI CLOUD   │ │   LOCAL DATABASE   │
                      │      (Production)  │ │     SIMULATOR      │
                      │                    │ │ (simulatedDb.ts)   │
                      └────────────────────┘ └────────────────────┘
```

AarogyaQ is a highly polished, responsive, and robust emergency clinical workspace. It provides developers and integrated clinical networks with a clean, high-performance web terminal that brings actionable order to emergency situations.

---
*For questions regarding deployment, HIPAA auditing, or local Llama 3.1 LLM parameters tuning, please consult the Hospital IT Command Center or open an issue on the developer board.*
