/**
 * consentContextTypes.ts
 * Clinical context interfaces, records state and props for VisitConsentsTab.
 */

export interface VisitConsentsTabPatient {
	id?: string | null | undefined;
	fullName?: string | null | undefined;
	name?: string | null | undefined;
	birthDate?: string | null | undefined;
	passport?: string | null | undefined;
	documentNumber?: string | null | undefined;
	phone?: string | null | undefined;
	snils?: string | null | undefined;
	address?: string | null | undefined;
	cardNumber?: string | null | undefined;
	medicalCardNumber?: string | null | undefined;
	cardOpenedAt?: string | null | undefined;
	allergies?: string | null | undefined;
	somaticNotes?: string | null | undefined;
}

export interface VisitConsentsTabDoctor {
	id?: string | null | undefined;
	fullName?: string | null | undefined;
	name?: string | null | undefined;
	specialty?: string | null | undefined;
	specialtyRu?: string | null | undefined;
}

export interface VisitConsentsTabAppointment {
	id?: string | null | undefined;
	status?: string | null | undefined;
	appointmentDate?: string | null | undefined;
}

export interface VisitConsentsTabNoteForm {
	diagnosis?: string | null | undefined;
	treatmentPlan?: string | null | undefined;
	complaint?: string | null | undefined;
	anamnesis?: string | null | undefined;
	objectiveStatus?: string | null | undefined;
	status?: string | null | undefined;
}

export interface VisitConsentsTabDashboard {
	clinicSettings?: {
		profile?: {
			brandName?: string | undefined;
			clinicName?: string | undefined;
			legalEntityName?: string | undefined;
			address?: string | null | undefined;
			ogrn?: string | null | undefined;
			medicalLicenseNumber?: string | null | undefined;
		} | undefined;
	} | undefined;
	organization?: {
		name?: string | undefined;
	} | undefined;
}

export interface VisitConsentsTabProps {
	readonly activePatient?: VisitConsentsTabPatient | null | undefined;
	readonly activeDoctor?: VisitConsentsTabDoctor | null | undefined;
	readonly activeAppointment?: VisitConsentsTabAppointment | null | undefined;
	readonly visitNoteForm?: VisitConsentsTabNoteForm | null | undefined;
	readonly dashboard?: VisitConsentsTabDashboard | null | undefined;
	readonly selectedToothForMenu?: { code: string; label?: string } | null | undefined;
	readonly onOpenInformedConsentModal?: () => void;
	readonly onOpenWarrantyModal?: () => void;
	readonly onFastPrint043u?: () => void;
	readonly onFastPrintInformedConsent?: () => void;
}

export type ConsentStatusType = "signed" | "required_today" | "not_signed";

export interface ConsentRecordState {
	isSigned: boolean;
	signedAt?: string;
	method?: "paper" | "tablet" | "otp";
	integrityHash?: string;
	doctorName?: string;
	notes?: string;
}
