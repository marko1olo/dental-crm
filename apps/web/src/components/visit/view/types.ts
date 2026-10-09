import type React from "react";
import type { VisitViewProps } from "./VisitViewProps";

export type { VisitViewProps };

export type VisitSubViewTabType =
	| "odontogram"
	| "emk"
	| "diagnostics"
	| "plan"
	| "consents"
	| "anamnesis"
	| string;

export interface VisitViewHeaderProps {
	// biome-ignore lint/suspicious/noExplicitAny: patient entity
	activePatient: any;
	patientAge: string | null;
	// biome-ignore lint/suspicious/noExplicitAny: appointment entity
	activeAppointment?: any;
	// biome-ignore lint/suspicious/noExplicitAny: doctor entity
	activeDoctor?: any;
	// biome-ignore lint/suspicious/noExplicitAny: badges list
	activePatientCriticalBadges: readonly any[];
	consolidatedAllergyChip: string | null;
	activePeers: readonly any[];
	summaryText: string | null;
	// biome-ignore lint/suspicious/noExplicitAny: note form
	visitNoteForm?: any;
	updateVisitNoteField?: (field: string, value: string) => void;
	handleApplySomaticNormQuick: () => void;
	handlePrintForm043uFast: () => void;
	handlePrintCompletedActFast: () => void;
	handlePrintEstimateFast: () => void;
	handlePrintInformedConsentFast: () => void;
	handleOpenLabOrder: () => void;
	setIsEmergencyModalOpen: (open: boolean) => void;
	handleFinishVisitAction: () => void;
	setIsQueueCockpitForced: (forced: boolean) => void;
	setSelectedPatientId?: (id: string | null) => void;
	// biome-ignore lint/suspicious/noExplicitAny: appLogic fallback
	appLogic?: any;
	isHeaderMoreMenuOpen: boolean;
	setIsHeaderMoreMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	headerMoreMenuRef: React.RefObject<HTMLDivElement | null>;
	setIsDoctorShiftModalOpen: (open: boolean) => void;
	setIsPriceValidatorModalOpen: (open: boolean) => void;
	setIsStagePaymentModalOpen: (open: boolean) => void;
}

export interface VisitTabItem {
	id: string;
	testId: string;
	label: string;
}

export interface VisitTabNavProps {
	activeTab: string;
	onTabChange: (tabId: string) => void;
}

export interface VisitActionFooterProps {
	// biome-ignore lint/suspicious/noExplicitAny: plan payload
	loadedTreatmentPlan: any;
	// biome-ignore lint/suspicious/noExplicitAny: appointment entity
	activeAppointment: any;
	// biome-ignore lint/suspicious/noExplicitAny: patient entity
	activePatient: any;
	visitSubViewTab: string;
	safeVisitPrimaryAction: {
		label: string;
		detail: string;
		onClick: () => Promise<void> | void;
		kind?: string;
	};
	isTreatmentPlanExpiredSoft: boolean;
	treatmentPlanAgeDays: number;
	// Smoke compat & secondary panels props
	// biome-ignore lint/suspicious/noExplicitAny: full props forward
	props: VisitViewProps;
	transcript: string;
	setTranscript?: (val: string) => void;
	isTranscriptPolishing?: boolean;
	polishTranscript?: any;
	updateVisitNoteField?: (field: string, val: string) => void;
	// biome-ignore lint/suspicious/noExplicitAny: form
	visitNoteForm?: any;
	handlePrintForm043uFast: () => void;
	setIsPriceValidatorModalOpen: (open: boolean) => void;
	setIsStagePaymentModalOpen: (open: boolean) => void;
}
