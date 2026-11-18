import type React from "react";
import type { Dashboard, DentitionMode, VisitFlowResult } from "@dental/shared";
import type { VisitToothUiState } from "../../../store/visitStore";
import type { ClinicalVisitCompletionResult } from "../clinicalVisitWorkflow";
import type { VisitNoteFieldsPatch } from "../clinicalCatalog/clinicalProtocolsCatalog";
import type { VisitDoctorEntity, VisitPatientEntity } from "../view/VisitViewProps";
import type { ClinicalSoapPreset } from "../clinicalSoapPresets";

export type { DentitionMode };

export type ActivePatientRecord = Record<string, unknown>;
export type VisitDashboardSlice = Record<string, unknown>;
export type VisitNoteFormValues = Record<string, unknown>;
export type VisitNoteSaveHandler = () => Promise<void>;

export interface VisitEmkDashboardEntity {
	activeDoctor?: VisitDoctorEntity | { id?: string; fullName?: string; specialty?: string } | null | undefined;
	activeVisit?: {
		id?: string | null | undefined;
		diagnosisTooth?: string | number | null | undefined;
		specialty?: string | null | undefined;
		treatmentPlanId?: string | null | undefined;
		stageNumber?: number | null | undefined;
		organizationId?: string | null | undefined;
		status?: string | null | undefined;
		revision?: number | null | undefined;
		[key: string]: unknown;
	} | null | undefined;
	activeAppointment?: {
		treatmentPlanId?: string | null | undefined;
		stageNumber?: number | null | undefined;
		[key: string]: unknown;
	} | null | undefined;
	visitFlowResult?: VisitFlowResult | null | undefined;
	[key: string]: unknown;
}

export interface VisitEmkTabProps {
	visitNoteForm?: Record<string, unknown> | undefined;
	updateVisitNoteField?: ((field: string, value: unknown) => void) | undefined;
	draft?: unknown;
	patientHistory?: VisitEmkOdontogramBarProps["patientHistory"];
	activePatient?: VisitPatientEntity | null | undefined;
	activeDoctor?: VisitDoctorEntity | null | undefined;
	dashboard?: (Dashboard & VisitEmkDashboardEntity) | null | undefined;
	openVisitId?: string | undefined;
	isDraftAccepting?: boolean | undefined;
	[key: string]: unknown;
}

export interface VisitEmkOdontogramBarProps {
	activePatient?: (VisitPatientEntity & {
		age?: number | undefined;
		birthDate?: string | null | undefined;
		fullName?: string | undefined;
		toothStates?: Record<string, string> | Array<{ toothNumber?: number | string | undefined; code?: string | undefined; state?: string | undefined }> | undefined;
		patientHistory?: {
			toothStates?: Record<string, string> | Array<{ toothNumber?: number | string | undefined; code?: string | undefined; state?: string | undefined }> | undefined;
			teeth?: Array<{ toothNumber?: number | string | undefined; code?: string | undefined; state?: string | undefined }> | undefined;
		} | Array<{ toothNumber?: number | string | undefined; code?: string | undefined; state?: string | undefined }> | undefined;
		teeth?: Array<{ toothNumber?: number | string | undefined; code?: string | undefined; state?: string | undefined }> | undefined;
		[key: string]: unknown;
	}) | null | undefined;
	patientHistory?: {
		toothStates?: Record<string, string> | Array<{ toothNumber?: number | string | undefined; code?: string | undefined; state?: string | undefined }> | undefined;
		teeth?: Array<{ toothNumber?: number | string | undefined; code?: string | undefined; state?: string | undefined }> | undefined;
	} | Array<{ toothNumber?: number | string | undefined; code?: string | undefined; state?: string | undefined }> | null | undefined;
	visitNoteForm: Record<string, unknown>;
	updateVisitNoteField: (field: string, value: unknown) => void;
	effectiveActiveTooth: number | null;
	visitToothStateByCode?: Record<string, VisitToothUiState | undefined> | undefined;
	draft?: unknown;
}

export interface VisitEmkModalsProps {
	isSbpQrModalOpen: boolean;
	setIsSbpQrModalOpen: (open: boolean) => void;
	completionResult: ClinicalVisitCompletionResult | null | undefined;
	activePatient?: VisitPatientEntity | {
		id?: string | undefined;
		fullName?: string | undefined;
		birthDate?: string | undefined;
		medicalCardNumber?: string | undefined;
		cardNumber?: string | undefined;
		passport?: string | undefined;
		phone?: string | undefined;
		snils?: string | undefined;
		address?: string | undefined;
	} | null | undefined;
	activeDoctor?: VisitDoctorEntity | { id?: string; fullName?: string; specialty?: string } | null | undefined;
	isStarProtocolsOpen: boolean;
	setIsStarProtocolsOpen: (open: boolean) => void;
	isSoapTemplatesModalOpen: boolean;
	setIsSoapTemplatesModalOpen: (open: boolean) => void;
	isConsentModalOpen: boolean;
	setIsConsentModalOpen: (open: boolean) => void;
	isPrintModalOpen: boolean;
	setIsPrintModalOpen: (open: boolean) => void;
	visitNoteForm: Record<string, unknown>;
	updateVisitNoteField: (field: string, value: unknown) => void;
	isSignedVisit: boolean;
	dashboard?: (Dashboard & VisitEmkDashboardEntity) | null | undefined;
	onApplyCatalogPatch: (patch: VisitNoteFieldsPatch, successMessage: string) => void;
}

export interface VisitEmkCompletionSectionProps {
	isSignedVisit: boolean;
	isRevisingVisitNote: boolean;
	setIsRevisingVisitNote: (revising: boolean) => void;
	handleSaveVisitNote: () => Promise<void>;
	handleCompleteVisitAndGenerateReceipt: () => Promise<void>;
	isDraftAccepting?: boolean | undefined;
	isCompletingVisit: boolean;
	completionResult: ClinicalVisitCompletionResult | null | undefined;
	completionError?: string | null | undefined;
	setIsSbpQrModalOpen: (open: boolean) => void;
	activeEmkTab: string;
	setActiveEmkTab: (tab: string) => void;
}

export interface VisitEmkServicesBillingProps {
	openVisitId: string;
	visitNoteForm: Record<string, unknown>;
	updateVisitNoteField: (field: string, value: unknown) => void;
	isLocked: boolean;
	activePatient?: VisitPatientEntity | null | undefined;
	activeDoctor?: VisitDoctorEntity | null | undefined;
	dashboard?: (Dashboard & VisitEmkDashboardEntity) | null | undefined;
	effectiveActiveTooth: number | null;
}

export interface VisitEmkCanvasProps {
	activeEmkTab: string;
	visitNoteForm: Record<string, unknown>;
	updateVisitNoteField: (field: string, value: unknown) => void;
	isLocked: boolean;
	effectiveActiveTooth: number | null;
	activePatient?: VisitPatientEntity | null | undefined;
	activeDoctor?: VisitDoctorEntity | null | undefined;
	dashboard?: (Dashboard & VisitEmkDashboardEntity) | null | undefined;
	openVisitId: string;
	setIsSoapTemplatesModalOpen: (open: boolean) => void;
	handleCompleteVisitAndGenerateReceipt: () => Promise<void>;
	isCompletingVisit: boolean;
	onApplySoapPreset?: ((preset: ClinicalSoapPreset, targetTooth?: number | null) => void) | undefined;
}
