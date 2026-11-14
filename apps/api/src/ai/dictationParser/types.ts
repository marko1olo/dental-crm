import type { ClinicalToothState } from "../dentalSpeechGrammar.js";
import type {
	AnesthesiaResult,
	ClinicalProcedureResult,
} from "../grammar/clinicalGrammarTypes.js";

export interface ToothUpdate {
	code: string;
	state:
		| "treatment"
		| "missing"
		| "watch"
		| "planned"
		| "done"
		| "prosthetics"
		| "implant"
		| "calculus";
	surfaces?: string[] | undefined;
	clinicalState?: ClinicalToothState | undefined;
	diagnosisCode?: string | undefined;
	diagnosisTitle?: string | undefined;
}

export interface EmkUpdates {
	complaint?: string | undefined;
	anamnesis?: string | undefined;
	objectiveStatus?: string | undefined;
	diagnosis?: string | undefined;
	diagnosisIcd10?: string | undefined;
	treatmentPlan?: string | undefined;
	recommendations?: string | undefined;
	costRub?: number | undefined;
	anesthesia?: AnesthesiaResult | undefined;
	procedures?: ClinicalProcedureResult[] | undefined;
}

export type DictationActionType =
	| "update_tooth"
	| "schedule"
	| "reschedule"
	| "cancel_schedule"
	| "open_card"
	| "add_implant"
	| "create_patient"
	| "complex_llm_fallback";

export interface SchedulePayload {
	patientName: string;
	phone?: string | undefined;
	dayOffset?: number | undefined;
	targetWeekday?: number | undefined;
	exactDate?: string | undefined;
	time?: string | undefined;
	doctorOrSpecialty?: string | null | undefined;
}

export interface ReschedulePayload {
	patientName: string;
	dayOffset?: number | undefined;
	targetWeekday?: number | undefined;
	exactDate?: string | undefined;
	time?: string | undefined;
}

export interface CancelSchedulePayload {
	patientName: string;
}

export interface OpenCardPayload {
	patientName: string;
}

export interface AddImplantPayload {
	diameter: number;
	length: number;
}

export interface CreatePatientPayload {
	fullName?: string | null | undefined;
	phone?: string | null | undefined;
	notes?: string | undefined;
}

export interface UpdateToothPayload {
	toothUpdates?: ToothUpdate[] | undefined;
	emkUpdates?: EmkUpdates | undefined;
	anesthesia?: AnesthesiaResult | undefined;
	procedures?: ClinicalProcedureResult[] | undefined;
}

export type SmartActionPayload =
	| SchedulePayload
	| ReschedulePayload
	| CancelSchedulePayload
	| OpenCardPayload
	| AddImplantPayload
	| CreatePatientPayload
	| UpdateToothPayload
	| Record<string, unknown>;

export interface SmartAction {
	action: DictationActionType;
	payload?: SmartActionPayload | undefined;
	toothUpdates?: ToothUpdate[] | undefined;
	emkUpdates?: EmkUpdates | undefined;
	anesthesia?: AnesthesiaResult | undefined;
	procedures?: ClinicalProcedureResult[] | undefined;
}

/** Алиасы предметной области разбора диктовки врача у кресла */
export type SurfaceDictationCode = "O" | "M" | "D" | "V" | "L" | "B" | "P" | string;
export type ToothDictationItem = ToothUpdate;
export type ParsedClinicalDictation = SmartAction;

export interface DateExtractionResult {
	dayString?: string;
	relativeDays?: number;
	targetWeekday?: number;
}
