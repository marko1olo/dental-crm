/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Visit View Modals Types (Mandate 8bk)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { ToothStateRecord } from "../fastPrintModules/fastPrintTypes";
import type {
	VisitPatientEntity,
	VisitDoctorEntity,
	VisitDashboardEntity,
	VisitAppointmentEntity,
	VisitLoadedTreatmentPlan,
	VisitNoteFormExtended,
} from "../VisitViewProps";
import type { Dashboard } from "@dental/shared";

export type VisitModalPatientEntity = VisitPatientEntity;
export type VisitModalDoctorEntity = VisitDoctorEntity;
export type VisitModalAppointmentEntity = VisitAppointmentEntity;
export type VisitModalDashboardEntity = VisitDashboardEntity;

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
	readonly status?: string | undefined;
	readonly items?: readonly unknown[] | undefined;
	readonly [key: string]: unknown;
}

export interface VisitViewModalsProps {
	loadedTreatmentPlan?:
		| VisitModalTreatmentPlanEntity
		| VisitLoadedTreatmentPlan
		| null
		| undefined;
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
	selectedToothForMenu?:
		| { code: string; label?: string | undefined; state?: string | undefined }
		| string
		| number
		| null
		| undefined;
	isWarrantyModalOpen: boolean;
	setIsWarrantyModalOpen: (v: boolean) => void;
	isDoctorShiftModalOpen: boolean;
	setIsDoctorShiftModalOpen: (v: boolean) => void;
	isInformedConsentModalOpen: boolean;
	setIsInformedConsentModalOpen: (v: boolean) => void;
	isPrescriptionModalOpen?: boolean | undefined;
	setIsPrescriptionModalOpen?: ((v: boolean) => void) | undefined;
	activePatient?: VisitPatientEntity | null | undefined;
	activeDoctor?: VisitDoctorEntity | null | undefined;
	dashboard?: VisitDashboardEntity | undefined;
	patientAge?: string | number | null | undefined;
	appendToEMKField: (field: string, text: string) => void;
	setToothState: (code: string, state: string) => void;
	visitNoteForm?:
		| VisitModalNoteFormEntity
		| VisitNoteFormExtended
		| Record<string, unknown>
		| null
		| undefined;
	activeAppointment?: VisitAppointmentEntity | null | undefined;
}
