/**
 * clinicalGrammarTypes.ts — Типы данных и интерфейсы для клинической грамматики
 */

export type ClinicalToothState =
	| "Caries"
	| "Pulpitis"
	| "Periodontitis"
	| "Missing"
	| "Crown"
	| "Implant"
	| "Filled"
	| "Healthy"
	| "Planned_Implant"
	| "Retained"
	| "Root";

export interface ToothUpdateResult {
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

export interface AnesthesiaResult {
	drugKey: string;
	tradeName: string;
	displayName: string;
	volumeMl: number;
	cartridgeCount: number;
	technique: "infiltration" | "conduction" | "application" | "intraligamentary";
	concentration?: string | undefined;
	code804n?: string | undefined;
}

export interface Procedure804nResult {
	code804n: string;
	name: string;
	category: "therapy" | "surgery" | "endodontics" | "hygiene" | "orthopedics" | "anesthesia" | "isolation";
	quantity: number;
	toothNumber?: number | undefined;
	priceRub?: number | undefined;
	shade?: string | undefined;
}

export interface SoapRecordResult {
	complaint?: string | undefined;
	anamnesis?: string | undefined;
	objectiveStatus?: string | undefined;
	diagnosis?: string | undefined;
	diagnosisIcd10?: string | undefined;
	treatmentPlan?: string | undefined;
	recommendations?: string | undefined;
}

export interface DiagnosisRule {
	readonly code: string;
	readonly title: string;
	readonly toothState: ToothUpdateResult["state"];
	readonly clinicalState: ClinicalToothState;
	readonly patterns: readonly string[];
}
