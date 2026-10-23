/**
 * CLINICAL DENTAL WARRANTY REMEDIATION & CERTIFICATE TYPES
 * Mandate 8b: strict file length budget <= 120 lines.
 */

import type {
	WarrantyDefectType,
	WarrantyRemediationMaterialItem,
} from "./warrantyPresets.js";
import type {
	WarrantyCalculationResult,
	WarrantyItem,
} from "./warrantyEngineTypes.js";

export interface WarrantyRemediationOrder {
	readonly id: string;
	readonly orderNumber: string; // e.g. "ГП-2026-1049"
	readonly certificateId: string;
	readonly toothNumber: string;
	readonly originalWorkTitle: string;
	readonly defectType: WarrantyDefectType;
	readonly defectTitle: string;
	readonly clinicalFinding: string;
	readonly remediationAction: string;
	readonly costToPatientRub: 0; // Strictly 0 ₽ (Mandate 8e)
	readonly discountPercent: 100;
	readonly isFreeWarrantyService: true;
	readonly requiresMasterPassword: false;
	readonly warehouseDeductOnExecution: true;
	readonly materialsDeducted: readonly WarrantyRemediationMaterialItem[];
	readonly doctorName: string;
	readonly doctorSpecialty?: string | undefined;
	readonly patientFullName: string;
	readonly patientCardNumber: string;
	readonly clinicName: string;
	readonly performedAtIso: string;
	readonly status: "completed" | "in_progress";
	readonly doctorNotes?: string | undefined;
	readonly integrityHash?: string | undefined;
}

export interface WarrantyCertificateData {
	certificateId: string;
	issueDate: string;
	patient: {
		fullName: string;
		birthDate?: string | undefined;
		cardNumber: string;
		phone?: string | undefined;
		snils?: string | undefined;
	};
	doctor: {
		fullName: string;
		specialty: string;
	};
	clinic: {
		name: string;
		legalName: string;
		licenseNumber: string;
		address: string;
		phone: string;
		website?: string | undefined;
	};
	items: WarrantyItem[];
	calculation: WarrantyCalculationResult;
	verificationUrl: string;
	qrCodeSvg: string;
	integrityHash: string;
	signedByDoctor: boolean;
	signedByChief: boolean;
	attachedToForm043u: boolean;
	remediations?: WarrantyRemediationOrder[] | undefined;
}
