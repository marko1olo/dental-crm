/**
 * crmUniversalTools.ts — Unified Registry of All 22 CRM Domain Tools for DENTE Copilot & Agent Engine.
 *
 * Implements Mandate 8l, Mandate 8e & Mandate 8n:
 *
 * 1. Patients:
 *    - search_patients
 *    - create_patient
 *    - get_patient_summary
 *
 * 2. Scheduling & Visits:
 *    - book_appointment
 *    - reschedule_appointment
 *    - cancel_appointment
 *    - get_doctor_schedule
 *
 * 3. Odontogram & Teeth:
 *    - update_teeth_chart
 *    - get_teeth_chart
 *
 * 4. Treatment Plans:
 *    - create_treatment_plan
 *    - add_treatment_stage
 *    - calculate_plan_cost
 *
 * 5. Billing & 54-FZ:
 *    - create_invoice
 *    - apply_discount
 *    - check_cashier_shift
 *
 * 6. Pharmacology & Safety:
 *    - check_drug_interactions
 *    - check_allergies
 *    - recommend_prescription
 *
 * 7. Warehouse & Materials:
 *    - check_stock_availability
 *    - log_material_usage
 *
 * 8. Dental Lab (ЗТЛ):
 *    - create_lab_order
 *    - get_lab_order_status
 */

import type { ToolRegistry } from "./registry.js";
import type { ToolDefinition } from "./tool.js";

import {
	bookAppointmentTool,
	cancelAppointmentTool,
	createPatientTool,
	getDoctorScheduleTool,
	getPatientSummaryTool,
	rescheduleAppointmentTool,
	searchPatientsTool,
} from "./crmPatientScheduleTools.js";

import {
	addTreatmentStageTool,
	calculatePlanCostTool,
	checkAllergiesTool,
	checkDrugInteractionsCrmTool,
	createTreatmentPlanTool,
	getTeethChartTool,
	recommendPrescriptionTool,
	updateTeethChartTool,
} from "./crmClinicalOdontogramTools.js";

import {
	applyDiscountTool,
	checkCashierShiftTool,
	checkStockAvailabilityTool,
	createInvoiceTool,
	createLabOrderTool,
	getLabOrderStatusTool,
	logMaterialUsageTool,
} from "./crmFinanceInventoryLabTools.js";

export const CRM_UNIVERSAL_TOOLS: Record<string, ToolDefinition<any, any>> = {
	// 1. Patients
	search_patients: searchPatientsTool,
	create_patient: createPatientTool,
	get_patient_summary: getPatientSummaryTool,

	// 2. Schedule
	book_appointment: bookAppointmentTool,
	reschedule_appointment: rescheduleAppointmentTool,
	cancel_appointment: cancelAppointmentTool,
	get_doctor_schedule: getDoctorScheduleTool,

	// 3. Teeth / Odontogram
	update_teeth_chart: updateTeethChartTool,
	get_teeth_chart: getTeethChartTool,

	// 4. Treatment Plans
	create_treatment_plan: createTreatmentPlanTool,
	add_treatment_stage: addTreatmentStageTool,
	calculate_plan_cost: calculatePlanCostTool,

	// 5. Billing & 54-FZ
	create_invoice: createInvoiceTool,
	apply_discount: applyDiscountTool,
	check_cashier_shift: checkCashierShiftTool,

	// 6. Pharmacology & Safety
	check_drug_interactions: checkDrugInteractionsCrmTool,
	check_allergies: checkAllergiesTool,
	recommend_prescription: recommendPrescriptionTool,

	// 7. Warehouse & Inventory
	check_stock_availability: checkStockAvailabilityTool,
	log_material_usage: logMaterialUsageTool,

	// 8. Dental Lab (ЗТЛ)
	create_lab_order: createLabOrderTool,
	get_lab_order_status: getLabOrderStatusTool,
};

/**
 * Registers all 22 Universal CRM tools into the specified ToolRegistry.
 * Supports both root names (e.g. `search_patients`) and qualified module names (e.g. `crm.search_patients`).
 */
export function registerCrmUniversalTools(
	registry: ToolRegistry,
	moduleName = "crm",
): void {
	for (const tool of Object.values(CRM_UNIVERSAL_TOOLS)) {
		registry.register(tool, moduleName);
	}
}

export * from "./crmPatientScheduleTools.js";
export * from "./crmClinicalOdontogramTools.js";
export * from "./crmFinanceInventoryLabTools.js";
