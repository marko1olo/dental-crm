import type {
	CmoAuditEvaluatedVisit,
	CmoAuditVisitItem,
	EmkDefectTag,
	EmkQualityStatus,
} from "@dental/shared";

/**
 * Diagnocat AI report widget data item.
 */
export type DiagnocatReport = {
	readonly id: string;
	readonly reportUrl: string;
	readonly createdAt: string | null;
};

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
	// biome-ignore lint/suspicious/noExplicitAny: integration dashboard prop
	readonly dashboard?: any;
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
