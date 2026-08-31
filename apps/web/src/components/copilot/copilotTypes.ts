export interface TextUiMessage {
  kind: 'text';
  role: 'user' | 'assistant';
  text: string;
  streaming?: boolean | undefined;
}

export interface ToolUiMessage {
  kind: 'tool';
  callId: string;
  name: string;
  status: 'running' | 'done' | 'failed';
  args?: Record<string, unknown> | undefined;
  result?: unknown;
}

export interface ConfirmUiMessage {
  kind: 'confirmation';
  callId: string;
  name: string;
  args: Record<string, unknown>;
  resolved?: ('confirm' | 'reject') | undefined;
}

export type CopilotUiMessage = TextUiMessage | ToolUiMessage | ConfirmUiMessage;

export interface PendingConfirmation {
  callId: string;
  name: string;
  args: Record<string, unknown>;
}

export type CopilotPhase = 'thinking' | 'working' | 'writing' | null;

export interface CopilotNudge {
  id: string;
  kind: string;
  payload?: Record<string, unknown> | undefined;
  created_at: string;
  expires_at?: string | undefined;
}

export interface CopilotSuggestion {
  id: string;
  icon: string;
  cat: 'workflows' | 'patients' | 'agenda' | 'recalls' | 'money' | 'reports';
  labelRu: string;
  labelEn: string;
  promptRu: string;
  promptEn: string;
}

export type ConfirmHandler = (
  callId: string,
  action: 'confirm' | 'reject',
  modifiedArgs?: Record<string, unknown> | undefined,
  reason?: string | undefined,
) => void;
export interface SuggestionCategory {
  category: string;
  items: Array<{ label: string; prompt: string; icon?: string }>;
}

export interface SlotResult {
  start_time: string;
  end_time?: string | undefined;
  cabinet?: string | undefined;
  professional_name?: string | undefined;
  doctor_name?: string | undefined;
}

export interface PatientResult {
  id: string;
  full_name: string;
  phone?: string | undefined;
  email?: string | undefined;
  status?: string | undefined;
  date_of_birth?: string | undefined;
  birth_date?: string | undefined;
}

export interface AppointmentResult {
  id: string;
  patient_name?: string | undefined;
  start_time?: string | undefined;
  end_time?: string | undefined;
  status?: string | undefined;
  cabinet?: string | undefined;
  service?: string | undefined;
  doctor_name?: string | undefined;
}

export interface LabOrderItem {
  id?: string | undefined;
  order_id?: string | undefined;
  order_number?: string | undefined;
  prosthesis_kind?: string | undefined;
  prosthesis_type?: string | undefined;
  kind?: string | undefined;
  tooth?: string | number | undefined;
  tooth_number?: string | number | undefined;
  teeth?: (string | number)[] | undefined;
  shade?: string | undefined;
  vita_shade?: string | undefined;
  status?: string | undefined;
  eta?: string | undefined;
  delivery_date?: string | undefined;
  lab_name?: string | undefined;
  patient_name?: string | undefined;
  notes?: string | undefined;
}

export interface DrugInteractionItem {
  id?: string | undefined;
  severity: 'contraindicated' | 'high' | 'moderate' | 'low' | 'warning' | string;
  medicationA?: string | undefined;
  medicationB?: string | undefined;
  drugs?: string[] | undefined;
  title?: string | undefined;
  description: string;
  medical_advice?: string | undefined;
  clinical_recommendation?: string | undefined;
  allergy_match?: boolean | undefined;
  allergen?: string | undefined;
}

export interface TimelineEventItem {
  id: string;
  date: string;
  type: 'visit' | 'diagnosis' | 'treatment_stage' | 'payment' | 'lab_order' | string;
  title: string;
  doctor_name?: string | undefined;
  specialty?: string | undefined;
  diagnosis_code?: string | undefined;
  icd10?: string | undefined;
  amount_rub?: number | undefined;
  teeth?: (string | number)[] | undefined;
  status?: string | undefined;
  description?: string | undefined;
}

export interface FamilyMemberBalance {
  patient_id: string;
  patient_name: string;
  relationship: string;
  balance_rub: number;
  unpaid_invoices_count?: number | undefined;
}

export interface FamilyBalanceResult {
  family_id?: string | undefined;
  primary_patient_name?: string | undefined;
  total_family_balance_rub: number;
  total_unpaid_invoices_rub?: number | undefined;
  members: FamilyMemberBalance[];
}

export type SelectIdHandler = ((id: string) => void) | undefined;
export type BookSlotHandler = ((slot: SlotResult) => void) | undefined;
