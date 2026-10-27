/**
 * @file calculatorRegistry.ts
 * @description Реестр и карта клинических калькуляторов и протокольных инструментов DENTE AI.
 */
import { calculateAnesthesiaSchema, calculateAnesthesiaTool } from "./anesthesiaTool.js";
import { chiefComplaintTranslatorTool, translatePatientComplaintSchema, translatePatientComplaintTool } from "./chiefComplaintTranslatorTool.js";
import { clinicalMaterialsTool, compareDentalMaterialsSchema, compareDentalMaterialsTool } from "./clinicalMaterialsTool.js";
import { clinicalProtocolTool, generateClinicalProtocolSchema, generateForm043Schema, generateForm043Tool } from "./clinicalProtocolTool.js";
import { consiliumTool, multidisciplinaryConciliumSchema, multidisciplinaryConciliumTool } from "./consiliumTool.js";
import { chairsideEmergencySchema, chairsideEmergencyTool, emergencyProtocolsTool } from "./emergencyProtocolsTool.js";
import { checkSomaticRisksSchema, checkSomaticRisksTool, somaticScreeningTool } from "./somaticScreeningTool.js";

export const clinicalCalculatorTools = [
	calculateAnesthesiaTool,
	checkSomaticRisksTool,
	generateForm043Tool,
	multidisciplinaryConciliumTool,
	chairsideEmergencyTool,
	translatePatientComplaintTool,
	compareDentalMaterialsTool,
] as const;

export const clinicalCalculatorSchemas = {
	calculate_anesthesia: calculateAnesthesiaSchema,
	check_somatic_risks_and_contraindications: checkSomaticRisksSchema,
	generate_form_043_entry: generateForm043Schema,
	multidisciplinary_concilium: multidisciplinaryConciliumSchema,
	chairside_emergency_rescue: chairsideEmergencySchema,
	translate_patient_complaint: translatePatientComplaintSchema,
	compare_dental_materials: compareDentalMaterialsSchema,
} as const;

export const clinicalCalculatorToolsMap = {
	calculate_anesthesia: calculateAnesthesiaTool,
	check_somatic_risks_and_contraindications: checkSomaticRisksTool,
	generate_form_043_entry: generateForm043Tool,
	multidisciplinary_concilium: multidisciplinaryConciliumTool,
	chairside_emergency_rescue: chairsideEmergencyTool,
	translate_patient_complaint: translatePatientComplaintTool,
	compare_dental_materials: compareDentalMaterialsTool,
} as const;

export function isClinicalCalculatorTool(name: string): name is keyof typeof clinicalCalculatorToolsMap {
	return Object.prototype.hasOwnProperty.call(clinicalCalculatorToolsMap, name);
}
