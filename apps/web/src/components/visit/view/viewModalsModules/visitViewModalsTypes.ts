/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Visit View Modals Types (Mandate 8bk)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { ToothStateRecord } from "../fastPrintModules/fastPrintTypes";

export interface VisitModalPatientEntity {
	readonly id?: string | undefined;
	readonly patientId?: string | undefined;
	readonly fullName?: string | undefined;
	readonly name?: string | undefined;
	readonly cardNumber?: string | undefined;
	readonly medCardNumber?: string | undefined;
	readonly medicalCardNumber?: string | undefined;
	readonly birthDate?: string | undefined;
	readonly phone?: string | undefined;
	readonly snils?: string | undefined;
	readonly address?: string | undefined;
	readonly passport?: string | undefined;
	readonly allergies?: readonly string[] | string | undefined;
	readonly chronicDiseases?: readonly string[] | string | undefined;
	readonly [key: string]: unknown;
}

export interface VisitModalDoctorEntity {
	readonly id?: string | undefined;
	readonly userId?: string | undefined;
	readonly fullName?: string | undefined;
	readonly name?: string | undefined;
	readonly specialty?: string | undefined;
	readonly snils?: string | undefined;
	readonly [key: string]: unknown;
}

export interface VisitModalAppointmentEntity {
	readonly id?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly startTime?: string | undefined;
	readonly startAt?: string | undefined;
	readonly date?: string | undefined;
	readonly treatmentPlanId?: string | undefined;
	readonly stageId?: string | undefined;
	readonly stageNumber?: number | undefined;
	readonly stageTitle?: string | undefined;
	readonly status?: string | undefined;
	readonly [key: string]: unknown;
}

export interface VisitModalDashboardEntity {
	readonly organization?: {
		readonly id?: string | undefined;
		readonly name?: string | undefined;
		readonly [key: string]: unknown;
	} | undefined;
	readonly clinicSettings?: Record<string, unknown> | undefined;
	readonly activeVisit?: {
		readonly id?: string | undefined;
		readonly patientId?: string | undefined;
		readonly [key: string]: unknown;
	} | undefined;
	readonly [key: string]: unknown;
}

export interface VisitModalNoteFormEntity {
	readonly diagnosis?: string | undefined;
	readonly treatmentDescription?: string | undefined;
	readonly diary?: string | undefined;
	readonly anamnesis?: string | undefined;
	readonly statusLocalis?: string | undefined;
	readonly complaint?: string | undefined;
	readonly treatmentPlan?: string | undefined;
	readonly recommendations?: string | undefined;
	readonly [key: string]: unknown;
}

export interface VisitModalTreatmentPlanEntity {
	readonly id?: string | undefined;
	readonly title?: string | undefined;
	readonly [key: string]: unknown;
}

export interface VisitViewModalsProps {
	loadedTreatmentPlan?: VisitModalTreatmentPlanEntity | null | undefined;
	isVisiographComparisonModalOpen?: boolean | undefined;
	setIsVisiographComparisonModalOpen?: ((v: boolean) => void) | undefined;
	endoModalToothNumber: string | number | null;
	endoModalToothState?: string | undefined;
	isEndoModalOpen: boolean;
	setIsEndoModalOpen: (v: boolean) => void;
	setEndoModalToothNumber: (v: string | number | null) => void;
	isLabOrderModalOpen: boolean;
	setIsLabOrderModalOpen: (v: boolean) => void;
	labOrderModalToothNumber: string | number | null;
	setLabOrderModalToothNumber: (v: string | number | null) => void;
	isStagePaymentModalOpen: boolean;
	setIsStagePaymentModalOpen: (v: boolean) => void;
	isPriceValidatorModalOpen: boolean;
	setIsPriceValidatorModalOpen: (v: boolean) => void;
	priceValidatorPlanPayload?: unknown;
	priceValidatorCatalogList?: unknown;
	isEmergencyModalOpen: boolean;
	setIsEmergencyModalOpen: (v: boolean) => void;
	isVoiceDictationModalOpen: boolean;
	setIsVoiceDictationModalOpen: (v: boolean) => void;
	selectedToothForMenu: string | number | null | undefined;
	isWarrantyModalOpen: boolean;
	setIsWarrantyModalOpen: (v: boolean) => void;
	isDoctorShiftModalOpen: boolean;
	setIsDoctorShiftModalOpen: (v: boolean) => void;
	isInformedConsentModalOpen: boolean;
	setIsInformedConsentModalOpen: (v: boolean) => void;
	isPrescriptionModalOpen?: boolean | undefined;
	setIsPrescriptionModalOpen?: ((v: boolean) => void) | undefined;
	activePatient: VisitModalPatientEntity | null | undefined;
	activeDoctor: VisitModalDoctorEntity | null | undefined;
	dashboard: VisitModalDashboardEntity | null | undefined;
	patientAge?: string | null | undefined;
	appendToEMKField: (field: string, text: string) => void;
	setToothState: (code: string, state: string | ToothStateRecord | Record<string, unknown>) => void;
	visitNoteForm: VisitModalNoteFormEntity | null | undefined;
	activeAppointment: VisitModalAppointmentEntity | null | undefined;
}
