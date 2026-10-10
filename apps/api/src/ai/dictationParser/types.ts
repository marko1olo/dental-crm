import type { ClinicalToothState } from "../dentalSpeechGrammar.js";

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
	// biome-ignore lint/suspicious/noExplicitAny: clinical entity
	anesthesia?: any;
	// biome-ignore lint/suspicious/noExplicitAny: clinical entity
	procedures?: any[] | undefined;
}

export interface SmartAction {
	action:
		| "update_tooth"
		| "schedule"
		| "reschedule"
		| "cancel_schedule"
		| "open_card"
		| "add_implant"
		| "create_patient"
		| "complex_llm_fallback";
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	payload?: any;
	toothUpdates?: ToothUpdate[] | undefined;
	emkUpdates?: EmkUpdates | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: clinical entity
	anesthesia?: any;
	// biome-ignore lint/suspicious/noExplicitAny: clinical entity
	procedures?: any[] | undefined;
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
