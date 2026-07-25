/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, HeartPulse, Brain, CheckCircle2, ChevronRight, ChevronLeft, RefreshCw, Clipboard } from "lucide-react";
import { usePatientStore } from "../store/usePatientStore";
import { useUIStore } from "../store/useUIStore";
import { PageTransition } from "../components/layout/PageTransition";
import { Card } from "../components/ui/Card";
import { Stepper } from "../components/ui/Stepper";
import { Input } from "../components/ui/Input";
import { Slider } from "../components/ui/Slider";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { ProgressRing } from "../components/ui/ProgressRing";
import { PriorityBadge } from "../components/queue/PriorityBadge";
import { ExplainabilityPanel } from "../components/queue/ExplainabilityPanel";

export const NurseIntake: React.FC = () => {
  const { submitIntake, isSubmitting, triageResult, resetIntake } = usePatientStore();
  const { addToast } = useUIStore();

  const [step, setStep] = useState(0); // 0, 1, 2 (2 is results)
  
  // Step 1 Form Data
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [phone, setPhone] = useState("");

  // Step 2 Form Data
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [painLevel, setPainLevel] = useState(5);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState("");

  // Vital Signs Form Data
  const [spo2, setSpo2] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [temperature, setTemperature] = useState("");
  const [systolicBP, setSystolicBP] = useState("");
  const [diastolicBP, setDiastolicBP] = useState("");
  const [respRate, setRespRate] = useState("");

  // Validation states
  const [errors, setErrors] = useState<Record<string, string>>({});

  const predefinedSymptoms = [
    "Chest Pain",
    "Shortness of Breath",
    "Slurred Speech",
    "Severe Headache",
    "Unilateral Weakness",
    "High Fever",
    "Nausea",
    "Abdominal Pain",
    "Open Fracture",
    "Active Bleeding",
    "Dizziness",
  ];

  const handleToggleSymptom = (symptom: string) => {
    if (symptoms.includes(symptom)) {
      setSymptoms(symptoms.filter((s) => s !== symptom));
    } else {
      setSymptoms([...symptoms, symptom]);
    }
  };

  const handleAddCustomSymptom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSymptom.trim()) return;
    if (!symptoms.includes(customSymptom.trim())) {
      setSymptoms([...symptoms, customSymptom.trim()]);
    }
    setCustomSymptom("");
  };

  const handleRemoveSymptom = (symptom: string) => {
    setSymptoms(symptoms.filter((s) => s !== symptom));
  };

  // Step 1 Validation
  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Patient full name is required";
    if (!age || Number(age) <= 0) newErrors.age = "A valid positive age is required";
    if (!phone.trim()) newErrors.phone = "Contact phone number is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (!chiefComplaint.trim()) newErrors.chiefComplaint = "Chief complaint description is required";
    if (symptoms.length === 0) {
      newErrors.symptoms = "Please select or enter at least one clinical symptom";
      addToast("At least one symptom is required for precise AI scoring.", "warning");
    }

    // Advanced Clinical Vital Signs Validation
    if (spo2 && (Number(spo2) < 50 || Number(spo2) > 100)) {
      newErrors.spo2 = "SpO2 must be between 50% and 100%";
    }
    if (heartRate && (Number(heartRate) < 30 || Number(heartRate) > 250)) {
      newErrors.heartRate = "Heart rate must be 30-250 bpm";
    }
    if (temperature && (Number(temperature) < 90 || Number(temperature) > 115)) {
      newErrors.temperature = "Temp must be 90°F-115°F";
    }
    if (systolicBP && (Number(systolicBP) < 40 || Number(systolicBP) > 300)) {
      newErrors.systolicBP = "Systolic BP must be 40-300 mmHg";
    }
    if (diastolicBP && (Number(diastolicBP) < 30 || Number(diastolicBP) > 200)) {
      newErrors.diastolicBP = "Diastolic BP must be 30-200 mmHg";
    }
    if (respRate && (Number(respRate) < 5 || Number(respRate) > 60)) {
      newErrors.respRate = "Resp Rate must be 5-60 breaths/min";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (step === 0) {
      if (validateStep1()) setStep(1);
    }
  };

  const handlePrevStep = () => {
    if (step === 1) setStep(0);
  };

  const handleSubmitIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;

    const payload = {
      name,
      age: Number(age),
      gender,
      phone,
      pain_level: painLevel,
      chief_complaint: chiefComplaint,
      symptoms,
      vitals: {
        heart_rate: heartRate ? Number(heartRate) : undefined,
        systolic_bp: systolicBP ? Number(systolicBP) : undefined,
        diastolic_bp: diastolicBP ? Number(diastolicBP) : undefined,
        spo2: spo2 ? Number(spo2) : undefined,
        temperature: temperature ? Number(temperature) : undefined,
        respiratory_rate: respRate ? Number(respRate) : undefined,
      }
    };

    // Submits via patientStore, triggering isSubmitting state
    const result = await submitIntake(payload);
    if (result) {
      setStep(2); // advance to results screen
    }
  };

  const handleResetForm = () => {
    setName("");
    setAge("");
    setGender("Male");
    setPhone("");
    setChiefComplaint("");
    setPainLevel(5);
    setSymptoms([]);
    setSpo2("");
    setHeartRate("");
    setTemperature("");
    setSystolicBP("");
    setDiastolicBP("");
    setRespRate("");
    setErrors({});
    resetIntake();
    setStep(0);
  };

  const steps = [
    { label: "Biodata", description: "Demographics & Info" },
    { label: "Diagnostics", description: "Complaints & Vitals" },
    { label: "AI Score", description: "Triage Assessment" },
  ];

  return (
    <PageTransition id="nurse-intake-page">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        {/* Page title */}
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            Emergency Triage Registration
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-1 uppercase tracking-wider">
            Register and live-triage incoming cases with the clinical neural model.
          </p>
        </div>

        {/* Stepper indicators */}
        <Card className="p-6">
          <Stepper steps={steps} currentStep={step} />

          {/* Form Step Contents */}
          <div className="mt-4">
            <AnimatePresence mode="wait">
              {/* Step 0: Demographics */}
              {step === 0 && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col gap-5"
                >
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-white/10 pb-2 flex items-center gap-2">
                    <Clipboard className="h-4 w-4 text-blue-500" /> Patient Demographics
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      id="patient-name-input"
                      label="Patient Full Name"
                      placeholder="e.g. Shreya Ghoshal"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      error={errors.name}
                    />
                    <Input
                      id="patient-phone-input"
                      label="Contact Number"
                      placeholder="e.g. +91 98765 00112"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      error={errors.phone}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      id="patient-age-input"
                      label="Age (Years)"
                      type="number"
                      placeholder="e.g. 45"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      error={errors.age}
                    />
                    
                    <div className="flex flex-col gap-1.5 w-full">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Gender Designation
                      </label>
                      <div className="grid grid-cols-3 gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
                        {["Male", "Female", "Other"].map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setGender(g)}
                            className={`py-2 text-xs font-bold uppercase rounded-lg transition-all cursor-pointer ${
                              gender === g
                                ? "bg-white/10 text-slate-100 border border-white/10"
                                : "text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-white/10">
                    <Button
                      id="step0-next-btn"
                      variant="primary"
                      rightIcon={<ChevronRight className="h-4 w-4" />}
                      onClick={handleNextStep}
                    >
                      Assess Vitals
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 1: Diagnostics Complaints */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col gap-6"
                >
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-white/10 pb-2 flex items-center gap-2">
                    <HeartPulse className="h-4 w-4 text-blue-400 animate-pulse" /> Diagnostics & Chief Complaints
                  </h3>

                  {/* Complaint */}
                  <Input
                    id="chief-complaint-input"
                    label="Chief Complaint"
                    placeholder="e.g. Experiencing stabbing chest discomfort radiating down the arm"
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    error={errors.chiefComplaint}
                    helperText="Keep detailed notes on duration, trigger events, and severity characteristics."
                  />

                  {/* Pain level slider */}
                  <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                    <Slider
                      id="pain-slider"
                      label="Subjective Pain Scale"
                      value={painLevel}
                      onChange={setPainLevel}
                    />
                  </div>

                  {/* Direct Vital Signs Entry Grid */}
                  <div className="bg-gradient-to-b from-[#131824] to-[#0e121d] border border-white/10 p-5 rounded-xl flex flex-col gap-4">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                      <HeartPulse className="h-4.5 w-4.5 text-emerald-400 animate-pulse" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Objective Vital Signs Entry
                      </h4>
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase ml-auto">
                        Clinical Input
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <Input
                        id="vital-spo2"
                        label="SpO2 (%)"
                        type="number"
                        placeholder="e.g. 98"
                        value={spo2}
                        onChange={(e) => setSpo2(e.target.value)}
                        error={errors.spo2}
                      />
                      <Input
                        id="vital-hr"
                        label="Pulse Rate (bpm)"
                        type="number"
                        placeholder="e.g. 72"
                        value={heartRate}
                        onChange={(e) => setHeartRate(e.target.value)}
                        error={errors.heartRate}
                      />
                      <Input
                        id="vital-temp"
                        label="Body Temp (°F)"
                        type="number"
                        step="0.1"
                        placeholder="e.g. 98.6"
                        value={temperature}
                        onChange={(e) => setTemperature(e.target.value)}
                        error={errors.temperature}
                      />
                      <Input
                        id="vital-sbp"
                        label="Systolic BP (mmHg)"
                        type="number"
                        placeholder="e.g. 120"
                        value={systolicBP}
                        onChange={(e) => setSystolicBP(e.target.value)}
                        error={errors.systolicBP}
                      />
                      <Input
                        id="vital-dbp"
                        label="Diastolic BP (mmHg)"
                        type="number"
                        placeholder="e.g. 80"
                        value={diastolicBP}
                        onChange={(e) => setDiastolicBP(e.target.value)}
                        error={errors.diastolicBP}
                      />
                      <Input
                        id="vital-rr"
                        label="Resp Rate (bpm)"
                        type="number"
                        placeholder="e.g. 16"
                        value={respRate}
                        onChange={(e) => setRespRate(e.target.value)}
                        error={errors.respRate}
                      />
                    </div>
                  </div>

                  {/* Symptoms Multi Selection */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex justify-between">
                      <span>Clinical Symptom Mapping</span>
                      {errors.symptoms && (
                        <span className="text-red-400 font-bold lowercase tracking-normal">
                          *{errors.symptoms}
                        </span>
                      )}
                    </label>
                    
                    {/* Symptoms selection matrix */}
                    <div className="flex flex-wrap gap-1.5 p-3 bg-white/5 border border-white/10 rounded-xl">
                      {predefinedSymptoms.map((symptom) => {
                        const isSelected = symptoms.includes(symptom);
                        return (
                          <button
                            key={symptom}
                            type="button"
                            onClick={() => handleToggleSymptom(symptom)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border cursor-pointer transition-all ${
                              isSelected
                                ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
                                : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {symptom}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom chip adder */}
                    <form onSubmit={handleAddCustomSymptom} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add atypical symptom (press enter)"
                        value={customSymptom}
                        onChange={(e) => setCustomSymptom(e.target.value)}
                        className="flex-1 text-xs bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-slate-200 outline-none focus:border-blue-500"
                      />
                      <Button variant="secondary" size="sm" type="submit" leftIcon={<Plus className="h-4 w-4" />}>
                        Add
                      </Button>
                    </form>

                    {/* Tag chips visual block */}
                    {symptoms.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {symptoms.map((symptom) => (
                          <span
                            key={symptom}
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-slate-200 px-2.5 py-1 rounded-md"
                          >
                            <span>{symptom}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSymptom(symptom)}
                              className="text-slate-500 hover:text-slate-200 cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Submission and back buttons */}
                  <div className="flex justify-between items-center pt-4 border-t border-white/10">
                    <Button
                      variant="secondary"
                      leftIcon={<ChevronLeft className="h-4 w-4" />}
                      onClick={handlePrevStep}
                    >
                      Biodata
                    </Button>

                    <Button
                      id="submit-intake-btn"
                      variant="success"
                      rightIcon={<Brain className="h-4 w-4" />}
                      onClick={handleSubmitIntake}
                    >
                      Execute Triage AI
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Assessment Results Display */}
              {step === 2 && triageResult && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="flex flex-col gap-6"
                >
                  {/* Visual Congratulations/Success heading */}
                  <div className="text-center py-4 flex flex-col items-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center mb-1">
                      <CheckCircle2 className="h-6 w-6 animate-pulse" />
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-100 tracking-tight">
                      Clinical Neural Scoring Complete
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm">
                      Case successfully logged and routed. The details below are pushed into the active department workflow streams.
                    </p>
                  </div>

                  {/* High level outcome card */}
                  <Card className="border-white/10 bg-white/5 p-5 flex items-center justify-between flex-wrap gap-4">
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest">
                        Mapped routing details
                      </p>
                      <h4 className="text-sm font-bold text-slate-200 leading-none">
                        Patient: {triageResult.patient.name}
                      </h4>
                      <p className="text-xs text-slate-400">
                        Queue Destination: <span className="font-semibold">{triageResult.visit.queue_type} Stream</span>
                      </p>
                      <p className="text-xs text-slate-400">
                        Assigned Unit: <span className="font-semibold">{triageResult.visit.department_assigned}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <PriorityBadge priority={triageResult.assessment.priority_level} />
                      <ProgressRing
                        value={triageResult.assessment.risk_score}
                        priority={triageResult.assessment.priority_level}
                        size={60}
                        strokeWidth={5}
                      />
                    </div>
                  </Card>

                  {/* Summary */}
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-300 italic leading-relaxed">
                    <p className="font-bold text-[10px] text-slate-400 uppercase tracking-widest mb-1.5 not-italic">
                      Case summary transcription
                    </p>
                    "{triageResult.summary.summary_text}"
                  </div>

                  {/* Explanatory insights */}
                  <ExplainabilityPanel
                    priority={triageResult.assessment.priority_level}
                    contributingFactors={triageResult.assessment.contributing_factors}
                    scoreBreakdown={triageResult.assessment.score_breakdown}
                  />

                  {/* Reset form button to intake next patient */}
                  <div className="flex justify-center pt-4 border-t border-white/10">
                    <Button
                      id="intake-reset-btn"
                      variant="primary"
                      className="w-full"
                      leftIcon={<RefreshCw className="h-4 w-4" />}
                      onClick={handleResetForm}
                    >
                      Complete & Clear intake Desk
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>
      </div>

      {/* Loading overlay spinner during registration submission */}
      <AnimatePresence>
        {isSubmitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center gap-4"
          >
            <Spinner size="lg" />
            <motion.p
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="text-xs font-semibold text-zinc-400 tracking-wider uppercase mt-2 text-center max-w-xs leading-relaxed"
            >
              Consulting medical knowledge neural nodes. Mapping symptoms, generating risk scores...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
};
