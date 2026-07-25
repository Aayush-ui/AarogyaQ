/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  Users, 
  QrCode, 
  Bed, 
  Activity, 
  HardDrive, 
  Terminal, 
  Wifi, 
  Layers,
  Search,
  AlertTriangle,
  Play,
  RotateCw,
  PlusCircle,
  FileSpreadsheet,
  Clock,
  HeartPulse,
  Keyboard,
  Compass,
  CheckCircle,
  WifiOff,
  Brain
} from "lucide-react";
import { useQueueStore } from "../store/useQueueStore";
import { useUIStore } from "../store/useUIStore";
import { usePatientStore } from "../store/usePatientStore";
import { simulatedQueue } from "../api/simulatedDb";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { PageTransition } from "../components/layout/PageTransition";
import { RLDashboard } from "../components/ui/RLDashboard";

export const CommandCenter: React.FC = () => {
  const { emergencyQueue, generalQueue, fetchQueues } = useQueueStore();
  const { activeRole, addToast, addAuditLog, erAlerts, triggerERAlert, resolveERAlert, auditLogs, isOffline } = useUIStore();
  const { selectPatient } = usePatientStore();

  const [activeSubTab, setActiveSubTab] = useState<"reception" | "beds" | "alerts" | "audit" | "offline" | "ai_learning">("reception");

  // State for search and barcode scan
  const [searchQuery, setSearchQuery] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scannedPatient, setScannedPatient] = useState<any>(null);

  // State for triggering custom alerts
  const [alertType, setAlertType] = useState("Code Blue");
  const [alertLoc, setAlertLoc] = useState("Resus Bay A");

  // Simulated live beds
  const totalBeds = [
    { id: "A-1", type: "Resus Bed", occupied: "P-781", patientName: "Rohan Deshmukh" },
    { id: "A-2", type: "Resus Bed", occupied: null, patientName: null },
    { id: "A-3", type: "Critical Care", occupied: "P-453", patientName: "Aisha Sharma" },
    { id: "A-4", type: "Critical Care", occupied: null, patientName: null },
    { id: "B-1", type: "Observation", occupied: "P-101", patientName: "Rajesh Khanna" },
    { id: "B-2", type: "Observation", occupied: null, patientName: null },
    { id: "B-3", type: "Observation", occupied: "P-202", patientName: "Karan Johar" },
    { id: "B-4", type: "Observation", occupied: null, patientName: null },
    { id: "C-1", type: "Pediatric Bed", occupied: null, patientName: null },
    { id: "C-2", type: "Pediatric Bed", occupied: null, patientName: null },
    { id: "C-3", type: "Triage Chair", occupied: "P-303", patientName: "Sushma Swaraj" },
    { id: "C-4", type: "Triage Chair", occupied: null, patientName: null },
  ];

  const [bedsList, setBedsList] = useState(totalBeds);

  // Live filter for audit logs
  const [logFilter, setLogFilter] = useState("ALL");

  const filteredLogs = auditLogs.filter(log => {
    if (logFilter === "ALL") return true;
    return log.role === logFilter;
  });

  const handleBarcodeScan = () => {
    setIsScanning(true);
    addToast("Initializing clinical barcode scanner camera...", "info");
    
    setTimeout(() => {
      setIsScanning(false);
      // Select a random patient from the simulated queue
      const randomIndex = Math.floor(Math.random() * simulatedQueue.length);
      const selected = simulatedQueue[randomIndex];
      setScannedPatient(selected);
      addToast(`BARCODE MATCH: Scanned wristband for Patient ID ${selected.patient.patient_id} (${selected.patient.name})`, "success");
      addAuditLog(`Scanned wristband barcode for ${selected.patient.name} (${selected.patient.patient_id})`);
    }, 2000);
  };

  const handleLaunchScanned = () => {
    if (scannedPatient) {
      selectPatient(scannedPatient);
      window.location.hash = `#/patient/${scannedPatient.patient.patient_id}`;
    }
  };

  const triggerAlertCode = () => {
    triggerERAlert(alertType, alertLoc);
  };

  const assignBedToActivePatient = (bedId: string, patientId: string, name: string) => {
    setBedsList(prev => prev.map(bed => {
      if (bed.id === bedId) {
        return { ...bed, occupied: patientId, patientName: name };
      }
      return bed;
    }));
    addToast(`Patient ${name} routed to Bed ${bedId}.`, "success");
    addAuditLog(`Assigned ${name} to Bed ${bedId}`);
  };

  const dischargeBed = (bedId: string) => {
    const bed = bedsList.find(b => b.id === bedId);
    if (bed && bed.patientName) {
      addToast(`Cleared Bed ${bedId}. Patient disposition set.`, "info");
      addAuditLog(`Discharged Bed ${bedId} - Cleared patient ${bed.patientName}`);
      setBedsList(prev => prev.map(b => {
        if (b.id === bedId) {
          return { ...b, occupied: null, patientName: null };
        }
        return b;
      }));
    }
  };

  const patientsListForSearch = simulatedQueue.filter(p => 
    p.patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.patient.patient_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageTransition id="command-center-page">
      <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto pb-16">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
              <Compass className="h-7 w-7 text-blue-500" />
              ER Clinical Operations & Command Center
            </h1>
            <p className="text-xs text-slate-400 font-semibold mt-1 uppercase tracking-wider">
              Central hospital administration board, bed boards, live audit, and telemetry.
            </p>
          </div>

          <span className="text-[10px] font-black font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-xl uppercase tracking-widest">
            Clinical Role: {activeRole}
          </span>
        </div>

        {/* Outer Command Sub-Tabs */}
        <div className="flex border-b border-white/10 gap-2 pb-0">
          <button
            onClick={() => setActiveSubTab("reception")}
            className={`px-4 py-2.5 text-xs font-extrabold uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
              activeSubTab === "reception"
                ? "border-blue-500 text-blue-400 font-black"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="flex items-center gap-2"><QrCode className="h-4 w-4" /> Reception Desk & Search</span>
          </button>
          <button
            onClick={() => setActiveSubTab("beds")}
            className={`px-4 py-2.5 text-xs font-extrabold uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
              activeSubTab === "beds"
                ? "border-blue-500 text-blue-400 font-black"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="flex items-center gap-2"><Bed className="h-4 w-4" /> Bed Assignment Board</span>
          </button>
          <button
            onClick={() => setActiveSubTab("alerts")}
            className={`px-4 py-2.5 text-xs font-extrabold uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
              activeSubTab === "alerts"
                ? "border-blue-500 text-blue-400 font-black"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Emergency Alerts Hub</span>
          </button>
          <button
            onClick={() => setActiveSubTab("audit")}
            className={`px-4 py-2.5 text-xs font-extrabold uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
              activeSubTab === "audit"
                ? "border-blue-500 text-blue-400 font-black"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="flex items-center gap-2"><Terminal className="h-4 w-4" /> Security Audit Log</span>
          </button>
          <button
            onClick={() => setActiveSubTab("offline")}
            className={`px-4 py-2.5 text-xs font-extrabold uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
              activeSubTab === "offline"
                ? "border-blue-500 text-blue-400 font-black"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="flex items-center gap-2"><Wifi className="h-4 w-4" /> Sync & Telemetry</span>
          </button>
          <button
            onClick={() => setActiveSubTab("ai_learning")}
            className={`px-4 py-2.5 text-xs font-extrabold uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
              activeSubTab === "ai_learning"
                ? "border-violet-500 text-violet-400 font-black"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="flex items-center gap-2"><Brain className="h-4 w-4" /> AI Learning</span>
          </button>
        </div>

        {/* Tab Body Contents */}
        <div className="flex-1">
          
          {/* RECEPTION WORKFLOW */}
          {activeSubTab === "reception" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Wristband Barcode scanner section */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                <Card className="p-6 bg-white/5 border-white/10 flex flex-col gap-4">
                  <div>
                    <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest">
                      Barcode Wristband Scan
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Instantly index arriving ambulance patients or active ward wristbands.
                    </p>
                  </div>

                  <div className="relative border border-white/10 bg-black/40 rounded-xl h-44 overflow-hidden flex flex-col items-center justify-center gap-3">
                    {isScanning ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-blue-950/20 z-10">
                        <div className="w-full h-1 bg-blue-500 animate-[bounce_1.5s_infinite] shadow-lg shadow-blue-500/80" />
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-6 animate-pulse">
                          Scanning active lasers...
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <QrCode className="h-10 w-10 text-slate-500 animate-pulse" />
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Scanner Ready</span>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="primary"
                    disabled={isScanning}
                    leftIcon={<QrCode className="h-4.5 w-4.5" />}
                    onClick={handleBarcodeScan}
                  >
                    {isScanning ? "Scanning..." : "Simulate Wristband Scan"}
                  </Button>

                  {scannedPatient && (
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex flex-col gap-3">
                      <div className="flex justify-between items-center text-[10px] text-emerald-400 font-bold">
                        <span>SCAN CONFIRMED</span>
                        <span>{scannedPatient.patient.patient_id}</span>
                      </div>
                      <div className="text-xs">
                        <p className="font-extrabold text-slate-200">{scannedPatient.patient.name}</p>
                        <p className="text-slate-400 mt-1">Age: {scannedPatient.patient.age}y/o | Complaint: {scannedPatient.visit.chief_complaint}</p>
                      </div>
                      <Button variant="secondary" size="sm" onClick={handleLaunchScanned}>
                        Go to Profile
                      </Button>
                    </div>
                  )}
                </Card>

                {/* Keyboard Shortcuts Documentation */}
                <Card className="p-6 bg-[#0E1320] border-white/10 flex flex-col gap-3">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                    <Keyboard className="h-4.5 w-4.5 text-blue-400" />
                    <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">
                      Clinician Hotkeys
                    </h3>
                  </div>
                  <div className="flex flex-col gap-2 text-xs font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Main Dashboard</span>
                      <kbd className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-100">ALT + D</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Live Triage Streams</span>
                      <kbd className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-100">ALT + S</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Nurse Intake Desk</span>
                      <kbd className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-100">ALT + N</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Operations CommandCenter</span>
                      <kbd className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-100">ALT + O</kbd>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Patient Search & Fast Registration desk */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                <Card className="p-6 bg-white/5 border-white/10">
                  <div className="flex flex-col gap-4">
                    <div>
                      <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest">
                        Patient Directory Finder
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Live search the global hospital registry containing historical triage archives.
                      </p>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search patient name, ID, or phone number..."
                        className="w-full bg-black/20 border border-white/10 rounded-xl h-11 pl-11 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                      />
                    </div>

                    <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto mt-2">
                      {patientsListForSearch.length === 0 ? (
                        <p className="text-xs text-slate-500 italic p-4 text-center">No patients found matching the search criteria.</p>
                      ) : (
                        patientsListForSearch.map((p) => (
                          <div
                            key={p.patient.patient_id}
                            onClick={() => {
                              selectPatient(p);
                              window.location.hash = `#/patient/${p.patient.patient_id}`;
                            }}
                            className="p-3 bg-white/5 border border-white/5 hover:border-white/10 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-xs text-slate-200">{p.patient.name}</span>
                              <span className="text-[10px] text-slate-500 font-semibold">{p.patient.patient_id} • {p.patient.gender}, {p.patient.age}y/o</span>
                            </div>
                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">View EHR</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* BED ASSIGNMENT */}
          {activeSubTab === "beds" && (
            <div className="flex flex-col gap-6">
              <Card className="p-6 bg-white/5 border-white/10">
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest">
                    Emergency Bed Board Grid
                  </h3>
                  <p className="text-xs text-slate-400">
                    Drag/drop or click to assign triaged patients from the live stream into active physical cubicles.
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  {bedsList.map((bed) => (
                    <div 
                      key={bed.id} 
                      className={`p-4 rounded-xl border flex flex-col justify-between gap-4 h-32 transition-all ${
                        bed.occupied 
                          ? "bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-lg shadow-blue-500/5" 
                          : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-black text-slate-200">{bed.id}</span>
                          <p className="text-[9px] text-slate-500 font-semibold uppercase">{bed.type}</p>
                        </div>
                        <Bed className={`h-4.5 w-4.5 ${bed.occupied ? "text-blue-400" : "text-slate-600"}`} />
                      </div>

                      {bed.occupied ? (
                        <div className="flex flex-col">
                          <span className="text-xs font-extrabold text-slate-100 truncate">{bed.patientName}</span>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-[8px] font-mono text-slate-500">{bed.occupied}</span>
                            <button
                              onClick={() => dischargeBed(bed.id)}
                              className="text-[9px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-1.5 py-0.5 rounded uppercase"
                            >
                              Discharge
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-slate-500 font-semibold italic">EMPTY</span>
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                const selected = simulatedQueue.find(p => p.patient.patient_id === e.target.value);
                                if (selected) {
                                  assignBedToActivePatient(bed.id, selected.patient.patient_id, selected.patient.name);
                                }
                              }
                            }}
                            className="mt-2 w-full bg-slate-900 border border-white/10 rounded h-7 px-1.5 text-[10px] font-bold text-slate-400 focus:outline-none focus:border-blue-500"
                          >
                            <option value="">+ Assign Patient</option>
                            {simulatedQueue.map(p => (
                              <option key={p.patient.patient_id} value={p.patient.patient_id}>
                                {p.patient.name} ({p.patient.patient_id})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* EMERGENCY ALERTS HUB */}
          {activeSubTab === "alerts" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              
              {/* Trigger Launcher */}
              <Card className="md:col-span-1 p-6 bg-white/5 border-white/10 flex flex-col gap-4">
                <div>
                  <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest">
                    Emergency Protocol Launcher
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Immediately broadcast high-priority clinical emergency codes globally across all screens.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Emergency Code Type</label>
                  <select
                    value={alertType}
                    onChange={(e) => setAlertType(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-xl h-10 px-3 text-xs font-bold text-slate-200 focus:outline-none"
                  >
                    <option>Code Blue (Cardiac Arrest)</option>
                    <option>Mass Casualty Event</option>
                    <option>Trauma Alert</option>
                    <option>Stroke Protocol</option>
                    <option>Neonatal Code Pink</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Location / Zone</label>
                  <input
                    value={alertLoc}
                    onChange={(e) => setAlertLoc(e.target.value)}
                    placeholder="e.g. Trauma Bay 1, ER Waiting Room"
                    className="bg-white/5 border border-white/10 rounded-xl h-10 px-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <Button
                  variant="danger"
                  leftIcon={<ShieldAlert className="h-4.5 w-4.5 animate-pulse" />}
                  onClick={triggerAlertCode}
                >
                  BROADCAST EMERGENCY ALERT
                </Button>
              </Card>

              {/* Active list */}
              <Card className="md:col-span-2 p-6 bg-white/5 border-white/10">
                <div className="flex flex-col gap-1 mb-4">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">
                    Active Clinical Broadcast Log
                  </h3>
                  <p className="text-xs text-slate-400">Active alerts currently visible to clinicians on shift.</p>
                </div>

                <div className="flex flex-col gap-3">
                  {erAlerts.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-4 text-center">No active ER emergency protocols triggered.</p>
                  ) : (
                    erAlerts.map((alert) => (
                      <div 
                        key={alert.id} 
                        className={`p-4 border rounded-xl flex justify-between items-center ${
                          alert.status === "Active" 
                            ? "bg-red-500/10 border-red-500/30 text-red-400" 
                            : "bg-white/5 border-white/5 text-slate-500"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <ShieldAlert className={`h-5 w-5 ${alert.status === "Active" ? "animate-pulse" : ""}`} />
                          <div className="flex flex-col gap-0.5">
                            <span className="font-extrabold text-sm">{alert.type}</span>
                            <span className="text-xs">Location: {alert.location} • {new Date(alert.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>

                        {alert.status === "Active" ? (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => resolveERAlert(alert.id)}
                          >
                            Resolve Code
                          </Button>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" /> Resolved
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* AUDIT LOGS */}
          {activeSubTab === "audit" && (
            <Card className="p-6 bg-white/5 border-white/10">
              <div className="flex justify-between items-center flex-wrap gap-4 border-b border-white/10 pb-4 mb-4">
                <div>
                  <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest">
                    HIPAA Compliance Audit Trail Console
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Logs every single clinical intervention, login switch, wristband scan, and disposition change.</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Filter Role:</span>
                  <select
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-slate-300 focus:outline-none"
                  >
                    <option value="ALL">ALL ROLES</option>
                    <option value="Receptionist">Receptionist</option>
                    <option value="Triage Nurse">Triage Nurse</option>
                    <option value="ER Physician">ER Physician</option>
                    <option value="ER Charge Nurse">ER Charge Nurse</option>
                    <option value="IT Administrator">IT Admin</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-2">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-[#090c12] border border-white/5 rounded-xl font-mono text-xs flex justify-between items-start gap-4 hover:border-white/10 transition-colors">
                    <div className="flex flex-col gap-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">[{log.role}]</span>
                        <span className="text-[10px] text-slate-500 font-bold">{log.user}</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed mt-1">{log.action}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0 font-bold">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* SYNC & OFFLINE TELEMETRY */}
          {activeSubTab === "offline" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              
              {/* Telemetry status cards */}
              <Card className="p-6 bg-white/5 border-white/10 flex flex-col gap-6">
                <div>
                  <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest">
                    Local-First Synchronization Telemetry
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Monitors active pipeline heartbeats, background indexing queues, and connection packages.</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-3 bg-black/20 border border-white/5 rounded-xl flex flex-col gap-1">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Database Sync State</span>
                    <span className="text-emerald-400 font-extrabold flex items-center gap-1.5 mt-1.5">
                      <CheckCircle className="h-4 w-4" /> LOCAL_STORE_UP
                    </span>
                  </div>
                  <div className="p-3 bg-black/20 border border-white/5 rounded-xl flex flex-col gap-1">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">FastAPI Status</span>
                    {isOffline ? (
                      <span className="text-yellow-400 font-extrabold flex items-center gap-1.5 mt-1.5">
                        <WifiOff className="h-4 w-4 animate-pulse" /> OFFLINE_STANDALONE
                      </span>
                    ) : (
                      <span className="text-blue-400 font-extrabold flex items-center gap-1.5 mt-1.5">
                        <Wifi className="h-4 w-4 animate-ping" /> ONLINE_LINKED
                      </span>
                    )}
                  </div>
                  <div className="p-3 bg-black/20 border border-white/5 rounded-xl flex flex-col gap-1">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Sync Queue Delay</span>
                    <span className="text-slate-200 font-extrabold mt-1.5">0 ms (Instantaneous)</span>
                  </div>
                  <div className="p-3 bg-black/20 border border-white/5 rounded-xl flex flex-col gap-1">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">HL7/FHIR Protocol</span>
                    <span className="text-slate-200 font-extrabold mt-1.5">JSON_v4_COMPLIANT</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="primary" leftIcon={<RotateCw className="h-4 w-4" />}>Force Telemetry Re-Index</Button>
                  <Button variant="secondary">Download Offline Cache</Button>
                </div>
              </Card>

              {/* API Readiness & FHIR details */}
              <Card className="p-6 bg-[#0E1320] border-white/10 flex flex-col gap-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">
                    Enterprise Hospital API & HL7 Integration
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">AarogyaQ is fully prepared for cloud deployment in hospital systems.</p>
                </div>

                <div className="text-xs text-slate-400 leading-relaxed flex flex-col gap-3">
                  <p>
                    <strong>HL7 / FHIR compliance:</strong> The neural triage risk payload formats map cleanly into standard <strong className="text-slate-200 font-bold">FHIR Triage Encounter resources</strong>. Every patient registered produces standard JSON structures consumable by Epic, Cerner, and other EMR systems.
                  </p>
                  <div className="bg-black/30 border border-white/10 p-3 rounded-lg font-mono text-[10px] text-blue-300 max-h-44 overflow-y-auto">
{`// FHIR Compliant Triage Mapping Schema
{
  "resourceType": "Encounter",
  "status": "arrived",
  "priority": {
    "coding": [{
      "system": "http://hl7.org/fhir/v3/ActPriority",
      "code": "CR",
      "display": "Critical"
    }]
  },
  "subject": {
    "reference": "Patient/P-781",
    "display": "Rohan Deshmukh"
  },
  "extension": [{
    "url": "http://aarogyaq.in/risk-score",
    "valueDecimal": 94.0
  }]
}`}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* AI LEARNING TAB */}
          {activeSubTab === "ai_learning" && (
            <div className="py-4">
              <RLDashboard />
            </div>
          )}

        </div>
      </div>
    </PageTransition>
  );
};
