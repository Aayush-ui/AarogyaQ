/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Plus, X, HeartPulse, Brain, CheckCircle2, ChevronDown, ChevronUp, RefreshCw, Clipboard, ArrowRight } from "lucide-react";
import { usePatientStore } from "../store/usePatientStore";
import { useUIStore } from "../store/useUIStore";
import { PageTransition } from "../components/layout/PageTransition";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

export const NurseIntake: React.FC = () => {
  const { submitIntake, isSubmitting, triageResult, resetIntake } = usePatientStore();
  const { addToast } = useUIStore();

  // Form Fields
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [phone, setPhone] = useState("");

  const [chiefComplaint, setChiefComplaint] = useState("");
  const [painLevel, setPainLevel] = useState(5);
  const [symptomDuration, setSymptomDuration] = useState("1");
  const [existingConditionsInput, setExistingConditionsInput] = useState("");
  const [existingConditions, setExistingConditions] = useState<string[]>([]);
  const [useAI, setUseAI] = useState(false);

  // Optional Vitals
  const [vitalsExpanded, setVitalsExpanded] = useState(false);
  const [spo2, setSpo2] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [temperature, setTemperature] = useState("");
  const [systolicBP, setSystolicBP] = useState("");
  const [diastolicBP, setDiastolicBP] = useState("");
  const [respRate, setRespRate] = useState("");

  // Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAddCondition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingConditionsInput.trim()) return;
    const cond = existingConditionsInput.trim();
    if (!existingConditions.includes(cond)) {
      setExistingConditions([...existingConditions, cond]);
    }
    setExistingConditionsInput("");
  };

  const handleRemoveCondition = (cond: string) => {
    setExistingConditions(existingConditions.filter((c) => c !== cond));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Patient full name is required";
    if (!age || Number(age) <= 0 || Number(age) > 120) newErrors.age = "A valid age between 1 and 120 is required";
    if (!chiefComplaint.trim()) newErrors.chiefComplaint = "Chief complaint is required";
    
    const painVal = Number(painLevel);
    if (isNaN(painVal) || painVal < 1 || painVal > 10) {
      newErrors.painLevel = "Pain level must be between 1 and 10";
    }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      addToast("Please check form inputs for validation errors.", "warning");
      return;
    }

    const payload = {
      name: name.trim(),
      age: Number(age),
      gender,
      phone: phone.trim() || undefined,
      chief_complaint: chiefComplaint.trim(),
      pain_level: Number(painLevel),
      symptom_duration: symptomDuration ? Number(symptomDuration) : undefined,
      existing_conditions: existingConditions,
      use_ai: useAI,
      vitals: vitalsExpanded ? {
        heart_rate: heartRate ? Number(heartRate) : undefined,
        systolic_bp: systolicBP ? Number(systolicBP) : undefined,
        diastolic_bp: diastolicBP ? Number(diastolicBP) : undefined,
        spo2: spo2 ? Number(spo2) : undefined,
        temperature: temperature ? Number(temperature) : undefined,
        respiratory_rate: respRate ? Number(respRate) : undefined,
      } : undefined
    };

    await submitIntake(payload);
  };

  const handleResetForm = () => {
    setName("");
    setAge("");
    setGender("Male");
    setPhone("");
    setChiefComplaint("");
    setPainLevel(5);
    setSymptomDuration("1");
    setExistingConditions([]);
    setExistingConditionsInput("");
    setUseAI(false);
    setVitalsExpanded(false);
    setSpo2("");
    setHeartRate("");
    setTemperature("");
    setSystolicBP("");
    setDiastolicBP("");
    setRespRate("");
    setErrors({});
    resetIntake();
  };

  return (
    <PageTransition id="nurse-intake-page">
      <div className="max-w-3xl mx-auto p-6 space-y-6 overflow-y-auto h-full">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-[#e8ecf4] tracking-tight">
            Patient Intake & Triage
          </h1>
          <p className="text-xs text-[#8492a6] font-medium uppercase tracking-wider mt-1">
            Register incoming patient and calculate priority scores dynamically.
          </p>
        </div>

        {!triageResult ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-6 space-y-6">
              {/* Section A: Demographics */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-[#8492a6] uppercase tracking-widest border-b border-[#2a3040] pb-2 flex items-center gap-2">
                  <Clipboard className="h-4 w-4 text-[hsl(220,85%,58%)]" /> Patient Demographics
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Patient Name"
                    placeholder="Enter full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    error={errors.name}
                  />
                  <Input
                    label="Contact Phone"
                    placeholder="Enter contact number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    error={errors.phone}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Age (Years)"
                    type="number"
                    placeholder="e.g. 45"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    error={errors.age}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#8492a6]">
                      Gender Designation
                    </label>
                    <div className="grid grid-cols-3 gap-2 bg-[#0f1117] p-1 rounded-lg border border-[#2a3040]">
                      {["Male", "Female", "Other"].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGender(g)}
                          className={`py-1.5 text-xs font-bold uppercase rounded transition-all cursor-pointer ${
                            gender === g
                              ? "bg-[#1a1f2e] text-[#e8ecf4] border border-[#2a3040]"
                              : "text-[#8492a6] hover:text-[#e8ecf4]"
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section B: Clinical Data */}
              <div className="space-y-4 pt-4 border-t border-[#2a3040]">
                <h3 className="text-xs font-bold text-[#8492a6] uppercase tracking-widest border-b border-[#2a3040] pb-2 flex items-center gap-2">
                  <HeartPulse className="h-4 w-4 text-[hsl(220,85%,58%)]" /> Clinical Presentation
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <Input
                    label="Chief Complaint"
                    placeholder="Describe main reason for emergency admission..."
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    error={errors.chiefComplaint}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#8492a6] flex justify-between">
                      <span>Pain Level Scale</span>
                      <span className="font-bold text-[#e8ecf4]">{painLevel}/10</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={painLevel}
                      onChange={(e) => setPainLevel(Number(e.target.value))}
                      className="w-full accent-[hsl(220,85%,58%)] bg-[#0f1117] h-1.5 rounded-lg border border-[#2a3040] cursor-pointer mt-2"
                    />
                  </div>

                  <Input
                    label="Symptom Duration (Hours)"
                    type="number"
                    placeholder="e.g. 3"
                    value={symptomDuration}
                    onChange={(e) => setSymptomDuration(e.target.value)}
                    error={errors.symptomDuration}
                  />
                </div>

                {/* Existing Conditions list */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#8492a6]">
                    Prior Medical Conditions / History
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Hypertension, Diabetes..."
                      value={existingConditionsInput}
                      onChange={(e) => setExistingConditionsInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddCondition(e)}
                      className="flex-1 px-3 py-2 bg-[#0f1117] border border-[#2a3040] rounded-lg text-sm text-[#e8ecf4] placeholder-[#8492a6] focus:outline-none focus:border-[hsl(220,85%,58%)]"
                    />
                    <Button type="button" variant="secondary" onClick={handleAddCondition}>
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {existingConditions.map((cond) => (
                      <span
                        key={cond}
                        className="inline-flex items-center gap-1 text-xs font-semibold bg-[#0f1117] text-[#e8ecf4] border border-[#2a3040] px-2 py-0.5 rounded-lg"
                      >
                        {cond}
                        <button
                          type="button"
                          onClick={() => handleRemoveCondition(cond)}
                          className="hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* AI Toggle */}
                <div className="flex items-center gap-3 p-3 bg-[#0f1117] border border-[#2a3040] rounded-lg">
                  <input
                    type="checkbox"
                    id="use-ai-triage"
                    checked={useAI}
                    onChange={(e) => setUseAI(e.target.checked)}
                    className="h-4.5 w-4.5 rounded border-[#2a3040] bg-[#1a1f2e] text-[hsl(220,85%,58%)] cursor-pointer"
                  />
                  <label htmlFor="use-ai-triage" className="flex flex-col cursor-pointer select-none">
                    <span className="text-xs font-semibold text-[#e8ecf4] flex items-center gap-1.5">
                      <Brain className="h-3.5 w-3.5 text-blue-400" />
                      Use AI Symptom Mapping
                    </span>
                    <span className="text-[10px] text-[#8492a6] mt-0.5">
                      Gemini will canonicalize symptom names & match clinical categories.
                    </span>
                  </label>
                </div>
              </div>

              {/* Optional Vitals (Collapsible Container) */}
              <div className="pt-4 border-t border-[#2a3040] space-y-4">
                <button
                  type="button"
                  onClick={() => setVitalsExpanded(!vitalsExpanded)}
                  className="w-full flex items-center justify-between text-xs font-bold text-[#8492a6] uppercase tracking-widest hover:text-[#e8ecf4] pb-2 border-b border-[#2a3040]"
                >
                  <span>Physiological Vitals (Optional)</span>
                  {vitalsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {vitalsExpanded && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <Input
                      label="SpO2 (%)"
                      type="number"
                      placeholder="e.g. 98"
                      value={spo2}
                      onChange={(e) => setSpo2(e.target.value)}
                      error={errors.spo2}
                    />
                    <Input
                      label="Heart Rate (bpm)"
                      type="number"
                      placeholder="e.g. 72"
                      value={heartRate}
                      onChange={(e) => setHeartRate(e.target.value)}
                      error={errors.heartRate}
                    />
                    <Input
                      label="Temperature (°F)"
                      type="number"
                      placeholder="e.g. 98.6"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      error={errors.temperature}
                    />
                    <Input
                      label="Systolic BP (mmHg)"
                      type="number"
                      placeholder="e.g. 120"
                      value={systolicBP}
                      onChange={(e) => setSystolicBP(e.target.value)}
                      error={errors.systolicBP}
                    />
                    <Input
                      label="Diastolic BP (mmHg)"
                      type="number"
                      placeholder="e.g. 80"
                      value={diastolicBP}
                      onChange={(e) => setDiastolicBP(e.target.value)}
                      error={errors.diastolicBP}
                    />
                    <Input
                      label="Resp Rate (breaths/m)"
                      type="number"
                      placeholder="e.g. 16"
                      value={respRate}
                      onChange={(e) => setRespRate(e.target.value)}
                      error={errors.respRate}
                    />
                  </div>
                )}
              </div>

              {/* Submit panel */}
              <div className="flex justify-end pt-4 border-t border-[#2a3040]">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  className="flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" /> Triaging Patient...
                    </>
                  ) : (
                    <>
                      Submit Intake <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </form>
        ) : (
          /* Results Card */
          <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-6 space-y-6">
            <div className="flex flex-col items-center justify-center text-center p-6 border-b border-[#2a3040] space-y-4">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-[#e8ecf4]">Triage Complete</h2>
                <p className="text-xs text-[#8492a6] font-mono">
                  Patient ID: <span className="text-[#e8ecf4] font-bold">{triageResult.patient.patient_id}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-[#2a3040]">
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-[#8492a6] uppercase tracking-widest">
                  Triage Category
                </h4>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1.5 rounded-lg text-sm font-extrabold uppercase border ${
                    triageResult.assessment.priority_level === "Critical" ? "bg-red-500/15 text-red-500 border-red-500/20" :
                    triageResult.assessment.priority_level === "High" ? "bg-orange-500/15 text-orange-500 border-orange-500/20" :
                    triageResult.assessment.priority_level === "Medium" ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" :
                    "bg-emerald-500/15 text-emerald-500 border-emerald-500/20"
                  }`}>
                    {triageResult.assessment.priority_level}
                  </span>
                  <div className="space-y-0.5">
                    <div className="text-xs text-[#8492a6] font-medium">Assigned Department:</div>
                    <div className="text-sm font-semibold text-[#e8ecf4]">{triageResult.visit.department_assigned}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-[#8492a6] uppercase tracking-widest">
                  Severity Score
                </h4>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-extrabold text-[#e8ecf4]">
                    {triageResult.assessment.risk_score.toFixed(1)}
                  </div>
                  <span className="text-xs text-[#8492a6]">out of 100 points</span>
                </div>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="space-y-4 pb-6 border-b border-[#2a3040]">
              <h4 className="text-[10px] font-bold text-[#8492a6] uppercase tracking-widest">
                Score Contribution Breakdown
              </h4>
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#2a3040] text-[#8492a6]">
                    <th className="py-2">Factor/Rule ID</th>
                    <th className="py-2 text-right">Points Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a3040]/30 text-[#e8ecf4]">
                  {Object.entries(triageResult.assessment.score_breakdown).map(([ruleId, pts]) => (
                    <tr key={ruleId}>
                      <td className="py-2.5 font-medium">{ruleId}</td>
                      <td className="py-2.5 text-right font-mono font-bold">+{pts}</td>
                    </tr>
                  ))}
                  {Object.keys(triageResult.assessment.score_breakdown).length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-[#8492a6] italic">
                        No rules fired. Baseline clinical score.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Contributing factors */}
            {triageResult.assessment.contributing_factors.length > 0 && (
              <div className="space-y-3 pb-6 border-b border-[#2a3040]">
                <h4 className="text-[10px] font-bold text-[#8492a6] uppercase tracking-widest">
                  Key Diagnostic Flags
                </h4>
                <ul className="list-disc list-inside text-xs text-[#8492a6] space-y-1">
                  {triageResult.assessment.contributing_factors.map((factor, idx) => (
                    <li key={idx} className="text-[#e8ecf4] font-medium">{factor}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Confidence Scores */}
            {useAI && Object.keys(triageResult.assessment.confidence_scores).length > 0 && (
              <div className="space-y-3 pb-6 border-b border-[#2a3040]">
                <h4 className="text-[10px] font-bold text-[#8492a6] uppercase tracking-widest">
                  AI Symptom Match Confidence
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(triageResult.assessment.confidence_scores).map(([symptom, conf]) => (
                    <div key={symptom} className="flex justify-between p-2 bg-[#0f1117] border border-[#2a3040] rounded">
                      <span className="font-medium text-[#8492a6] capitalize">{symptom.replace("_", " ")}</span>
                      <span className="font-mono font-bold text-blue-400">{(conf * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Row */}
            <div className="flex justify-between gap-4 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  window.location.hash = "#/queue";
                }}
              >
                Go to Queue Board
              </Button>
              <Button variant="primary" onClick={handleResetForm}>
                Register Another Patient
              </Button>
            </div>
          </Card>
        )}
      </div>
    </PageTransition>
  );
};
