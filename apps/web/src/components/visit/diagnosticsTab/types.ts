import type { ClinicalPhotoAttachment } from "../../../lib/clinicalProtocols043";

export type DiagnosticTabMode = "rvg" | "photo" | "cbct";

export interface VisitDiagnosticsTabProps {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	activePatient?: any;
	onInsertToProtocol?: (text: string) => void;
}

export interface DiagnosticStudy {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	id: string;
	patientId?: string;
	title?: string;
	kind?: string;
	modality?: string;
	toothCode?: string | null;
	previewUrl?: string;
	viewerUrl?: string;
	capturedAt?: string;
	effectiveDoseMicrosv?: number;
	status?: string;
}

export type PhotoStageType =
	| "before"
	| "after"
	| "process"
	| "intraoral_macro"
	| "face_portrait";

export interface DiagnosticsModalsState {
	isCephModalOpen: boolean;
	isRadiologyModalOpen: boolean;
	isReportStudioModalOpen: boolean;
	isPhotoProtocolModalOpen: boolean;
	isCtSelectorModalOpen: boolean;
	isDirectRvgModalOpen: boolean;
	isDicomViewerModalOpen: boolean;
	selectedDicomImageSrc?: string;
	selected3DScanModelUrl: string | null;
	selected3DScanTitle?: string;
	isHotFolderModalOpen: boolean;
}
