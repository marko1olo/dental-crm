/**
 * @file calculatorRegistry.ts
 * @description Реестр и карта клинических калькуляторов и протокольных инструментов DENTE AI.
 */
import { calculateAnesthesiaSchema, calculateAnesthesiaTool } from "./anesthesiaTool.js";
import { chiefComplaintTranslatorTool, translatePatientComplaintSchema, translatePatientComplaintTool } from "./chiefComplaintTranslatorTool.js";
import { clinicalMaterialsTool, compareDentalMaterialsSchema, compareDentalMaterialsTool } from "./clinicalMaterialsTool.js";
import {
	clinicalProtocolTool,
	generateClinicalProtocolEntryTool,
	generateClinicalProtocolSchema,
	generateClinicalProtocolTool,
	generateForm043Schema,
	generateForm043Tool,
} from "./clinicalProtocolTool.js";
import { consiliumTool, multidisciplinaryConciliumSchema, multidisciplinaryConciliumTool } from "./consiliumTool.js";
import { chairsideEmergencySchema, chairsideEmergencyTool, emergencyProtocolsTool } from "./emergencyProtocolsTool.js";
import { checkSomaticRisksSchema, checkSomaticRisksTool, somaticScreeningTool } from "./somaticScreeningTool.js";

export const clinicalCalculatorTools = [
	calculateAnesthesiaTool,
	checkSomaticRisksTool,
	generateClinicalProtocolEntryTool,
	generateClinicalProtocolTool,
	generateForm043Tool,
	multidisciplinaryConciliumTool,
	chairsideEmergencyTool,
	translatePatientComplaintTool,
	compareDentalMaterialsTool,
] as const;

export const clinicalCalculatorSchemas = {
	calculate_anesthesia: calculateAnesthesiaSchema,
	check_somatic_risks: checkSomaticRisksSchema,
	check_somatic_risks_and_contraindications: checkSomaticRisksSchema,
	generate_clinical_protocol_entry: generateClinicalProtocolSchema,
	generate_form_043_entry: generateForm043Schema,
	generate_clinical_protocol: generateClinicalProtocolSchema,
	multidisciplinary_concilium: multidisciplinaryConciliumSchema,
	chairside_emergency_rescue: chairsideEmergencySchema,
	translate_patient_complaint: translatePatientComplaintSchema,
	compare_dental_materials: compareDentalMaterialsSchema,
} as const;

export const clinicalCalculatorToolsMap = {
	calculate_anesthesia: calculateAnesthesiaTool,
	check_somatic_risks: checkSomaticRisksTool,
	check_somatic_risks_and_contraindications: checkSomaticRisksTool,
	generate_clinical_protocol_entry: generateClinicalProtocolEntryTool,
	generate_form_043_entry: generateForm043Tool,
	generate_clinical_protocol: generateClinicalProtocolTool,
	multidisciplinary_concilium: multidisciplinaryConciliumTool,
	chairside_emergency_rescue: chairsideEmergencyTool,
	translate_patient_complaint: translatePatientComplaintTool,
	compare_dental_materials: compareDentalMaterialsTool,
} as const;

export function isClinicalCalculatorTool(name: string): name is keyof typeof clinicalCalculatorToolsMap {
	return Object.prototype.hasOwnProperty.call(clinicalCalculatorToolsMap, name);
}
