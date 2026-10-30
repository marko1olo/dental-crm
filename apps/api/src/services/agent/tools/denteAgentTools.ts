/**
 * denteAgentTools.ts — Canonical Clinical AI Tool Registry Facade for DENTE Copilot.
 *
 * Mandate 8b: Thin facade (< 50 lines) re-exporting modular clinical tools.
 * Mandate 8x & 8ap: Clean clinical domain language (NO Soviet decree numbers).
 */

import type { ToolRegistry } from "./registry.js";
import { getPatientClinicalCardTool, getPatientOutpatientRecordTool } from "./clinical/patientClinicalCardTool.js";
import { updateToothStatusTool } from "./clinical/toothStatusTool.js";
import { calculateTreatmentEstimateTool, calculateServicesEstimateTool } from "./clinical/treatmentEstimateTool.js";
import { checkDrugInteractionsTool } from "./clinical/drugInteractionTool.js";
import { createDentalLabOrderTool, bookChairsideAppointmentTool } from "./clinical/chairsideBookingAndLabTools.js";
import { draftClinicalSoapDiaryTool, draftSoapDiaryTool } from "./clinical/clinicalSoapDiaryTool.js";
import { calculateAnestheticDosageTool } from "./anestheticDosageTool.js";
import { generateInformedConsentIdsTool } from "./informedConsentTool.js";
import { checkWarehouseSuppliesTool } from "./warehouseSuppliesTool.js";
import { getDailyScheduleIntelligenceTool, getDoctorShiftsAndChairsTool } from "./crmOperationalScheduleTools.js";
import { getClinicOrDoctorRevenueTool, getPatientFamilyDepositAndDebtTool } from "./crmFinancialIntelligenceTools.js";

export * from "./clinical/patientClinicalCardTool.js";
export * from "./clinical/toothStatusTool.js";
export * from "./clinical/treatmentEstimateTool.js";
export * from "./clinical/drugInteractionTool.js";
export * from "./clinical/clinicalSoapDiaryTool.js";
export * from "./clinical/chairsideBookingAndLabTools.js";
export * from "./anestheticDosageTool.js";
export * from "./informedConsentTool.js";
export * from "./warehouseSuppliesTool.js";
export * from "./crmOperationalScheduleTools.js";
export * from "./crmFinancialIntelligenceTools.js";

export const DENTE_AGENT_TOOLS = {
	get_patient_clinical_card: getPatientClinicalCardTool,
	get_patient_outpatient_record: getPatientOutpatientRecordTool,
	update_tooth_status: updateToothStatusTool,
	calculate_treatment_estimate: calculateTreatmentEstimateTool,
	calculate_services_estimate: calculateServicesEstimateTool,
	check_drug_interactions: checkDrugInteractionsTool,
	create_dental_lab_order: createDentalLabOrderTool,
	book_chairside_appointment: bookChairsideAppointmentTool,
	draft_clinical_soap_diary: draftClinicalSoapDiaryTool,
	draft_soap_diary: draftSoapDiaryTool,
	calculate_anesthetic_dosage: calculateAnestheticDosageTool,
	generate_informed_consent_ids: generateInformedConsentIdsTool,
	check_warehouse_supplies: checkWarehouseSuppliesTool,
	get_daily_schedule_intelligence: getDailyScheduleIntelligenceTool,
	get_doctor_shifts_and_chairs: getDoctorShiftsAndChairsTool,
	get_clinic_or_doctor_revenue: getClinicOrDoctorRevenueTool,
	get_patient_family_deposit_and_debt: getPatientFamilyDepositAndDebtTool,
};

export function registerDenteAgentTools(registry: ToolRegistry, moduleName = "dente_agent"): void {
	for (const tool of Object.values(DENTE_AGENT_TOOLS)) {
		registry.register(tool, moduleName);
	}
}
