import type { DocumentKind, GeneratedDocument, Patient } from "@dental/shared";
export { SURGICAL_STATUTORY_ITEMS } from "./constants";

export interface SurgicalPackageModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient: Patient | null;
	readonly doctorFullName?: string | null;
	readonly existingDocuments: GeneratedDocument[];
	readonly onCreateDocument: (kind: DocumentKind) => void;
	readonly onOpenDocument: (documentId: string) => void;
	readonly onSelectDocumentKind: (kind: DocumentKind) => void;
	// biome-ignore lint/suspicious/noExplicitAny: clinic profile settings draft
	readonly clinicProfileDraft?: any;
}

export interface SurgicalItem {
	kind: DocumentKind;
	title: string;
	statutoryRef: string;
	description: string;
	required: boolean;
}

/** Реквизиты клиники для печатных форм хирургического пакета (честные данные профиля клиники). */
export interface SurgicalClinicRequisites {
	readonly clinicName?: string | null;
	readonly legalName?: string | null;
	readonly fullName?: string | null;
	readonly shortName?: string | null;
	readonly inn?: string | null;
	readonly ogrn?: string | null;
	readonly licenseNumber?: string | null;
	readonly address?: string | null;
	readonly actualAddress?: string | null;
	readonly phone?: string | null;
}

/** Реквизиты пациента для печатных форм хирургического пакета. */
export interface SurgicalPatientRequisites {
	readonly fullName?: string | null;
	readonly birthDate?: string | null;
	readonly phone?: string | null;
	readonly snils?: string | null;
	readonly registrationAddress?: string | null;
	readonly address?: string | null;
	readonly passportSeries?: string | null;
	readonly passportNumber?: string | null;
	readonly passportIssuedBy?: string | null;
	readonly passportIssuedDate?: string | null;
	readonly passportDepartmentCode?: string | null;
	readonly passport?: string | null;
	readonly gender?: string | null;
}

/** Параметры операции: зуб, тип вмешательства, анестетик. */
export interface SurgicalOperationDetails {
	readonly toothNumber?: string | number | null;
	readonly operationType?: string | null;
	readonly anestheticName?: string | null;
}

/** Вход печатного движка хирургического пакета. */
export interface SurgicalPackagePrintOptions {
	readonly patient: SurgicalPatientRequisites | null;
	readonly clinic: SurgicalClinicRequisites | null;
	readonly doctorFullName?: string | null;
	readonly operationDetails?: SurgicalOperationDetails | null;
}

/** Подготовленный контекст реквизитов (все строки экранированы и подставлены). */
export interface SurgicalRequisitesContext {
	readonly todayFormatted: string;
	readonly clinicName: string;
	readonly clinicAddress: string;
	readonly clinicInn: string;
	readonly clinicOgrn: string;
	readonly clinicLicense: string;
	readonly clinicPhone: string;
	readonly ptName: string;
	readonly ptBirthDate: string;
	readonly ptPhone: string;
	readonly ptAddress: string;
	readonly ptPassport: string;
	readonly docDoctorName: string;
	readonly opTooth: string;
	readonly opType: string;
	readonly anesName: string;
}
