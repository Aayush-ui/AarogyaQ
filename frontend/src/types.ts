/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Patient {
  patient_id: string;
  name: string;
  age: number;
  gender: string;
  phone?: string;
}

export interface Visit {
  visit_id: string;
  status: 'AWAITING_TRIAGE' | 'TRIAGED' | 'ADMITTED' | 'DISCHARGED' | 'TRANSFERRED' | 'STALE' | string;
  queue_type: 'Emergency' | 'General' | string;
  department_assigned: string;
  pain_level: number;
  chief_complaint?: string;
  registered_at?: string;
  bed_assigned?: string;
  clinical_notes?: { timestamp: string; author: string; note: string }[];
  medication_orders?: { timestamp: string; doctor: string; name: string; dosage: string; frequency: string; status: "Pending" | "Administered" }[];
  laboratory_orders?: { timestamp: string; doctor: string; test_name: string; status: "Ordered" | "Processing" | "Completed"; result?: string }[];
  radiology_orders?: { timestamp: string; doctor: string; scan_type: string; status: "Ordered" | "Processing" | "Completed"; result?: string }[];
  vitals?: {
    heart_rate?: number;
    systolic_bp?: number;
    diastolic_bp?: number;
    spo2?: number;
    temperature?: number;
    respiratory_rate?: number;
  };
}

export interface Assessment {
  risk_score: number; // 0 - 100
  priority_level: 'Low' | 'Medium' | 'High' | 'Critical';
  mapped_symptoms: string[];
  confidence_scores: Record<string, number>;
  contributing_factors: string[];
  score_breakdown: Record<string, number>;
}

export interface Summary {
  summary_text: string;
}

export type TwinAlertLevel = "STABLE" | "MONITOR" | "DETERIORATING" | "CRITICAL_ALERT";

export interface TwinState {
  visit_id: number;
  initial_risk_score: number;
  projected_risk_score: number;
  twin_priority: "Critical" | "High" | "Medium" | "Low";
  deterioration_rate: number;
  minutes_waiting: number;
  alert_level: TwinAlertLevel;
  alert_reasons: string[];
  computed_at: string;
}

export interface TriageQueueItem {
  patient: Patient;
  visit: Visit;
  assessment: Assessment;
  summary: Summary;
  twin?: TwinState | null;
}

export interface Department {
  name: string;
  status: 'Active' | 'Overloaded' | 'Inactive' | string;
  active_patients: number;
  wait_time_mins: number;
}

export interface ShiftReportData {
  total_patients: number;
  critical_count: number;
  avg_wait_time: number; // in minutes
  longest_wait_time: number; // in minutes
  priority_distribution: {
    name: string; // "Low", "Medium", "High", "Critical"
    value: number;
  }[];
  queue_distribution: {
    name: string; // "Emergency", "General"
    value: number;
  }[];
  department_workload: {
    name: string; // Department name
    count: number;
  }[];
}
