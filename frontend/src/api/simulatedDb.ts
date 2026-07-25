/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TriageQueueItem, Department, ShiftReportData } from "../types";

export let simulatedQueue: TriageQueueItem[] = [
  {
    patient: {
      patient_id: "P-781",
      name: "Rohan Deshmukh",
      age: 58,
      gender: "Male",
      phone: "+91 98765 43210",
    },
    visit: {
      visit_id: "V-201",
      status: "TRIAGED",
      queue_type: "Emergency",
      department_assigned: "Cardiology",
      pain_level: 9,
      registered_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 mins ago
      bed_assigned: "ER Cubicle A-1",
      vitals: {
        heart_rate: 110,
        systolic_bp: 145,
        diastolic_bp: 95,
        spo2: 92,
        temperature: 98.6,
        respiratory_rate: 22,
      },
      clinical_notes: [
        {
          timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
          author: "Dr. Arvind Swamy",
          note: "Patient Rohan Deshmukh arrived with crushing substernal chest pressure radiating to left arm. High risk of STEMI. IV access established. Cardiac monitors hooked up. Ready for urgent cath lab."
        }
      ],
      medication_orders: [
        {
          timestamp: new Date(Date.now() - 13 * 60 * 1000).toISOString(),
          doctor: "Dr. Arvind Swamy",
          name: "Aspirin",
          dosage: "325 mg",
          frequency: "Stat",
          status: "Administered"
        },
        {
          timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
          doctor: "Dr. Arvind Swamy",
          name: "Glyceryl Trinitrate (NTG)",
          dosage: "0.4 mg",
          frequency: "Sublingual q5m",
          status: "Administered"
        }
      ],
      laboratory_orders: [
        {
          timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
          doctor: "Dr. Arvind Swamy",
          test_name: "Troponin I (High Sensitivity)",
          status: "Processing"
        },
        {
          timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
          doctor: "Dr. Arvind Swamy",
          test_name: "Complete Blood Count (CBC)",
          status: "Completed",
          result: "WBC: 11.2 (Elevated), Hb: 14.5 (Normal)"
        }
      ],
      radiology_orders: [
        {
          timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
          doctor: "Dr. Arvind Swamy",
          scan_type: "12-Lead ECG",
          status: "Completed",
          result: "ST-elevation in leads V1-V4. Confirmed Anterior STEMI."
        }
      ]
    },
    assessment: {
      risk_score: 94,
      priority_level: "Critical",
      mapped_symptoms: ["Severe Chest Pain", "Radiating Left Arm Pain", "Shortness of Breath", "Diaphoresis"],
      confidence_scores: { "Acute Myocardial Infarction": 0.96, "Angina Pectoris": 0.72 },
      contributing_factors: [
        "Advanced Pain Level (9/10)",
        "Critical Chest-arm Radiation Path",
        "Elevated Respiratory Distress Signs",
        "Age 50+ with Cardiovascular Risk History"
      ],
      score_breakdown: {
        "Symptom Severity": 40,
        "Pain Intensity": 25,
        "Age Risk Factor": 15,
        "Vital Indicators": 14
      }
    },
    summary: {
      summary_text: "58yo male presenting with sudden onset crushing chest pain radiating to the left arm and jaw. Experiencing diaphoresis and acute dyspnea. Symptoms highly suggestive of acute coronary syndrome (ACS). Emergency catheterization required."
    }
  },
  {
    patient: {
      patient_id: "P-453",
      name: "Aisha Sharma",
      age: 29,
      gender: "Female",
      phone: "+91 91234 56789",
    },
    visit: {
      visit_id: "V-202",
      status: "TRIAGED",
      queue_type: "Emergency",
      department_assigned: "Neurology",
      pain_level: 8,
      registered_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(), // 8 mins ago
      vitals: {
        heart_rate: 95,
        systolic_bp: 175,
        diastolic_bp: 105,
        spo2: 97,
        temperature: 98.4,
        respiratory_rate: 18,
      },
    },
    assessment: {
      risk_score: 88,
      priority_level: "High",
      mapped_symptoms: ["Sudden Unilateral Weakness", "Slurred Speech", "Acute Headache", "Facial Droop"],
      confidence_scores: { "Acute Ischemic Stroke": 0.89, "Transient Ischemic Attack": 0.65 },
      contributing_factors: [
        "Sudden Onset Neurological Deficits",
        "Facial Droop Detected (FAST Criteria)",
        "Severe Thunderclap Headache",
        "Patient exhibits noticeable expressive aphasia"
      ],
      score_breakdown: {
        "Neurological Symptoms": 45,
        "Onset Urgency": 25,
        "Pain Scale": 10,
        "Confidence Index": 8
      }
    },
    summary: {
      summary_text: "29yo female presenting with acute facial drooping, severe slurred speech, and loss of motor function in the right arm. Onset was sudden within the last hour. FAST positive. Requires immediate stroke protocol evaluation and non-contrast CT head."
    }
  },
  {
    patient: {
      patient_id: "P-112",
      name: "Vikram Malhotra",
      age: 42,
      gender: "Male",
      phone: "+91 99887 76655",
    },
    visit: {
      visit_id: "V-203",
      status: "TRIAGED",
      queue_type: "Emergency",
      department_assigned: "Traumatology",
      pain_level: 10,
      registered_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 mins ago
      vitals: {
        heart_rate: 125,
        systolic_bp: 85,
        diastolic_bp: 50,
        spo2: 95,
        temperature: 99.1,
        respiratory_rate: 24,
      },
    },
    assessment: {
      risk_score: 85,
      priority_level: "High",
      mapped_symptoms: ["Open Femur Fracture", "Hypotension", "Active External Bleeding"],
      confidence_scores: { "Traumatic Fracture with Vascular Risk": 0.94 },
      contributing_factors: [
        "Maximal Pain Level (10/10)",
        "Potential Hypovolemic Shock Risk due to fluid/blood loss",
        "Deformed lower extremity with visible bone exposure"
      ],
      score_breakdown: {
        "Trauma Level": 40,
        "Pain Score": 25,
        "Vascular/Shock Risk": 20
      }
    },
    summary: {
      summary_text: "42yo male following a motor vehicle collision. Presents with severe open femur fracture. Extreme localized pain, active bleeding partially controlled by tourniquet. Hemodynamically borderline. Emergency orthopaedic reduction and surgical debridement scheduled."
    }
  },
  {
    patient: {
      patient_id: "P-320",
      name: "Priya Nair",
      age: 34,
      gender: "Female",
      phone: "+91 93456 78901",
    },
    visit: {
      visit_id: "V-204",
      status: "TRIAGED",
      queue_type: "General",
      department_assigned: "Pulmonology",
      pain_level: 6,
      registered_at: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
      vitals: {
        heart_rate: 104,
        systolic_bp: 128,
        diastolic_bp: 82,
        spo2: 94,
        temperature: 99.5,
        respiratory_rate: 21,
      },
    },
    assessment: {
      risk_score: 65,
      priority_level: "Medium",
      mapped_symptoms: ["Persistent Dry Cough", "Moderate Wheezing", "Low-grade Fever", "Chest Tightness"],
      confidence_scores: { "Asthma Exacerbation": 0.82, "Atypical Pneumonia": 0.58 },
      contributing_factors: [
        "History of chronic bronchial asthma",
        "Bilateral wheezing on auscultation",
        "Sub-optimal SpO2 readings (94% on room air)"
      ],
      score_breakdown: {
        "Respiratory Distress": 35,
        "Chronic Comorbidity": 15,
        "Pain/Tightness": 15
      }
    },
    summary: {
      summary_text: "34yo female with history of moderate persistent asthma. Complains of progressive cough and wheezing for the last 48 hours, poorly responsive to rescue inhaler. Stable vitals but elevated work of breathing. Requires nebulization and oral corticosteroid evaluation."
    }
  },
  {
    patient: {
      patient_id: "P-889",
      name: "Ananya Iyer",
      age: 12,
      gender: "Female",
      phone: "+91 94567 12345",
    },
    visit: {
      visit_id: "V-205",
      status: "TRIAGED",
      queue_type: "General",
      department_assigned: "Pediatrics",
      pain_level: 7,
      registered_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    },
    assessment: {
      risk_score: 55,
      priority_level: "Medium",
      mapped_symptoms: ["High Fever (39.5 C)", "Nausea", "Abdominal Tenderness", "Lethargy"],
      confidence_scores: { "Acute Appendicitis": 0.61, "Viral Gastroenteritis": 0.75 },
      contributing_factors: [
        "High Pediatric Pyrexia",
        "Vague right lower quadrant abdominal discomfort",
        "Inability to tolerate oral fluids"
      ],
      score_breakdown: {
        "Pediatric Urgency": 25,
        "Fever Level": 20,
        "Symptom Cluster": 10
      }
    },
    summary: {
      summary_text: "12yo pediatric patient presenting with acute abdominal pain starting periumbilically, now localizing. Accompanying spikes of fever up to 39.5°C and persistent vomiting. Hydration status compromised. Requires pediatric surgical consultation and ultrasound."
    }
  },
  {
    patient: {
      patient_id: "P-551",
      name: "Kabir Singh",
      age: 65,
      gender: "Male",
      phone: "+91 97890 12345",
    },
    visit: {
      visit_id: "V-206",
      status: "TRIAGED",
      queue_type: "General",
      department_assigned: "General Medicine",
      pain_level: 4,
      registered_at: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
    },
    assessment: {
      risk_score: 35,
      priority_level: "Low",
      mapped_symptoms: ["Chronic Lumbar Back Pain", "Mild Dysuria", "Polyuria"],
      confidence_scores: { "Urinary Tract Infection": 0.85, "Lumbar Muscle Strain": 0.40 },
      contributing_factors: [
        "Advanced age with mild lower urinary symptoms",
        "No fever, vomiting, or focal neurological deficits"
      ],
      score_breakdown: {
        "Age Adjustment": 15,
        "Symptom Severity": 10,
        "Pain Intensity": 10
      }
    },
    summary: {
      summary_text: "65yo male presenting with lower back discomfort and increased urinary frequency over 3 days. No costovertebral tenderness, afebrile, pulse oximetry normal. Urinalysis reveals leucocytes. Likely lower UTI. Discharging with oral antibiotics."
    }
  },
  {
    patient: {
      patient_id: "P-202",
      name: "Rajesh Khanna",
      age: 48,
      gender: "Male",
      phone: "+91 92345 67890",
    },
    visit: {
      visit_id: "V-207",
      status: "TRIAGED",
      queue_type: "General",
      department_assigned: "Traumatology",
      pain_level: 5,
      registered_at: new Date(Date.now() - 110 * 60 * 1000).toISOString(), // 110 mins ago - stale candidate
    },
    assessment: {
      risk_score: 30,
      priority_level: "Low",
      mapped_symptoms: ["Ankle Inversion Injury", "Localized Swelling", "Inability to Bear Weight"],
      confidence_scores: { "Lateral Ankle Sprain": 0.88, "Fibula Distal Fracture": 0.35 },
      contributing_factors: [
        "Moderate pain (5/10) on manipulation",
        "Visible swelling over lateral malleolus, skin intact",
        "Patient unable to complete Ottawa ankle rule weight-bearing test"
      ],
      score_breakdown: {
        "Trauma Level": 15,
        "Pain Scale": 10,
        "Immobility Factor": 5
      }
    },
    summary: {
      summary_text: "48yo male who twisted ankle stepping off curb. No gross deformity, skin intact, moderate swelling over lateral ligaments. Ottawa ankle criteria positive for X-ray (inability to take 4 steps). Ordered ankle X-ray series."
    }
  }
];

export let simulatedDepartments: Department[] = [
  { name: "Cardiology", status: "Active", active_patients: 1, wait_time_mins: 15 },
  { name: "Neurology", status: "Active", active_patients: 1, wait_time_mins: 8 },
  { name: "Traumatology", status: "Overloaded", active_patients: 4, wait_time_mins: 45 },
  { name: "Pulmonology", status: "Active", active_patients: 1, wait_time_mins: 22 },
  { name: "Pediatrics", status: "Active", active_patients: 1, wait_time_mins: 12 },
  { name: "General Medicine", status: "Active", active_patients: 2, wait_time_mins: 35 },
  { name: "Gastroenterology", status: "Inactive", active_patients: 0, wait_time_mins: 0 }
];

export interface RegisterPatientPayload {
  name: string;
  age: number;
  gender: string;
  phone: string;
  pain_level: number;
  chief_complaint: string;
  symptoms: string[];
  vitals?: {
    heart_rate?: number;
    systolic_bp?: number;
    diastolic_bp?: number;
    spo2?: number;
    temperature?: number;
    respiratory_rate?: number;
  };
}

export function registerSimulatedPatient(data: RegisterPatientPayload): TriageQueueItem {
  const patient_id = "P-" + Math.floor(100 + Math.random() * 900);
  const visit_id = "V-" + Math.floor(200 + Math.random() * 800);

  // Simple triage rule simulation based on pain, chief complaint, age, and vitals!
  let risk_score = 15 + data.pain_level * 5;
  const isHeart = data.chief_complaint.toLowerCase().includes("heart") || data.chief_complaint.toLowerCase().includes("chest") || data.symptoms.some(s => s.toLowerCase().includes("chest"));
  const isStroke = data.chief_complaint.toLowerCase().includes("stroke") || data.symptoms.some(s => s.toLowerCase().includes("slur") || s.toLowerCase().includes("weak") || s.toLowerCase().includes("facial"));
  const isBreathing = data.chief_complaint.toLowerCase().includes("breath") || data.symptoms.some(s => s.toLowerCase().includes("breath") || s.toLowerCase().includes("wheez"));
  const isTrauma = data.chief_complaint.toLowerCase().includes("fracture") || data.chief_complaint.toLowerCase().includes("accident") || data.chief_complaint.toLowerCase().includes("bleed");

  if (isHeart) risk_score += 35;
  else if (isStroke) risk_score += 30;
  else if (isTrauma) risk_score += 25;
  else if (isBreathing) risk_score += 20;

  if (data.age > 60) risk_score += 10;
  if (data.age < 5) risk_score += 5;

  const contributing_factors: string[] = [
    `Pain scale indicated at ${data.pain_level}/10`,
    `Chief Complaint: ${data.chief_complaint}`,
    data.age > 60 ? "Patient age is high-risk (>60)" : "Age appropriate triage",
  ];

  const score_breakdown: Record<string, number> = {
    "Symptom Severity": Math.round(Math.min(45, (isHeart ? 35 : isStroke ? 30 : isTrauma ? 25 : isBreathing ? 20 : 0) + (data.age > 60 ? 10 : 5))),
    "Pain Level Impact": Math.round(data.pain_level * 4),
    "Clinical Demographics": data.age > 60 ? 15 : 5,
  };

  let vitals_score = 0;
  if (data.vitals) {
    const { heart_rate, systolic_bp, diastolic_bp, spo2, temperature, respiratory_rate } = data.vitals;
    if (spo2) {
      if (spo2 < 90) {
        risk_score += 35;
        vitals_score += 35;
        contributing_factors.push(`Critical Hypoxemia detected (SpO2: ${spo2}%)`);
      } else if (spo2 < 95) {
        risk_score += 18;
        vitals_score += 18;
        contributing_factors.push(`Mild Hypoxemia detected (SpO2: ${spo2}%)`);
      }
    }
    if (heart_rate) {
      if (heart_rate > 120 || heart_rate < 50) {
        risk_score += 15;
        vitals_score += 15;
        contributing_factors.push(`Abnormal Heart Rate (Pulse: ${heart_rate} bpm)`);
      } else if (heart_rate > 100 || heart_rate < 60) {
        risk_score += 8;
        vitals_score += 8;
        contributing_factors.push(`Borderline Pulse rate (Pulse: ${heart_rate} bpm)`);
      }
    }
    if (systolic_bp) {
      if (systolic_bp > 160 || systolic_bp < 90) {
        risk_score += 15;
        vitals_score += 15;
        contributing_factors.push(`Severe Blood Pressure anomaly (BP: ${systolic_bp}/${diastolic_bp || "80"} mmHg)`);
      } else if (systolic_bp > 140 || systolic_bp < 100) {
        risk_score += 8;
        vitals_score += 8;
        contributing_factors.push(`Borderline Blood Pressure reading (BP: ${systolic_bp}/${diastolic_bp || "80"} mmHg)`);
      }
    }
    if (temperature) {
      if (temperature > 101.5) {
        risk_score += 10;
        vitals_score += 10;
        contributing_factors.push(`Systemic Inflammatory Response (Temp: ${temperature}°F)`);
      }
    }
    if (respiratory_rate) {
      if (respiratory_rate > 24 || respiratory_rate < 10) {
        risk_score += 15;
        vitals_score += 15;
        contributing_factors.push(`Abnormal Respiratory rate (RR: ${respiratory_rate} breaths/min)`);
      }
    }
  }

  if (vitals_score > 0) {
    score_breakdown["Vital Signs Anomaly"] = Math.min(30, Math.round(vitals_score));
  }

  risk_score = Math.min(100, Math.max(0, risk_score));

  let priority_level: "Low" | "Medium" | "High" | "Critical" = "Low";
  if (risk_score >= 90) priority_level = "Critical";
  else if (risk_score >= 70) priority_level = "High";
  else if (risk_score >= 40) priority_level = "Medium";

  const queue_type = (priority_level === "Critical" || priority_level === "High") ? "Emergency" : "General";

  let department_assigned = "General Medicine";
  if (isHeart) department_assigned = "Cardiology";
  else if (isStroke) department_assigned = "Neurology";
  else if (isTrauma) department_assigned = "Traumatology";
  else if (isBreathing) department_assigned = "Pulmonology";
  else if (data.age < 15) department_assigned = "Pediatrics";

  const assessment: TriageQueueItem["assessment"] = {
    risk_score,
    priority_level,
    mapped_symptoms: data.symptoms,
    confidence_scores: { [data.chief_complaint]: 0.85 },
    contributing_factors,
    score_breakdown,
  };

  if (isHeart) {
    assessment.contributing_factors.push("Cardiovascular indicators detected in complaint text");
  }

  const newItem: TriageQueueItem = {
    patient: {
      patient_id,
      name: data.name,
      age: data.age,
      gender: data.gender,
      phone: data.phone,
    },
    visit: {
      visit_id,
      status: "TRIAGED",
      queue_type,
      department_assigned,
      pain_level: data.pain_level,
      chief_complaint: data.chief_complaint,
      registered_at: new Date().toISOString(),
      vitals: data.vitals,
    },
    assessment,
    summary: {
      summary_text: `${data.age}yo ${data.gender} presenting with chief complaint of "${data.chief_complaint}". Assessed with a pain level of ${data.pain_level}/10. Mapped symptoms include: ${data.symptoms.join(", ")}. Primary routing directed to the ${department_assigned} department.`
    }
  };

  simulatedQueue.unshift(newItem);

  // Increment active patient counts for that department
  const dept = simulatedDepartments.find(d => d.name === department_assigned);
  if (dept) {
    dept.active_patients += 1;
    dept.wait_time_mins += Math.round(5 + Math.random() * 10);
  }

  return newItem;
}

export function updateSimulatedVisitStatus(visit_id: string, status: string) {
  const item = simulatedQueue.find(q => q.visit.visit_id === visit_id);
  if (item) {
    const oldStatus = item.visit.status;
    item.visit.status = status;
    
    // If discharged/admitted, remove from active department counts
    if (status === "DISCHARGED" || status === "ADMITTED" || status === "TRANSFERRED") {
      const dept = simulatedDepartments.find(d => d.name === item.visit.department_assigned);
      if (dept && dept.active_patients > 0) {
        dept.active_patients -= 1;
        dept.wait_time_mins = Math.max(0, dept.wait_time_mins - 12);
      }
    }
  }
}

export function reassessSimulatedVisit(visit_id: string, pain_level: number): TriageQueueItem {
  const item = simulatedQueue.find(q => q.visit.visit_id === visit_id);
  if (!item) throw new Error("Visit not found");

  item.visit.pain_level = pain_level;
  
  // Re-calculate risk score
  let old_risk = item.assessment.risk_score;
  let new_risk = Math.min(100, Math.max(0, old_risk + (pain_level - item.visit.pain_level) * 3 + (pain_level > 8 ? 10 : 0)));
  item.assessment.risk_score = new_risk;

  let priority_level: "Low" | "Medium" | "High" | "Critical" = "Low";
  if (new_risk >= 90) priority_level = "Critical";
  else if (new_risk >= 70) priority_level = "High";
  else if (new_risk >= 40) priority_level = "Medium";

  item.assessment.priority_level = priority_level;
  item.visit.queue_type = (priority_level === "Critical" || priority_level === "High") ? "Emergency" : "General";
  item.assessment.contributing_factors.push(`Patient pain level reassessed to ${pain_level}/10`);
  item.assessment.score_breakdown["Pain Level Impact"] = Math.round(pain_level * 4);

  return item;
}

export function updateSimulatedDepartmentStatus(dept_name: string, status: string) {
  const dept = simulatedDepartments.find(d => d.name === dept_name);
  if (dept) {
    dept.status = status;
  }
}

export function getSimulatedShiftReport(): ShiftReportData {
  const total = simulatedQueue.length;
  const critical = simulatedQueue.filter(q => q.assessment.priority_level === "Critical").length;
  const high = simulatedQueue.filter(q => q.assessment.priority_level === "High").length;
  const medium = simulatedQueue.filter(q => q.assessment.priority_level === "Medium").length;
  const low = simulatedQueue.filter(q => q.assessment.priority_level === "Low").length;

  const priority_distribution = [
    { name: "Low", value: low },
    { name: "Medium", value: medium },
    { name: "High", value: high },
    { name: "Critical", value: critical },
  ];

  const emergency = simulatedQueue.filter(q => q.visit.queue_type === "Emergency").length;
  const general = total - emergency;

  const queue_distribution = [
    { name: "Emergency", value: emergency },
    { name: "General", value: general },
  ];

  const deptCounts: Record<string, number> = {};
  simulatedQueue.forEach(q => {
    const dept = q.visit.department_assigned;
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });

  const department_workload = Object.entries(deptCounts).map(([name, count]) => ({
    name,
    count,
  }));

  return {
    total_patients: total + 12, // add some static history
    critical_count: critical + 2,
    avg_wait_time: 24, // simulated average
    longest_wait_time: 110, // Rajesh Khanna has been waiting 110 mins
    priority_distribution,
    queue_distribution,
    department_workload,
  };
}

export function addSimulatedClinicalNote(visit_id: string, author: string, note: string) {
  const item = simulatedQueue.find(q => q.visit.visit_id === visit_id);
  if (item) {
    if (!item.visit.clinical_notes) item.visit.clinical_notes = [];
    item.visit.clinical_notes.unshift({
      timestamp: new Date().toISOString(),
      author,
      note,
    });
  }
}

export function addSimulatedMedicationOrder(visit_id: string, doctor: string, name: string, dosage: string, frequency: string) {
  const item = simulatedQueue.find(q => q.visit.visit_id === visit_id);
  if (item) {
    if (!item.visit.medication_orders) item.visit.medication_orders = [];
    item.visit.medication_orders.unshift({
      timestamp: new Date().toISOString(),
      doctor,
      name,
      dosage,
      frequency,
      status: "Pending",
    });
  }
}

export function addSimulatedLabOrder(visit_id: string, doctor: string, test_name: string) {
  const item = simulatedQueue.find(q => q.visit.visit_id === visit_id);
  if (item) {
    if (!item.visit.laboratory_orders) item.visit.laboratory_orders = [];
    item.visit.laboratory_orders.unshift({
      timestamp: new Date().toISOString(),
      doctor,
      test_name,
      status: "Ordered",
    });
  }
}

export function addSimulatedRadiologyOrder(visit_id: string, doctor: string, scan_type: string) {
  const item = simulatedQueue.find(q => q.visit.visit_id === visit_id);
  if (item) {
    if (!item.visit.radiology_orders) item.visit.radiology_orders = [];
    item.visit.radiology_orders.unshift({
      timestamp: new Date().toISOString(),
      doctor,
      scan_type,
      status: "Ordered",
    });
  }
}

export function assignSimulatedBed(visit_id: string, bed: string) {
  const item = simulatedQueue.find(q => q.visit.visit_id === visit_id);
  if (item) {
    item.visit.bed_assigned = bed || undefined;
  }
}

export function transferSimulatedDepartment(visit_id: string, department: string) {
  const item = simulatedQueue.find(q => q.visit.visit_id === visit_id);
  if (item) {
    const oldDept = item.visit.department_assigned;
    item.visit.department_assigned = department;

    // Adjust department active patient metrics
    const oldD = simulatedDepartments.find(d => d.name === oldDept);
    if (oldD && oldD.active_patients > 0) {
      oldD.active_patients -= 1;
      oldD.wait_time_mins = Math.max(0, oldD.wait_time_mins - 10);
    }
    const newD = simulatedDepartments.find(d => d.name === department);
    if (newD) {
      newD.active_patients += 1;
      newD.wait_time_mins += 12;
    }
  }
}
