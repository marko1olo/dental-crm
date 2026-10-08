/**
 * ============================================================================
 * WARRANTY PASSPORT STUDIO — LAYER 0: DOMAIN TYPES & PROPS
 * ============================================================================
 */

import type {
	WarrantyCategory,
	WarrantyCertificateData,
	WarrantyItem,
	WarrantyRemediationOrder,
} from "../warrantyEngine.js";

export type WarrantyTab = "editor" | "preview" | "schedule" | "conditions" | "remediation";

export interface CompletedTreatmentStage {
	readonly id?: string | undefined;
	readonly toothNumber?: string | undefined;
	readonly serviceTitle: string;
	readonly category?: WarrantyCategory | undefined;
	readonly materialName?: string | undefined;
	readonly manufacturer?: string | undefined;
	readonly serviceCode804n?: string | undefined;
	readonly labOrderNumber?: string | undefined;
	readonly price?: number | undefined;
	readonly completedAt?: string | undefined;
}

export interface WarrantyPassportModalProps {
	isOpen: boolean;
	onClose: () => void;
	patient?: {
		id?: string | undefined;
		fullName?: string | null | undefined;
		birthDate?: string | null | undefined;
		cardNumber?: string | null | undefined;
		phone?: string | null | undefined;
		snils?: string | null | undefined;
	} | null | undefined;
	doctorName?: string | null | undefined;
	doctorSpecialty?: string | null | undefined;
	clinicName?: string | null | undefined;
	clinicLegalName?: string | null | undefined;
	clinicLicenseNumber?: string | null | undefined;
	clinicAddress?: string | null | undefined;
	clinicPhone?: string | null | undefined;
	clinicWebsite?: string | null | undefined;
	initialCategory?: WarrantyCategory | undefined;
	initialTeeth?: string[] | undefined;
	initialDiagnosis?: string | undefined;
	completedStages?: CompletedTreatmentStage[] | undefined;
	onCertificateIssued?: ((certificate: WarrantyCertificateData) => void) | undefined;
	onAttachToForm043u?: ((payload: {
		certificateId: string;
		attachedAt: string;
		fullHtml: string;
		integrityHash: string;
		itemCount: number;
		adjustedWarrantyMonths: number;
	}) => void) | undefined;
	onRemediationCreated?: ((order: WarrantyRemediationOrder) => void) | undefined;
}
