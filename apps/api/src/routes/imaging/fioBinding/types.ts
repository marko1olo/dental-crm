/**
 * @file types.ts
 * @description Domain contracts, DTOs, and status definitions for DICOM/CBCT patient FIO binding.
 */

/**
 * Статусы привязки исследования КТ/DICOM к пациенту
 */
export type BindingStatus =
	| "auto_bound"
	| "manual_bound"
	| "pending_review"
	| "unassigned";

export interface PatientBindingCandidate {
	patientId: string;
	patientFullName: string;
	confidence: number;
	status: BindingStatus;
	matchMethod: string;
	matchDetails: string;
}

export interface PatientFioBindingResult {
	patientId: string | null;
	patientFullName: string | null;
	confidence: number;
	status: BindingStatus;
	matchMethod: string;
	matchDetails: string;
	candidates?: Array<{
		patientId: string;
		patientFullName: string;
		confidence: number;
	}>;
}

export interface AutoBindScanSummary {
	scanned: number;
	autoBound: number;
	pendingReview: number;
	unassigned: number;
	results: Array<{
		studyId: string;
		patientId: string | null;
		patientFullName: string | null;
		status: BindingStatus;
		confidence: number;
		matchMethod: string;
	}>;
}

export interface ScoredMatch {
	patientId: string;
	patientFullName: string;
	confidence: number;
	rawScore: number;
	exactBirthDateMatch: boolean;
	status: BindingStatus;
	matchMethod: string;
	matchDetails: string;
}
