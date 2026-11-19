/**
 * apps/web/src/components/documents/types.ts
 */
import type { Patient, TaxDeductionRelationship } from "@dental/shared";
import type { DocumentPackageKey, DocumentServiceItem, PatientRequisites } from "../consents/consentCatalogData";

export type DocumentTemplateKey = DocumentPackageKey | "contract" | "act" | "consent" | "tax_deduction";
export type TaxDeductionTab = "form" | "checks" | "family" | "xml" | "registry";

export const NO_PATIENT_SELECTED_PLACEHOLDER =
	"[Бланк для ручного заполнения — Пациент: ____________________________________]";

export interface DocumentsStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientContext?: {
		readonly id?: string | undefined;
		readonly fullName?: string | undefined;
		readonly birthDate?: string | undefined;
		readonly passport?: string | undefined;
		readonly phone?: string | undefined;
		readonly address?: string | undefined;
		readonly inn?: string | undefined;
		readonly [key: string]: unknown;
	} | undefined;
	readonly patient?: {
		readonly id?: string | null | undefined;
		readonly fullName?: string | null | undefined;
		readonly birthDate?: string | null | undefined;
		readonly passport?: string | null | undefined;
		readonly phone?: string | null | undefined;
		readonly address?: string | null | undefined;
		readonly inn?: string | null | undefined;
		readonly snils?: string | null | undefined;
		readonly [key: string]: unknown;
	} | Patient | null | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientBirthDate?: string | undefined;
	readonly patientInn?: string | undefined;
	readonly patientSnils?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly isMinorPatient?: boolean | undefined;
	readonly initialTemplate?: DocumentTemplateKey | undefined;
	readonly initialDocId?: string | undefined;
	readonly initialTab?: string | undefined;
	readonly selectedYear?: number | undefined;
	readonly initialYear?: number | undefined;
	readonly payments?: readonly unknown[] | undefined;
	readonly allPayments?: readonly unknown[] | undefined;
	readonly clinicProfileDraft?: {
		readonly clinicName?: string | undefined;
		readonly legalName?: string | undefined;
		readonly inn?: string | undefined;
		readonly kpp?: string | undefined;
		readonly ogrn?: string | undefined;
		readonly address?: string | undefined;
		readonly phone?: string | undefined;
		readonly medicalLicenseNumber?: string | undefined;
		readonly directorFullName?: string | undefined;
		readonly [key: string]: unknown;
	} | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicKpp?: string | undefined;
	readonly clinicOgrn?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly clinicLicenseNumber?: string | undefined;
	readonly clinicLicenseDate?: string | undefined;
	readonly services?: readonly DocumentServiceItem[] | undefined;
	readonly diagnosisRu?: string | undefined;
	readonly anamnesisRu?: string | undefined;
	readonly epicrisisRu?: string | undefined;
	readonly taxpayer?: {
		readonly fullName?: string | undefined;
		readonly inn?: string | undefined;
		readonly birthDate?: string | undefined;
		readonly passport?: string | undefined;
		readonly relationship?: TaxDeductionRelationship | undefined;
	} | undefined;
	readonly payerFullName?: string | undefined;
	readonly payerInn?: string | undefined;
	readonly payerBirthDate?: string | undefined;
	readonly payerPassport?: string | undefined;
	readonly payerRelationship?: TaxDeductionRelationship | undefined;
	readonly onSigned?: ((payload: { packageKey: DocumentPackageKey; signedAt: string; isDigital: boolean }) => void) | undefined;
	readonly onDocumentSigned?: ((payload: unknown) => void) | undefined;
	readonly onConsentSigned?: ((payload: unknown) => void) | undefined;
	readonly [key: string]: unknown;
}
