import type { DocumentKind, GeneratedDocument, Patient } from "@dental/shared";
import type { ClinicProfileDraft } from "../../../utils/clinicProfileUtils";
export type { ClinicProfileDraft };
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
	readonly clinicProfileDraft?: ClinicProfileDraft | undefined;
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
	readonly clinicName?: string | null | undefined;
	readonly legalName?: string | null | undefined;
	readonly fullName?: string | null | undefined;
	readonly shortName?: string | null | undefined;
	readonly inn?: string | null | undefined;
	readonly ogrn?: string | null | undefined;
	readonly licenseNumber?: string | null | undefined;
	readonly address?: string | null | undefined;
	readonly actualAddress?: string | null | undefined;
	readonly phone?: string | null | undefined;
}

/** Реквизиты пациента для печатных форм хирургического пакета. */
export interface SurgicalPatientRequisites {
	readonly fullName?: string | null | undefined;
	readonly birthDate?: string | null | undefined;
	readonly phone?: string | null | undefined;
	readonly snils?: string | null | undefined;
	readonly registrationAddress?: string | null | undefined;
	readonly address?: string | null | undefined;
	readonly passportSeries?: string | null | undefined;
	readonly passportNumber?: string | null | undefined;
	readonly passportIssuedBy?: string | null | undefined;
	readonly passportIssuedDate?: string | null | undefined;
	readonly passportDepartmentCode?: string | null | undefined;
	readonly passport?: string | null | undefined;
	readonly gender?: string | null | undefined;
}

/** Параметры операции: зуб, тип вмешательства, анестетик. */
export interface SurgicalOperationDetails {
	readonly toothNumber?: string | number | null | undefined;
	readonly operationType?: string | null | undefined;
	readonly anestheticName?: string | null | undefined;
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
