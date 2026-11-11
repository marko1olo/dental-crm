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

export interface WarrantyPatientMeta {
	readonly id?: string | undefined;
	readonly fullName?: string | null | undefined;
	readonly birthDate?: string | null | undefined;
	readonly cardNumber?: string | null | undefined;
	readonly phone?: string | null | undefined;
	readonly snils?: string | null | undefined;
}

export interface AttachedWarrantyPayload {
	readonly certificateId: string;
	readonly attachedAt: string;
	readonly fullHtml: string;
	readonly integrityHash: string;
	readonly itemCount: number;
	readonly adjustedWarrantyMonths: number;
}

export interface HistoricalWarrantyCertificate {
	readonly id: string;
	readonly organizationId?: string | undefined;
	readonly patientId: string;
	readonly visitId?: string | null | undefined;
	readonly certificateNumber: string;
	readonly status: "active" | "conditional" | "voided" | string;
	readonly itemsJson?: unknown;
	readonly warrantyMonths: number;
	readonly serviceLifeMonths: number;
	readonly issuedAt: string;
	readonly expiresAt?: string | null | undefined;
	readonly nextRecallDate?: string | null | undefined;
	readonly integritySha256: string;
	readonly notes?: string | null | undefined;
	readonly createdAt?: string | undefined;
	readonly updatedAt?: string | null | undefined;
}

export interface PatientReclamationResponse {
	readonly id: string;
	readonly patientId?: string | undefined;
	readonly doctorId?: string | null | undefined;
	readonly doctorName?: string | null | undefined;
	readonly complicationDetails?: string | null | undefined;
	readonly proposedAction?: string | null | undefined;
	readonly status?: "under_review" | "resolved" | string | undefined;
	readonly resolvedAt?: string | null | undefined;
	readonly createdAt?: string | undefined;
	readonly resolutionNotes?: string | null | undefined;
}

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
	patient?: WarrantyPatientMeta | null | undefined;
	doctorName?: string | null | undefined;
	doctorId?: string | null | undefined;
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
	onAttachToForm043u?: ((payload: AttachedWarrantyPayload) => void) | undefined;
	onRemediationCreated?: ((order: WarrantyRemediationOrder) => void) | undefined;
}
