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
	getDailyPatientsTool,
	getDoctorScheduleTool,
	getDoctorShiftsTool,
	getFamilyDepositBalanceTool,
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
	getToothHistoryTool,
	recommendPrescriptionTool,
	updateTeethChartTool,
} from "./crmClinicalOdontogramTools.js";

import {
	applyDiscountTool,
	checkCashierShiftTool,
	checkStockAvailabilityTool,
	createInvoiceTool,
	createLabOrderTool,
	getDoctorEarningsTool,
	getLabOrderStatusTool,
	logMaterialUsageTool,
} from "./crmFinanceInventoryLabTools.js";

import {
	getDailyScheduleIntelligenceTool,
	getDoctorShiftsAndChairsTool,
} from "./crmOperationalScheduleTools.js";

import {
	getClinicOrDoctorRevenueTool,
	getPatientFamilyDepositAndDebtTool,
} from "./crmFinancialIntelligenceTools.js";

export const CRM_UNIVERSAL_TOOLS: Record<string, ToolDefinition<any, any>> = {
	// 1. Patients & Family Deposits (Mandate 8ab)
	search_patients: searchPatientsTool,
	create_patient: createPatientTool,
	get_patient_summary: getPatientSummaryTool,
	get_family_deposit_balance: getFamilyDepositBalanceTool,
	get_patient_family_deposit_and_debt: getPatientFamilyDepositAndDebtTool,

	// 2. Schedule, Patients for the Day & Shifts (Mandate 8ab)
	book_appointment: bookAppointmentTool,
	reschedule_appointment: rescheduleAppointmentTool,
	cancel_appointment: cancelAppointmentTool,
	get_doctor_schedule: getDoctorScheduleTool,
	get_daily_patients: getDailyPatientsTool,
	get_doctor_shifts: getDoctorShiftsTool,
	get_daily_schedule_intelligence: getDailyScheduleIntelligenceTool,
	get_doctor_shifts_and_chairs: getDoctorShiftsAndChairsTool,

	// 3. Teeth / Odontogram & Tooth Clinical History (Mandate 8ab)
	update_teeth_chart: updateTeethChartTool,
	get_teeth_chart: getTeethChartTool,
	get_tooth_history: getToothHistoryTool,

	// 4. Treatment Plans
	create_treatment_plan: createTreatmentPlanTool,
	add_treatment_stage: addTreatmentStageTool,
	calculate_plan_cost: calculatePlanCostTool,

	// 5. Billing, 54-FZ & Doctor Earnings / Piecework (Mandate 8ab)
	create_invoice: createInvoiceTool,
	apply_discount: applyDiscountTool,
	check_cashier_shift: checkCashierShiftTool,
	get_doctor_earnings: getDoctorEarningsTool,
	get_clinic_or_doctor_revenue: getClinicOrDoctorRevenueTool,

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
 * Registers all Universal CRM tools into the specified ToolRegistry.
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
export * from "./crmOperationalScheduleTools.js";
export * from "./crmFinancialIntelligenceTools.js";
