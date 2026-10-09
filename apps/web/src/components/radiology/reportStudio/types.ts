/**
 * DENTE CRM — Radiology Report Studio Types & Contracts (Layer 0)
 * Window #5: Interactive Layout Sheet & Strict Clinical A4 Medical Blank.
 */

export type PageSizeOption = "A4" | "14x17_film" | "A3";
export type OrientationOption = "portrait" | "landscape";
export type LegendPlacementOption = "below" | "above" | "hidden";
export type RadiologyReportLayoutPreset = "single" | "two_vertical" | "two_horizontal" | "grid_four";

export interface ReportPrintSettings {
	pageSize: PageSizeOption;
	orientation: OrientationOption;
	legendPlacement: LegendPlacementOption;
	header: {
		showDate: boolean;
		showPatientInfo: boolean;
		showClinicLogo: boolean;
	};
	footer: {
		showClinicName: boolean;
		showPhone: boolean;
		showWebsite: boolean;
		showAddress: boolean;
	};
}

export interface ReportFrameItem {
	id: string;
	type: "image" | "text";
	x: number; // percentage 0..100
	y: number; // percentage 0..100
	width: number; // percentage 10..100
	height: number; // percentage 10..100
	imageUrl?: string | undefined;
	toothFdi?: string | undefined;
	modalityLabel?: string | undefined;
	dapDoseDgyCm2?: number | undefined;
	capturedAt?: string | undefined;
	zoomRatioPercent?: number | undefined;
	textContent?: string | undefined;
}

export interface RadiologyReportStudioModalProps {
	isOpen: boolean;
	onClose: () => void;
	patientName?: string | undefined;
	patientCardNumber?: string | undefined;
	patientAge?: string | number | undefined;
	patientGender?: string | undefined;
	doctorName?: string | undefined;
	clinicName?: string | undefined;
	clinicPhone?: string | undefined;
	clinicAddress?: string | undefined;
	clinicWebsite?: string | undefined;
	initialImages?: Array<{
		imageUrl: string;
		toothFdi?: string;
		modalityLabel?: string;
		dapDoseDgyCm2?: number;
		capturedAt?: string;
	}> | undefined;
}

export interface PatientStudyThumbnail {
	id: string;
	imageUrl: string;
	toothFdi: string;
	modalityLabel: string;
	dapDoseDgyCm2: number;
	capturedAt: string;
}

export interface DragState {
	mode: "move" | "resize";
	handle?: string;
	frameId: string;
	startX: number;
	startY: number;
	initX: number;
	initY: number;
	initW: number;
	initH: number;
}

export const DEFAULT_PRINT_SETTINGS: ReportPrintSettings = {
	pageSize: "A4",
	orientation: "portrait",
	legendPlacement: "below",
	header: {
		showDate: true,
		showPatientInfo: true,
		showClinicLogo: true,
	},
	footer: {
		showClinicName: true,
		showPhone: true,
		showWebsite: true,
		showAddress: true,
	},
};
