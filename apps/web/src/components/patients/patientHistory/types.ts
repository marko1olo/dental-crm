/**
 * apps/web/src/components/patients/patientHistory/types.ts
 *
 * DENTE Dental CRM — Типы данных и DTO для клинического таймлайна истории пациента.
 * Layer 0: Чистые интерфейсы и контракты без побочных эффектов (Мандат 8b <= 120 строк).
 */

import type { Appointment, Dashboard } from "@dental/shared";
import { DEFAULT_CLINICAL_VISITS } from "./defaultClinicalVisits";

export { DEFAULT_CLINICAL_VISITS };

export type ClinicalSpecialty =
	| "all"
	| "therapy"
	| "surgery"
	| "orthopedics"
	| "hygiene"
	| "orthodontics";

export interface SpecialtyFilterOption {
	id: ClinicalSpecialty;
	label: string;
}

export const SPECIALTY_FILTERS: SpecialtyFilterOption[] = [
	{ id: "all", label: "Все" },
	{ id: "therapy", label: "Терапия" },
	{ id: "surgery", label: "Хирургия & Имплантация" },
	{ id: "orthopedics", label: "Ортопедия" },
	{ id: "hygiene", label: "Профгигиена" },
	{ id: "orthodontics", label: "Ортодонтия" },
];

export interface ClinicalMaterialItem {
	name: string;
	quantity: number;
	unit: string;
}

export interface ClinicalAttachedScan {
	id?: string;
	title: string;
	previewUrl: string;
	kind: string;
	tooth?: string | null;
}

export interface ClinicalVisitItem {
	id: string;
	date: string; // ISO or DD.MM.YYYY
	time?: string | undefined;
	year: number;
	monthNumber: number;
	monthNameRu: string;
	toothNumber?: string | null | undefined;
	diagnosisCode: string;
	diagnosisTitle: string;
	doctorName: string;
	specialty: ClinicalSpecialty;
	specialtyLabelRu: string;
	amountRub: number;
	isPaid: boolean;
	paymentStatus: "paid" | "partial" | "scheduled" | "unpaid";
	warrantyUntil?: string | null | undefined;
	warrantyStatus?: "active" | "expired" | "not_applicable" | undefined;
	complaints?: string | undefined;
	anamnesis?: string | undefined;
	statusLocalis?: string | undefined;
	treatmentProtocol?: string | undefined;
	recommendations?: string | undefined;
	materialsDeducted?: ClinicalMaterialItem[] | undefined;
	attachedScan?: ClinicalAttachedScan | null | undefined;
	attachedScans?: ClinicalAttachedScan[] | undefined;
	isSigned?: boolean | undefined;
}

/** Алиас для соответствия спецификации таймлайна событий */
export type HistoryTimelineItem = ClinicalVisitItem;

export interface HistoryTimelineGroup {
	monthKey: string;
	monthNameRu: string;
	year: number;
	monthNumber: number;
	totalAmountRub: number;
	items: ClinicalVisitItem[];
}

export interface PatientHistoryFinancialSummaryData {
	totalBilledRub: number;
	totalPaidRub: number;
	totalPendingRub: number;
	visitsCount: number;
	warrantiesCount: number;
}

/** Корневой селектор вкладки: data-testid="patient-history-timeline-tab" */
export const PATIENT_HISTORY_TIMELINE_TAB_TEST_ID = "patient-history-timeline-tab";

export interface PatientHistoryTabProps {
	patientId?: string | null | undefined;
	patientName?: string | null | undefined;
	visits?: ClinicalVisitItem[] | undefined;
	dashboard?: Dashboard | null | undefined;
	onNavigateToVisit?: ((visitId: string) => void) | undefined;
	onNewAppointment?: ((patientId?: string) => void) | undefined;
	onPrintProtocol?: ((visit: ClinicalVisitItem) => void) | undefined;
	onExtract043?: ((visit: ClinicalVisitItem) => void) | undefined;
	onAddToTreatmentPlan?: ((visit: ClinicalVisitItem) => void) | undefined;
	className?: string | undefined;
}
