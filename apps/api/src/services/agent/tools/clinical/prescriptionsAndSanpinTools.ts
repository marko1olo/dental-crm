/**
 * @file prescriptionsAndSanpinTools.ts
 * @description Layer 2 Facade: Re-exports statutory prescription tools and clinical drug safety tools.
 * Mandate 8b / 8zi: Decomposed into drugSafetyAudit.ts and prescriptionGenerator.ts.
 */

export {
	performClinicalDrugSafetyAudit,
	checkDrugInteractionSchema,
	checkDrugInteractionTool,
	checkDrugInteractionsLegacySchema,
	checkDrugInteractionsTool,
} from "./drugSafetyAudit.js";

export {
	createPrescription107Schema,
	createPrescription107Tool,
	createPrescriptionTool,
} from "./prescriptionGenerator.js";
