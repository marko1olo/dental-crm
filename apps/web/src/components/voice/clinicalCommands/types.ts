/**
 * types.ts — Типы данных и контракты для голосовых клинических команд.
 * Layer 0: Чистые типы без рантайм-зависимостей.
 */

export type ClinicalToothStatus =
	| "CARIES"
	| "PULPITIS"
	| "PERIODONTITIS"
	| "PERIODONTITIS_GENERAL"
	| "MISSING"
	| "RESTORATION"
	| "CROWN"
	| "IMPLANT"
	| "INLAY"
	| "HEALTHY"
	| "WEDGE_DEFECT"
	| "EROSION"
	| "FRACTURE";

export type SoapSectionType =
	| "subjective"
	| "objective"
	| "assessment"
	| "plan"
	| "recommendations";

export type CommandConfidenceLevel = "high" | "review";

export type CommandCategory =
	| "odontogram"
	| "soap"
	| "anesthesia"
	| "consumable"
	| "navigation"
	| "general";

export interface AnesthesiaParsedInfo {
	drug: string;
	volumeMl?: number;
	cartridgeCount?: number;
	technique?: "infiltration" | "conduction" | "application";
	concentration?: string;
}

export interface ConsumableParsedInfo {
	name: string;
	quantity?: number;
	unit?: string;
}

export interface ParsedClinicalVoiceCommand {
	id: string;
	rawSpeech: string;
	category: CommandCategory;
	confidence: number;
	confidenceLevel: CommandConfidenceLevel;
	summary: string;
	toothNumber?: number | null;
	icd10Code?: string | null;
	icd10Title?: string | null;
	clinicalStatus?: ClinicalToothStatus | null;
	soapSection?: SoapSectionType | null;
	soapText?: string | null;
	anesthesiaDetails?: AnesthesiaParsedInfo | null;
	consumableDetails?: ConsumableParsedInfo | null;
	applied?: boolean;
}

export interface SoapAggregatedNote {
	subjective?: string;
	objective?: string;
	assessment?: string;
	plan?: string;
	recommendations?: string;
}

export interface ClinicalVoiceParseResult {
	transcript: string;
	commands: ParsedClinicalVoiceCommand[];
	soapNote: SoapAggregatedNote;
	detectedTeeth: number[];
	summary: string;
}

export interface DiagnosisDefinition {
	code: string;
	title: string;
	status: ClinicalToothStatus;
	patterns: string[];
	confidence: number;
}
