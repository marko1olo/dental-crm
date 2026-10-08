/**
 * apps/api/src/services/agent/tools/clinical/index.ts
 * Layer 5: Canonical Barrel for Clinical Agent Tools
 */

import { searchPatientHistoryTool } from "../../rag/patientHistoryMemory.js";
import { autoFillCancellationGapTool } from "../cancellationTool.js";
import { generateInformedConsentTool } from "../consentTool.js";
import { calculateTreatmentEstimateTool } from "../estimateTool.js";
import { draftLabWorkOrderTool } from "../labOrderTool.js";
import type { ToolRegistry } from "../registry.js";
import {
	recordSterilizationTestTool,
	verifyKraftPackTool,
} from "../sanpinTools.js";
import { analyzeRadiographVisionTool } from "../visionTool.js";
import {
	generateVisitDiaryTool,
	suggestIcd10PlanTool,
} from "./odontogramTools.js";
import {
	findPatientTool,
	getEmrCardTool,
	getFamilyBalanceTool,
	getLabOrdersTool,
	getPatientTimelineTool,
} from "./patientRecordTools.js";
import {
	checkDrugInteractionsTool,
	checkDrugInteractionTool,
	createPrescription107Tool,
} from "./prescriptionsAndSanpinTools.js";
import {
	bookVisitTool,
	cancelAppointmentTool,
	createStaffTaskTool,
	getDoctorScheduleTool,
	getPatientRecallsTool,
	rescheduleAppointmentTool,
	scheduleRecallTool,
} from "./scheduleAndTaskTools.js";
import { suggestTreatmentPlanTool } from "./treatmentPlanTools.js";

export { registerSanpinTools } from "../sanpinTools.js";
export {
	generateVisitDiaryTool,
	suggestIcd10PlanTool,
} from "./odontogramTools.js";
// Re-export Layer 2 Tools
export {
	findPatientTool,
	getEmrCardTool,
	getFamilyBalanceTool,
	getLabOrdersTool,
	getPatientTimelineTool,
} from "./patientRecordTools.js";
export {
	checkDrugInteractionsTool,
	checkDrugInteractionTool,
	createPrescription107Tool,
	performClinicalDrugSafetyAudit,
} from "./prescriptionsAndSanpinTools.js";
export {
	bookVisitTool,
	cancelAppointmentTool,
	createStaffTaskTool,
	getDoctorScheduleTool,
	getPatientRecallsTool,
	rescheduleAppointmentTool,
	scheduleRecallTool,
} from "./scheduleAndTaskTools.js";
// Re-export Layer 1 Formatters
export {
	render043Text,
	renderPrescription107Text,
} from "./toolFormatters.js";
export { suggestTreatmentPlanTool } from "./treatmentPlanTools.js";
// Re-export Layer 0 Types
export type {
	DrugSafetyAuditParams,
	DrugSafetyAuditResult,
	TimelineEvent,
} from "./types.js";
// Re-export Satellite Tools & Registrars
export {
	analyzeRadiographVisionTool,
	autoFillCancellationGapTool,
	calculateTreatmentEstimateTool,
	draftLabWorkOrderTool,
	generateInformedConsentTool,
	recordSterilizationTestTool,
	searchPatientHistoryTool,
	verifyKraftPackTool,
};

/**
 * Registers all clinical, scheduling, staff task, and recall tools into the specified ToolRegistry.
 */
export function registerClinicalTools(
	registry: ToolRegistry,
	moduleName = "clinical",
): void {
	// 1. Exploration & Diagnostic Tools
	registry.register(findPatientTool, moduleName);
	registry.register(getEmrCardTool, moduleName);
	registry.register(suggestIcd10PlanTool, moduleName);
	registry.register(getPatientTimelineTool, moduleName);
	registry.register(checkDrugInteractionsTool, moduleName);
	registry.register(getLabOrdersTool, moduleName);
	registry.register(getFamilyBalanceTool, moduleName);

	// 2. Clinical Copilot Tools (Form 043/у Diary, Prescription 107-1/у, 3-Tier Plans, DDI Safety)
	registry.register(generateVisitDiaryTool, moduleName);
	registry.register(createPrescription107Tool, moduleName);
	registry.register(suggestTreatmentPlanTool, moduleName);
	registry.register(checkDrugInteractionTool, moduleName);

	// 3. Interactive Schedule Tools (READ & WRITE with confirmation)
	registry.register(bookVisitTool, moduleName);
	registry.register(rescheduleAppointmentTool, moduleName);
	registry.register(cancelAppointmentTool, moduleName);
	registry.register(getDoctorScheduleTool, moduleName);

	// 4. Staff Tasks & Preventive Recalls Tools
	registry.register(createStaffTaskTool, moduleName);
	registry.register(getPatientRecallsTool, moduleName);
	registry.register(scheduleRecallTool, moduleName);

	// 5. Vision AI & Radiograph Diagnostic Analysis
	registry.register(analyzeRadiographVisionTool, moduleName);

	// 6. Treatment Estimates & Dental Laboratory Tools
	registry.register(calculateTreatmentEstimateTool, moduleName);
	registry.register(draftLabWorkOrderTool, moduleName);

	// 7. Cancellation Gap Auto-Fill & Informed Consent Tools
	registry.register(autoFillCancellationGapTool, moduleName);
	registry.register(generateInformedConsentTool, moduleName);

	// 8. SanPiN 3.3686-21 Sterilization & Infection Control Tools
	registry.register(verifyKraftPackTool, moduleName);
	registry.register(recordSterilizationTestTool, moduleName);

	// 9. 5-Year Patient EHR Semantic Memory & RAG Search Tool
	registry.register(searchPatientHistoryTool, moduleName);
}
