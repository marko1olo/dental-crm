import type {
	CmoAuditEvaluatedVisit,
	CmoAuditVisitItem,
	EmkDefectTag,
	EmkQualityStatus,
	Dashboard,
} from "@dental/shared";

/**
 * Clinical AI report widget data item (Mandate 8ap).
 */
export type ClinicalAiReport = {
	readonly id: string;
	readonly reportUrl: string;
	readonly createdAt: string | null;
};

/**
 * Backward-compatible alias for Diagnocat AI report widget.
 */
export type DiagnocatReport = ClinicalAiReport;

/**
 * Rejection / Handoff modal props.
 */
export interface RejectionModalProps {
	readonly visit: CmoAuditEvaluatedVisit;
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onSubmit: (
		visitId: string,
		rejectionReason: string,
		defectTags: EmkDefectTag[],
	) => Promise<void>;
	readonly isSubmitting: boolean;
}

export type EmkVisitHandoffModalProps = RejectionModalProps;

/**
 * Props for the main EMK Control Board.
 */
export interface EmkControlBoardProps {
	readonly dashboard?: Dashboard | null | undefined;
}

/**
 * Protocol step identifiers for the clinical stepper.
 */
export type EmkProtocolStepId =
	| "complaints"
	| "anamnesis"
	| "examination"
	| "diagnosis"
	| "treatment_plan"
	| "checkout";

/**
 * Step descriptor for clinical protocol progress.
 */
export interface EmkProtocolStep {
	readonly id: EmkProtocolStepId;
	readonly titleRu: string;
	readonly shortTitleRu: string;
	readonly isRequired: boolean;
	readonly isCompleted: boolean;
	readonly completionPercent: number;
}

/**
 * Autosave draft status for background syncing in IDB and REST.
 */
export type AutosaveStatus =
	| "idle"
	| "saving"
	| "saved"
	| "error"
	| "offline_queued";

export interface EmkAutosaveState {
	readonly status: AutosaveStatus;
	readonly lastSavedAtIso: string | null;
	readonly hasUnsavedChanges: boolean;
	readonly storageTarget: "idb" | "rest" | "both";
	readonly errorMessage?: string | null;
}
