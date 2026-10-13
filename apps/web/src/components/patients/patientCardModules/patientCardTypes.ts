import type { Dashboard } from "@dental/shared";
import type { PatientGeneralInfo } from "../tabs/PatientGeneralInfoTab";
import type { PatientClinicalSafetyProfile } from "../safetyMath";
import type { ClinicalVisitItem } from "../PatientHistoryTab";

export type PatientCardActiveTab = "timeline" | "formula" | "anamnesis" | "documents";

export interface PatientLegalStatuses {
	contractStatus: "issued" | "draft" | "none";
	consentStatus: "issued" | "draft" | "none";
}

export interface PatientCardProps {
	patient?: PatientGeneralInfo | null | undefined;
	patientId?: string | null | undefined;
	safetyProfile?: PatientClinicalSafetyProfile | null | undefined;
	dashboard?: Dashboard | null | undefined;
	initialTab?: PatientCardActiveTab | undefined;
	visits?: ClinicalVisitItem[] | undefined;
	onNavigateToVisit?: ((visitId: string) => void) | undefined;
	onNewAppointment?: ((patientId?: string) => void) | undefined;
	onEditPatient?: (() => void) | undefined;
	onPrintCard043?: (() => void) | undefined;
	className?: string | undefined;
}

export const DEMO_PATIENT_CARD_DATA: PatientGeneralInfo = {
	id: "01a00000-0000-0000-0000-000000000001",
	fullName: "Ковалёв Роман Станиславович",
	phone: "+7 (916) 789-01-23",
	birthDate: "1988-04-14",
	cardNumber: "К-4821",
	gender: "male",
	notes: "Повышенная чувствительность шеек зубов. Регулярная профгигиена раз в 6 месяцев.",
	acquisitionSource: "Рекомендация знакомых / Сарафанное радио",
};
