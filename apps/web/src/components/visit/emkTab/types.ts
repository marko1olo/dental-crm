import type React from "react";
import type { DentitionMode } from "@dental/shared";
import type { VisitToothUiState } from "../../../store/visitStore";
import type { ClinicalVisitCompletionResult } from "../clinicalVisitWorkflow";
import type { VisitNoteFieldsPatch } from "../clinicalCatalog/clinicalProtocolsCatalog";

export type { DentitionMode };

export type ActivePatientRecord = Record<string, unknown>;
export type VisitDashboardSlice = Record<string, unknown>;
export type VisitNoteFormValues = Record<string, unknown>;
export type VisitNoteSaveHandler = () => Promise<void>;
export interface VisitEmkTabProps {
	visitNoteForm?: Record<string, unknown>;
	updateVisitNoteField?: (field: string, value: unknown) => void;
	draft?: unknown;
	patientHistory?: unknown;
	activePatient?: any;
	dashboard?: any;
	openVisitId?: string;
	isDraftAccepting?: boolean;
	[key: string]: any;
}

export interface VisitEmkOdontogramBarProps {
	activePatient?: {
		id?: string;
		age?: number;
		birthDate?: string;
		fullName?: string;
		toothStates?: Record<string, string> | Array<{ toothNumber?: number | string; code?: string; state?: string }>;
		patientHistory?: {
			toothStates?: Record<string, string> | Array<{ toothNumber?: number | string; code?: string; state?: string }>;
			teeth?: Array<{ toothNumber?: number | string; code?: string; state?: string }>;
		} | Array<{ toothNumber?: number | string; code?: string; state?: string }>;
		teeth?: Array<{ toothNumber?: number | string; code?: string; state?: string }>;
	} | null;
	patientHistory?: {
		toothStates?: Record<string, string> | Array<{ toothNumber?: number | string; code?: string; state?: string }>;
		teeth?: Array<{ toothNumber?: number | string; code?: string; state?: string }>;
	} | Array<{ toothNumber?: number | string; code?: string; state?: string }> | null;
	visitNoteForm: Record<string, unknown>;
	updateVisitNoteField: (field: string, value: unknown) => void;
	effectiveActiveTooth: number | null;
	visitToothStateByCode?: Record<string, VisitToothUiState | undefined>;
	draft?: unknown;
}

export interface VisitEmkModalsProps {
	isSbpQrModalOpen: boolean;
	setIsSbpQrModalOpen: (open: boolean) => void;
	completionResult: ClinicalVisitCompletionResult | null;
	activePatient?: {
		id?: string;
		fullName?: string;
		birthDate?: string;
		medicalCardNumber?: string;
		cardNumber?: string;
		passport?: string;
		phone?: string;
		snils?: string;
		address?: string;
	} | null;
	isStarProtocolsOpen: boolean;
	setIsStarProtocolsOpen: (open: boolean) => void;
	isSoapTemplatesModalOpen: boolean;
	setIsSoapTemplatesModalOpen: (open: boolean) => void;
	isConsentModalOpen: boolean;
	setIsConsentModalOpen: (open: boolean) => void;
	isPrintModalOpen: boolean;
	setIsPrintModalOpen: (open: boolean) => void;
	visitNoteForm: Record<string, any>;
	updateVisitNoteField: (field: string, value: any) => void;
	isSignedVisit: boolean;
	dashboard?: any;
	onApplyCatalogPatch: (patch: VisitNoteFieldsPatch, successMessage: string) => void;
}

export interface VisitEmkCompletionSectionProps {
	isSignedVisit: boolean;
	isRevisingVisitNote: boolean;
	setIsRevisingVisitNote: (revising: boolean) => void;
	handleSaveVisitNote: () => Promise<void>;
	handleCompleteVisitAndGenerateReceipt: () => Promise<void>;
	isDraftAccepting?: boolean;
	isCompletingVisit: boolean;
	completionResult: ClinicalVisitCompletionResult | null;
	completionError?: string | null | undefined;
	setIsSbpQrModalOpen: (open: boolean) => void;
	activeEmkTab: string;
	setActiveEmkTab: (tab: string) => void;
}

export interface VisitEmkServicesBillingProps {
	openVisitId: string;
	visitNoteForm: Record<string, any>;
	updateVisitNoteField: (field: string, value: any) => void;
	isLocked: boolean;
	activePatient?: any;
	dashboard?: any;
	effectiveActiveTooth: number | null;
}

export interface VisitEmkCanvasProps {
	activeEmkTab: string;
	visitNoteForm: Record<string, any>;
	updateVisitNoteField: (field: string, value: any) => void;
	isLocked: boolean;
	effectiveActiveTooth: number | null;
	activePatient?: any;
	dashboard?: any;
	openVisitId: string;
	setIsSoapTemplatesModalOpen: (open: boolean) => void;
	handleCompleteVisitAndGenerateReceipt: () => Promise<void>;
	isCompletingVisit: boolean;
	onApplySoapPreset?: (preset: any, targetTooth?: number | null) => void;
}
