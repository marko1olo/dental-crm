import type React from "react";
import type { DentitionMode } from "../view/VisitEmbeddedOdontogram";
import type { VisitToothUiState } from "../../../store/visitStore";
import type { ClinicalVisitCompletionResult } from "../clinicalVisitWorkflow";
import type { VisitNoteFieldsPatch } from "../../clinicalCatalog";

export type { DentitionMode };

export interface VisitEmkOdontogramBarProps {
	activePatient?: {
		id?: string;
		age?: number;
		birthDate?: string;
		fullName?: string;
	} | null;
	visitNoteForm: Record<string, any>;
	updateVisitNoteField: (field: string, value: any) => void;
	effectiveActiveTooth: number;
	visitToothStateByCode?: Record<string, VisitToothUiState | undefined>;
	draft?: any;
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
	effectiveActiveTooth: number;
}

export interface VisitEmkCanvasProps {
	activeEmkTab: string;
	visitNoteForm: Record<string, any>;
	updateVisitNoteField: (field: string, value: any) => void;
	isLocked: boolean;
	effectiveActiveTooth: number;
	activePatient?: any;
	dashboard?: any;
	openVisitId: string;
	setIsSoapTemplatesModalOpen: (open: boolean) => void;
	handleCompleteVisitAndGenerateReceipt: () => Promise<void>;
	isCompletingVisit: boolean;
}
