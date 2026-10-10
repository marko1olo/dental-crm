import type { ToolRegistry } from "../tools/registry.js";
import {
    calculateAnestheticDosageTool,
    calculateAnestheticDosageSchema,
    type CalculateAnestheticDosageInput,
    type CalculateAnestheticDosageResult,
} from "../tools/anestheticDosageTool.js";
import {
    generateInformedConsentIdsTool,
    generateInformedConsentIdsSchema,
    type GenerateInformedConsentIdsInput,
    type GenerateInformedConsentIdsResult,
} from "../tools/informedConsentTool.js";
import {
    checkWarehouseSuppliesTool,
    checkWarehouseSuppliesSchema,
    type CheckWarehouseSuppliesInput,
    type CheckWarehouseSuppliesResult,
    type CriticalSupplyItem,
} from "../tools/warehouseSuppliesTool.js";
import {
    getDailyScheduleIntelligenceTool,
    getDoctorShiftsAndChairsTool,
} from "../tools/crmOperationalScheduleTools.js";
import {
    getClinicOrDoctorRevenueTool,
    getPatientFamilyDepositAndDebtTool,
} from "../tools/crmFinancialIntelligenceTools.js";

export * from "./types.js";
export * from "./clinicalAgentTools.js";
export * from "./crmAgentTools.js";
export * from "./financeAgentTools.js";

export {
    calculateAnestheticDosageTool,
    calculateAnestheticDosageSchema,
    type CalculateAnestheticDosageInput,
    type CalculateAnestheticDosageResult,
    generateInformedConsentIdsTool,
    generateInformedConsentIdsSchema,
    type GenerateInformedConsentIdsInput,
    type GenerateInformedConsentIdsResult,
    checkWarehouseSuppliesTool,
    checkWarehouseSuppliesSchema,
    type CheckWarehouseSuppliesInput,
    type CheckWarehouseSuppliesResult,
    type CriticalSupplyItem,
    getDailyScheduleIntelligenceTool,
    getDoctorShiftsAndChairsTool,
    getClinicOrDoctorRevenueTool,
    getPatientFamilyDepositAndDebtTool,
};

import { getPatientEmk043uTool, updateToothStatusTool, checkDrugInteractionsTool, createDentalLabOrderTool, draft043uSoapDiaryTool } from "./clinicalAgentTools.js";
import { bookChairsideAppointmentTool } from "./crmAgentTools.js";
import { calculate804nEstimateTool } from "./financeAgentTools.js";

export const DENTE_AGENT_TOOLS = {
    get_patient_emk_043u: getPatientEmk043uTool,
    update_tooth_status: updateToothStatusTool,
    calculate_804n_estimate: calculate804nEstimateTool,
    check_drug_interactions: checkDrugInteractionsTool,
    create_dental_lab_order: createDentalLabOrderTool,
    book_chairside_appointment: bookChairsideAppointmentTool,
    draft_043u_soap_diary: draft043uSoapDiaryTool,
    calculate_anesthetic_dosage: calculateAnestheticDosageTool,
    generate_informed_consent_ids: generateInformedConsentIdsTool,
    check_warehouse_supplies: checkWarehouseSuppliesTool,
    get_daily_schedule_intelligence: getDailyScheduleIntelligenceTool,
    get_doctor_shifts_and_chairs: getDoctorShiftsAndChairsTool,
    get_clinic_or_doctor_revenue: getClinicOrDoctorRevenueTool,
    get_patient_family_deposit_and_debt: getPatientFamilyDepositAndDebtTool,
};

export function registerDenteAgentTools(
    registry: ToolRegistry,
    moduleName = "dente_agent",
): void {
    for (const tool of Object.values(DENTE_AGENT_TOOLS)) {
        registry.register(tool, moduleName);
    }
}
