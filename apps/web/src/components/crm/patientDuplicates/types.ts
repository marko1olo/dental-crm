import type { DuplicateCandidate, DuplicateReport } from "../../../lib/patientDuplicatesApi";

export interface DuplicateConfirmState {
	key: string;
	keepLeft: boolean;
}

export interface PatientDuplicateRowProps {
	candidate: DuplicateCandidate;
	doubtful: boolean;
	isBusy: boolean;
	pendingConfirm: DuplicateConfirmState | null;
	onStartConfirm: (key: string, keepLeft: boolean) => void;
	onCancelConfirm: () => void;
	onMerge: (candidate: DuplicateCandidate, keepLeft: boolean) => void;
	onDismiss: (candidate: DuplicateCandidate) => void;
}
