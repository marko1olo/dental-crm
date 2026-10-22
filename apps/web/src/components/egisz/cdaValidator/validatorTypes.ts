/**
 * validatorTypes.ts — Interfaces and canonicalizer for EGISZ SEMD CDA Validator
 */

import { canonicalizeCdaXml as sharedCanonicalizeCdaXml } from "@dental/shared/cda";
import type { EgiszSemdDocTypeCode } from "./validatorDocTypes";

export {
	EGISZ_SEMD_DOC_TYPES,
	type EgiszSemdDocTypeCode,
	EGISZ_STANDARD_OIDS,
} from "./validatorDocTypes";

export interface CdaExportData {
	docTypeCode: EgiszSemdDocTypeCode;
	visitId?: string | undefined;
	documentId?: string | undefined;
	patientId: string;
	patientFullName?: string | undefined;
	patientSnils?: string | undefined;
	patientBirthDate?: string | undefined;
	patientGender?: "male" | "female" | "other" | string | undefined;
	patientPolisOms?: string | undefined;
	patientAddress?: string | undefined;
	patientPhone?: string | undefined;
	patientEmail?: string | undefined;
	clinicName: string;
	clinicOid?: string | undefined;
	clinicOgrn?: string | undefined;
	clinicInn?: string | undefined;
	clinicAddress?: string | undefined;
	clinicPhone?: string | undefined;
	clinicEmail?: string | undefined;
	doctorFullName: string;
	doctorSnils?: string | undefined;
	doctorPosition?: string | undefined;
	doctorPositionCode?: string | undefined;
	doctorPhone?: string | undefined;
	doctorEmail?: string | undefined;
	icd10Code?: string | undefined;
	diagnosisText?: string | undefined;
	diagnosisTooth?: string | undefined;
	anamnesis?: string | undefined;
	objectiveStatus?: string | undefined;
	treatmentDescription?: string | undefined;
	complications?: string | undefined;
	comorbidities?: string | undefined;
	instrumentTrayBarcode?: string | undefined;
	toothStates?: Record<number, string> | undefined;
	toothSurfaces?: Record<number, string[]> | undefined;
	procedures?: Array<{ code: string; name: string; tooth?: number | string }> | undefined;
	encounterDate?: Date | string | undefined;
	documentVersion?: number | undefined;
}

export interface SemanticValidationRuleResult {
	id: string;
	name: string;
	category: "header" | "mo" | "doctor" | "patient" | "clinical" | "signature";
	status: "passed" | "failed" | "warning";
	message: string;
	details?: string;
	xpathOrOid?: string;
}

export interface SemanticValidationReport {
	isValid: boolean;
	totalRules: number;
	passedCount: number;
	failedCount: number;
	warningCount: number;
	scorePercent: number;
	rules: SemanticValidationRuleResult[];
}

export function canonicalizeXml(xml: string): string {
	if (!xml || typeof xml !== "string") return "";
	return sharedCanonicalizeCdaXml(xml, { disallowEnvelopedSignature: false });
}
