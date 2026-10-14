import type {
	TreatmentPlanItem,
	TreatmentPlanScenario,
	VisitCloseChecklistItem,
} from "@dental/shared";
import type React from "react";
import type { SoftPeerPresence } from "../../../hooks/useSoftPresence";
import type { VisitCriticalBadge } from "./visitCriticalBadges";
import type {
	VisitAppointmentEntity,
	VisitDoctorEntity,
	VisitNoteFormExtended,
	VisitPatientEntity,
	VisitPrimaryActionConfig,
	VisitViewProps,
} from "./VisitViewProps";

export type {
	VisitAppointmentEntity,
	VisitDoctorEntity,
	VisitNoteFormExtended,
	VisitPatientEntity,
	VisitPrimaryActionConfig,
	VisitViewProps,
};

export type VisitSubViewTabType =
	| "odontogram"
	| "emk"
	| "diagnostics"
	| "plan"
	| "consents"
	| "anamnesis"
	| string;

export interface VisitLoadedTreatmentPlan
	extends Omit<Partial<TreatmentPlanScenario>, "id" | "status" | "createdAt">,
		Omit<Partial<TreatmentPlanItem>, "id" | "status" | "createdAt"> {
	id?: string;
	status?: TreatmentPlanItem["status"] | string;
	createdAt?: string;
	plannedAt?: string;
	date?: string;
	stages?: unknown[];
	items?: unknown[];
}

export interface VisitViewHeaderProps {
	activePatient: VisitPatientEntity;
	patientAge: string | null;
	activeAppointment?: VisitAppointmentEntity | null | undefined;
	activeDoctor?: VisitDoctorEntity | null | undefined;
	activePatientCriticalBadges: readonly VisitCriticalBadge[];
	consolidatedAllergyChip: string | null;
	activePeers: readonly SoftPeerPresence[];
	summaryText: string | null;
	visitNoteForm?: VisitNoteFormExtended | undefined;
	updateVisitNoteField?:
		| ((field: string, value: string) => void)
		| undefined;
	handleApplySomaticNormQuick: () => void;
	handlePrintForm043uFast: () => void;
	handlePrintCompletedActFast: () => void;
	handlePrintEstimateFast: () => void;
	handlePrintInformedConsentFast: () => void;
	handleOpenLabOrder: () => void;
	setIsEmergencyModalOpen: (open: boolean) => void;
	handleFinishVisitAction: () => void;
	setIsQueueCockpitForced: (forced: boolean) => void;
	setSelectedPatientId?: ((id: string | null) => void) | undefined;
	appLogic?:
		| (Partial<VisitViewProps> & {
				setSelectedPatientId?: ((id: string | null) => void) | undefined;
		  })
		| undefined;
	isHeaderMoreMenuOpen: boolean;
	setIsHeaderMoreMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	headerMoreMenuRef: React.RefObject<HTMLDivElement | null>;
	setIsDoctorShiftModalOpen: (open: boolean) => void;
	setIsPriceValidatorModalOpen: (open: boolean) => void;
	setIsStagePaymentModalOpen: (open: boolean) => void;
	setIsWarrantyModalOpen?: ((open: boolean) => void) | undefined;
	onOpenVisiographComparison?: (() => void) | undefined;
	setIsVisiographComparisonModalOpen?: ((open: boolean) => void) | undefined;
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
	loadedTreatmentPlan: VisitLoadedTreatmentPlan | null | undefined;
	activeAppointment: VisitAppointmentEntity | null | undefined;
	activePatient: VisitPatientEntity | null | undefined;
	visitSubViewTab: string;
	safeVisitPrimaryAction: VisitPrimaryActionConfig;
	isTreatmentPlanExpiredSoft: boolean;
	treatmentPlanAgeDays: number;
	props: VisitViewProps;
	transcript: string;
	setTranscript?: ((val: string | ((prev: string) => string)) => void) | undefined;
	isTranscriptPolishing?: boolean | undefined;
	polishTranscript?: (() => Promise<void> | void) | undefined;
	updateVisitNoteField?: ((field: string, val: string) => void) | undefined;
	visitNoteForm?: VisitNoteFormExtended | undefined;
	handlePrintForm043uFast: () => void;
	setIsPriceValidatorModalOpen: (open: boolean) => void;
	setIsStagePaymentModalOpen: (open: boolean) => void;
	openCloseChecklistSection?:
		| ((task: VisitCloseChecklistItem) => void)
		| undefined;
}
