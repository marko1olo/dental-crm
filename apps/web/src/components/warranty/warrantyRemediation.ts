/**
 * CLINICAL DENTAL WARRANTY ENGINE — 1-CLICK REMEDIATION ORDER (0 ₽)
 * Положение СтАР, Закон РФ № 2300-1 (ст. 29) и Мандат 8e (Свобода врача).
 * Mandate 8b: strict file length budget <= 120 lines.
 */

import {
	getWarrantyDefectTemplate,
	type WarrantyDefectType,
	type WarrantyRemediationMaterialItem,
} from "./warrantyPresets.js";
import type { WarrantyRemediationOrder } from "./warrantyRemediationTypes.js";
import { generateRemediationOrderNumber, generateSha256, generateUuidV7 } from "./warrantyIdUtils.js";

export function createWarrantyRemediationOrder(params: {
	certificateId: string;
	toothNumber: string;
	originalWorkTitle?: string | undefined;
	defectType: WarrantyDefectType;
	doctorName: string;
	doctorSpecialty?: string | undefined;
	patientFullName: string;
	patientCardNumber: string;
	clinicName?: string | undefined;
	customFinding?: string | undefined;
	customAction?: string | undefined;
	materials?: WarrantyRemediationMaterialItem[] | undefined;
	notes?: string | undefined;
}): WarrantyRemediationOrder {
	const template = getWarrantyDefectTemplate(params.defectType);
	const id = `remed_${generateUuidV7()}`;
	const year = new Date().getFullYear();
	const orderNumber = generateRemediationOrderNumber(year);
	const performedAtIso = new Date().toISOString();

	const clinicalFinding = params.customFinding?.trim() || template.clinicalDescription;
	const remediationAction = params.customAction?.trim() || template.recommendedAction;
	const materialsDeducted =
		params.materials && params.materials.length > 0 ? params.materials : template.defaultMaterials;

	const rawDataForHash = `${orderNumber}|${params.certificateId}|${params.toothNumber}|${params.defectType}|${remediationAction}|0|100|${performedAtIso}`;
	const integrityHash = generateSha256(rawDataForHash);

	return {
		id,
		orderNumber,
		certificateId: params.certificateId,
		toothNumber: params.toothNumber,
		originalWorkTitle: params.originalWorkTitle || "Ранее выполненная реставрация / конструкция",
		defectType: params.defectType,
		defectTitle: template.title,
		clinicalFinding,
		remediationAction,
		costToPatientRub: 0,
		discountPercent: 100,
		isFreeWarrantyService: true,
		requiresMasterPassword: false,
		warehouseDeductOnExecution: true,
		materialsDeducted,
		doctorName: params.doctorName,
		doctorSpecialty: params.doctorSpecialty,
		patientFullName: params.patientFullName,
		patientCardNumber: params.patientCardNumber,
		clinicName: params.clinicName || "ООО «Стоматологическая клиника ДЕНТЕ»",
		performedAtIso,
		status: "completed",
		doctorNotes: params.notes,
		integrityHash,
	};
}
