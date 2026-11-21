import type { ClinicalPhotoAttachment } from "../../../lib/clinicalProtocols";

export type DiagnosticTabMode = "rvg" | "photo" | "cbct";

export interface DiagnosticsPatient {
	readonly id?: string | undefined;
	readonly fullName?: string | undefined;
	readonly name?: string | undefined;
	readonly cardNumber?: string | undefined;
	readonly medCardNumber?: string | undefined;
	readonly birthDate?: string | Date | undefined;
	readonly [key: string]: unknown;
}

export interface VisitDiagnosticsTabProps {
	activePatient?: DiagnosticsPatient | null | undefined;
	onInsertToProtocol?: ((text: string) => void) | undefined;
}

export interface DiagnosticStudy {
	id: string;
	patientId?: string | undefined;
	visitId?: string | null | undefined;
	title?: string | undefined;
	kind?: string | undefined;
	modality?: string | undefined;
	toothCode?: string | null | undefined;
	previewUrl?: string | undefined;
	viewerUrl?: string | undefined;
	fileUrl?: string | undefined;
	capturedAt?: string | undefined;
	effectiveDoseMicrosv?: number | undefined;
	status?: string | undefined;
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
