/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  ArrowLeft, 
  User, 
  Phone, 
  CalendarRange, 
  Heart, 
  FileText, 
  Pill, 
  Dna, 
  Activity, 
  Plus, 
  Check, 
  Building, 
  Bed, 
  ShieldCheck,
  Stethoscope,
  Send
} from "lucide-react";
import { usePatientStore } from "../store/usePatientStore";
import { useUIStore } from "../store/useUIStore";
import { simulatedQueue } from "../api/simulatedDb";
import { PageTransition } from "../components/layout/PageTransition";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { TimelineEntry } from "../components/patient/TimelineEntry";
import { EmptyState } from "../components/ui/EmptyState";
import { 
  addClinicalNote, 
  addMedicationOrder, 
  addLabOrder, 
  addRadiologyOrder, 
  updateVisitStatus, 
  assignBed, 
  transferDepartment 
} from "../api/visits";

export const PatientHistory: React.FC = () => {
  const { selectedPatient, selectPatient, patientHistory, fetchPatientHistory } = usePatientStore();
  const { activeRole, addToast, addAuditLog } = useUIStore();
  const [patientId, setPatientId] = useState("");

  // Clinician workspace states
  const [activeTab, setActiveTab] = useState<"notes" | "meds" | "diagnostics" | "disposition">("notes");
  const [noteText, setNoteText] = useState("");
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFreq, setMedFreq] = useState("");
  const [selectedLab, setSelectedLab] = useState("Troponin I (High Sensitivity)");
  const [selectedRad, setSelectedRad] = useState("Chest X-Ray");
  const [bedInput, setBedInput] = useState("");
  const [deptInput, setDeptInput] = useState("");

  // Extract ID from Hash Route
  useEffect(() => {
    const handleRouteParsing = () => {
      const hash = window.location.hash;
      const parts = hash.split("/");
      const id = parts[parts.length - 1];
      if (id && id !== "patient") {
        setPatientId(id);
        
        // Load from simulated DB
        if (!selectedPatient || selectedPatient.patient.patient_id !== id) {
          const match = simulatedQueue.find((q) => q.patient.patient_id === id);
          if (match) {
            selectPatient(match);
          }
        }
      }
    };

    handleRouteParsing();
    window.addEventListener("hashchange", handleRouteParsing);
    return () => window.removeEventListener("hashchange", handleRouteParsing);
  }, [selectedPatient, selectPatient]);

  // Sync history once ID is populated
  useEffect(() => {
    if (patientId) {
      fetchPatientHistory(patientId);
      
      const match = simulatedQueue.find((q) => q.patient.patient_id === patientId);
      if (match) {
        setBedInput(match.visit.bed_assigned || "");
        setDeptInput(match.visit.department_assigned || "");
      }
    }
  }, [patientId, fetchPatientHistory]);

  const handleBack = () => {
    window.location.hash = "#/dashboard";
  };

  const refreshPatientData = async () => {
    if (patientId) {
      await fetchPatientHistory(patientId);
      const match = simulatedQueue.find((q) => q.patient.patient_id === patientId);
      if (match) {
        selectPatient(match);
      }
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    const author = activeRole === "Doctor" ? "Dr. Arvind Swamy" : "Nurse Rahul";
    await addClinicalNote(selectedPatient!.visit.visit_id, author, noteText);
    addAuditLog(`Added clinical note for Patient ${selectedPatient!.patient.name} (${patientId})`);
    addToast("Clinical progress note saved.", "success");
    setNoteText("");
    await refreshPatientData();
  };

  const handleAddMed = async () => {
    if (!medName.trim() || !medDosage.trim()) {
      addToast("Please fill in medication name and dosage.", "warning");
      return;
    }
    const doctor = activeRole === "Doctor" ? "Dr. Arvind Swamy" : "Dr. Swamy (via Nurse)";
    await addMedicationOrder(selectedPatient!.visit.visit_id, doctor, medName, medDosage, medFreq || "Once Stat");
    addAuditLog(`Ordered medication ${medName} ${medDosage} for Patient ${selectedPatient!.patient.name} (${patientId})`);
    addToast(`Ordered: ${medName} ${medDosage}`, "success");
    setMedName("");
    setMedDosage("");
    setMedFreq("");
    await refreshPatientData();
  };

  const handleOrderLab = async () => {
    const doctor = activeRole === "Doctor" ? "Dr. Arvind Swamy" : "Dr. Swamy (via Nurse)";
    await addLabOrder(selectedPatient!.visit.visit_id, doctor, selectedLab);
    addAuditLog(`Ordered laboratory panel: ${selectedLab} for Patient ${selectedPatient!.patient.name} (${patientId})`);
    addToast(`Laboratory panel ordered: ${selectedLab}`, "success");
    await refreshPatientData();
  };

  const handleOrderRad = async () => {
    const doctor = activeRole === "Doctor" ? "Dr. Arvind Swamy" : "Dr. Swamy (via Nurse)";
    await addRadiologyOrder(selectedPatient!.visit.visit_id, doctor, selectedRad);
    addAuditLog(`Ordered radiology scan: ${selectedRad} for Patient ${selectedPatient!.patient.name} (${patientId})`);
    addToast(`Radiology order saved: ${selectedRad}`, "success");
    await refreshPatientData();
  };

  const handleUpdateDisposition = async (status: string) => {
    await updateVisitStatus(selectedPatient!.visit.visit_id, status);
    addAuditLog(`Updated patient disposition status to ${status} for ${selectedPatient!.patient.name}`);
    addToast(`Patient disposition updated to ${status}.`, "success");
    await refreshPatientData();
  };

  const handleSaveBedAndDept = async () => {
    await assignBed(selectedPatient!.visit.visit_id, bedInput);
    await transferDepartment(selectedPatient!.visit.visit_id, deptInput);
    addAuditLog(`Updated Bed: ${bedInput || "Unassigned"} & Ward: ${deptInput} for Patient ${selectedPatient!.patient.name}`);
    addToast("Bed and Routing Department updated successfully.", "success");
    await refreshPatientData();
  };

  if (!selectedPatient) {
    return (
      <PageTransition id="patient-history-loading">
        <div className="max-w-2xl mx-auto py-12">
          <EmptyState
            title="Patient Profile Not Found"
            description="Could not locate the requested clinical patient record in the active database registry."
            action={
              <Button variant="primary" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={handleBack}>
                Back to Desk
              </Button>
            }
          />
        </div>
      </PageTransition>
    );
  }

  const { name, age, gender, phone } = selectedPatient.patient;
  const visit = selectedPatient.visit;

  return (
    <PageTransition id="patient-history-page">
      <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-20 overflow-y-auto max-h-full">
        {/* Back and Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={handleBack}
            >
              Back to Desk
            </Button>

            <div className="flex-1">
              <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">
                Patient Clinical Archive
              </h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Secure electronic health records and neural triage timelines
              </p>
            </div>
          </div>

          <span className="text-[10px] font-extrabold font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Checked in
          </span>
        </div>

        {/* Patient Demographics Banner Card */}
        <Card className="p-6 bg-[#0E1320] border-white/10 flex items-center justify-between flex-wrap gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-slate-400 shadow-md">
              <User className="h-6 w-6" />
            </div>
            
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-extrabold text-slate-100 tracking-tight leading-none flex items-center gap-2">
                {name}
                {visit.bed_assigned && (
                  <span className="text-[10px] font-black font-mono bg-blue-500/15 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded uppercase">
                    {visit.bed_assigned}
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                <span className="font-semibold tabular text-slate-500">{patientId}</span>
                <span>•</span>
                <span>{gender}, {age}y/o</span>
                <span>•</span>
                <span className="text-blue-400 font-bold">{visit.status}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end text-right gap-1 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 font-medium">
              <Phone className="h-3.5 w-3.5 text-slate-500" />
              <span>{phone || "N/A"}</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <CalendarRange className="h-3.5 w-3.5 text-slate-500" />
              <span>Visit Reg: {visit.registered_at ? new Date(visit.registered_at).toLocaleTimeString("en-IN") : "Today"}</span>
            </div>
          </div>
        </Card>

        {/* ER Clinician Workspace Section */}
        <Card className="border-blue-500/20 bg-[#0c101a]/95 backdrop-blur-md shadow-2xl overflow-hidden">
          <div className="border-b border-white/10 bg-white/5 px-6 py-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-blue-400" />
              <h3 className="text-sm font-black text-slate-100 uppercase tracking-tight">
                ER Clinician CPOE Workspace
              </h3>
            </div>
            <span className="text-[9px] font-black font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded uppercase tracking-widest">
              Active Role: {activeRole}
            </span>
          </div>

          <div className="p-6">
            {/* Tabs Row */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveTab("notes")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "notes"
                    ? "bg-blue-500/10 border border-blue-500/30 text-blue-400"
                    : "border border-white/5 hover:border-white/10 text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileText className="h-4 w-4" /> Clinical Notes
              </button>
              <button
                onClick={() => setActiveTab("meds")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "meds"
                    ? "bg-blue-500/10 border border-blue-500/30 text-blue-400"
                    : "border border-white/5 hover:border-white/10 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Pill className="h-4 w-4" /> Medication Orders
              </button>
              <button
                onClick={() => setActiveTab("diagnostics")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "diagnostics"
                    ? "bg-blue-500/10 border border-blue-500/30 text-blue-400"
                    : "border border-white/5 hover:border-white/10 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Dna className="h-4 w-4" /> Labs & Radiology
              </button>
              <button
                onClick={() => setActiveTab("disposition")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "disposition"
                    ? "bg-blue-500/10 border border-blue-500/30 text-blue-400"
                    : "border border-white/5 hover:border-white/10 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Activity className="h-4 w-4" /> Bed & Disposition
              </button>
            </div>

            {/* Tab Contents */}
            {activeTab === "notes" && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Add Patient Clinical Note
                  </label>
                  <div className="flex gap-2">
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Enter clinical signs, progression notes, trauma updates..."
                      className="flex-1 min-h-[72px] bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
                    />
                    <Button
                      variant="primary"
                      className="shrink-0 h-auto"
                      rightIcon={<Send className="h-4 w-4" />}
                      onClick={handleAddNote}
                    >
                      Log Note
                    </Button>
                  </div>
                </div>

                {/* List of active progress notes */}
                <div className="flex flex-col gap-3 mt-2">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                    Progress Note History
                  </h4>
                  {(!visit.clinical_notes || visit.clinical_notes.length === 0) ? (
                    <p className="text-xs text-slate-500 italic">No notes logged yet during this visit.</p>
                  ) : (
                    <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                      {visit.clinical_notes.map((note, index) => (
                        <div key={index} className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs leading-relaxed flex flex-col gap-1.5">
                          <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                            <span className="text-blue-400">{note.author}</span>
                            <span className="font-mono text-slate-500">
                              {new Date(note.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-slate-200">{note.note}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "meds" && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Medication Name</label>
                    <input
                      value={medName}
                      onChange={(e) => setMedName(e.target.value)}
                      placeholder="e.g. Fentanyl, Aspirin, NTG"
                      className="bg-white/5 border border-white/10 rounded-xl h-10 px-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dosage</label>
                    <input
                      value={medDosage}
                      onChange={(e) => setMedDosage(e.target.value)}
                      placeholder="e.g. 50 mcg IV, 325 mg PO"
                      className="bg-white/5 border border-white/10 rounded-xl h-10 px-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Frequency</label>
                    <div className="flex gap-2">
                      <input
                        value={medFreq}
                        onChange={(e) => setMedFreq(e.target.value)}
                        placeholder="e.g. Stat, q4h PRN"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl h-10 px-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                      />
                      <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={handleAddMed}>
                        Order
                      </Button>
                    </div>
                  </div>
                </div>

                {/* List of active medication orders */}
                <div className="flex flex-col gap-3 mt-2">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                    Active Medication Orders (CPOE)
                  </h4>
                  {(!visit.medication_orders || visit.medication_orders.length === 0) ? (
                    <p className="text-xs text-slate-500 italic">No medications ordered.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                      {visit.medication_orders.map((med, index) => (
                        <div key={index} className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs flex justify-between items-start gap-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-extrabold text-slate-100">{med.name}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{med.dosage} • {med.frequency}</span>
                            <span className="text-[9px] text-slate-500 mt-1">Ordered by {med.doctor}</span>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            med.status === "Administered" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                          }`}>
                            {med.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "diagnostics" && (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Labs Order */}
                  <div className="flex flex-col gap-3 p-4 bg-white/5 border border-white/10 rounded-xl">
                    <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none">
                      Order Laboratory Diagnostics
                    </h4>
                    <div className="flex gap-2">
                      <select
                        value={selectedLab}
                        onChange={(e) => setSelectedLab(e.target.value)}
                        className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-3 text-xs font-bold text-slate-200 focus:outline-none"
                      >
                        <option>Troponin I (High Sensitivity)</option>
                        <option>Complete Blood Count (CBC) with Diff</option>
                        <option>Basic Metabolic Panel (BMP)</option>
                        <option>Arterial Blood Gas (ABG)</option>
                        <option>Coagulation Profile (PT/INR)</option>
                      </select>
                      <Button variant="primary" size="sm" onClick={handleOrderLab}>Order</Button>
                    </div>

                    <div className="flex flex-col gap-2 mt-2">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">Lab Orders</span>
                      {(!visit.laboratory_orders || visit.laboratory_orders.length === 0) ? (
                        <span className="text-[11px] text-slate-500 italic">No lab orders logged.</span>
                      ) : (
                        <div className="flex flex-col gap-1.5 max-h-[120px] overflow-y-auto">
                          {visit.laboratory_orders.map((lab, index) => (
                            <div key={index} className="text-xs flex justify-between items-center bg-white/5 border border-white/5 p-2 rounded-lg">
                              <span className="font-semibold text-slate-300 truncate max-w-[65%]">{lab.test_name}</span>
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                lab.status === "Completed" ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400 animate-pulse"
                              }`}>{lab.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Radiology Order */}
                  <div className="flex flex-col gap-3 p-4 bg-white/5 border border-white/10 rounded-xl">
                    <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest leading-none">
                      Order Radiology Imaging
                    </h4>
                    <div className="flex gap-2">
                      <select
                        value={selectedRad}
                        onChange={(e) => setSelectedRad(e.target.value)}
                        className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-3 text-xs font-bold text-slate-200 focus:outline-none"
                      >
                        <option>Chest X-Ray (AP/Lateral)</option>
                        <option>CT Head (Non-contrast)</option>
                        <option>CT Angiography Chest</option>
                        <option>FAST Ultrasound Abdomen</option>
                        <option>Pelvis X-Ray</option>
                      </select>
                      <Button variant="primary" size="sm" onClick={handleOrderRad}>Order</Button>
                    </div>

                    <div className="flex flex-col gap-2 mt-2">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">Imaging Orders</span>
                      {(!visit.radiology_orders || visit.radiology_orders.length === 0) ? (
                        <span className="text-[11px] text-slate-500 italic">No radiology orders logged.</span>
                      ) : (
                        <div className="flex flex-col gap-1.5 max-h-[120px] overflow-y-auto">
                          {visit.radiology_orders.map((rad, index) => (
                            <div key={index} className="text-xs flex justify-between items-center bg-white/5 border border-white/5 p-2 rounded-lg">
                              <span className="font-semibold text-slate-300 truncate max-w-[65%]">{rad.scan_type}</span>
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                rad.status === "Completed" ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400 animate-pulse"
                              }`}>{rad.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "disposition" && (
              <div className="flex flex-col gap-6">
                {/* Disposition status actions */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col gap-3">
                  <h4 className="text-[10px] font-bold text-orange-400 uppercase tracking-widest leading-none">
                    Update Patient Clinical Disposition
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={visit.status === "TRIAGED" ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => handleUpdateDisposition("TRIAGED")}
                    >
                      Disposition: Triaged
                    </Button>
                    <Button
                      variant={visit.status === "ADMITTED" ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => handleUpdateDisposition("ADMITTED")}
                    >
                      Admit to Ward
                    </Button>
                    <Button
                      variant={visit.status === "DISCHARGED" ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => handleUpdateDisposition("DISCHARGED")}
                    >
                      Discharge Patient
                    </Button>
                    <Button
                      variant={visit.status === "TRANSFERRED" ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => handleUpdateDisposition("TRANSFERRED")}
                    >
                      Transfer Out of ER
                    </Button>
                  </div>
                </div>

                {/* Ward and Bed Management Form */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col gap-4">
                  <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none">
                    Assign Bed & Routing Ward
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bed Assignment</label>
                      <input
                        value={bedInput}
                        onChange={(e) => setBedInput(e.target.value)}
                        placeholder="e.g. Bed 03, Cubicle B-2"
                        className="bg-white/5 border border-white/10 rounded-xl h-10 px-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Routing Department</label>
                      <select
                        value={deptInput}
                        onChange={(e) => setDeptInput(e.target.value)}
                        className="bg-zinc-900 border border-white/10 rounded-xl h-10 px-3 text-xs font-bold text-slate-200 focus:outline-none focus:border-blue-500/50"
                      >
                        <option value="Cardiology">Cardiology</option>
                        <option value="Neurology">Neurology</option>
                        <option value="Traumatology">Traumatology</option>
                        <option value="Pulmonology">Pulmonology</option>
                        <option value="Pediatrics">Pediatrics</option>
                        <option value="General Medicine">General Medicine</option>
                      </select>
                    </div>
                  </div>
                  <Button variant="secondary" className="self-end" onClick={handleSaveBedAndDept}>
                    Apply Assignment
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Triage Log / History Timeline */}
        <div className="mt-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-white/10 pb-3 mb-6 flex items-center gap-2">
            <CalendarRange className="h-4.5 w-4.5 text-blue-400" /> Longitudinal Triage Encounters ({patientHistory.length})
          </h3>

          {patientHistory.length === 0 ? (
            <EmptyState
              title="No Encounters"
              description="No prior clinical triage sessions logged for this patient profile."
            />
          ) : (
            <div className="flex flex-col relative pl-2">
              {/* Timeline Items */}
              {patientHistory.map((historyItem, idx) => (
                <TimelineEntry
                  key={historyItem.visit.visit_id}
                  item={historyItem}
                  isLast={idx === patientHistory.length - 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};
