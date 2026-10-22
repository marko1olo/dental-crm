/**
 * DENTE Dental CRM — Doctor & Staff Piece-Rate Payroll Calculation Engine Facade
 * Mandate 8b: File strictly <= 120 lines.
 */

export type {
	StaffRole,
	DoctorSpecialtyId,
	AssistantCategoryId,
	DoctorSpecialtyConfig,
	SoloDoctorSpecialtyPreset,
	AssistantRatesConfig,
	AdministratorRatesConfig,
	StaffDoctorCompletedServiceItem,
	DoctorStaffPayrollInput,
	DoctorStaffPayrollResult,
} from "./engine/staffPayrollRoleTypes";

export type {
	AssistantShiftItem,
	AssistantShiftLogItem,
	AssistantStaffPayrollInput,
	AssistantStaffPayrollResult,
	AdministratorStaffPayrollInput,
	AdministratorStaffPayrollResult,
	StaffPayrollRecord,
	RoleSummary,
	ConsolidatedStaffPayrollSummary,
	ConsolidatedPayrollCalculationParams,
} from "./engine/staffPayrollAssistantAdminTypes";

export {
	DOCTOR_SPECIALTY_CONFIGS,
	SOLO_DOCTOR_SPECIALTY_PRESETS,
	DEFAULT_SOLO_DOCTOR,
	DEFAULT_ASSISTANT_RATES,
	DEFAULT_ADMINISTRATOR_RATES,
} from "./engine/doctorPresets";

export { calculateDoctorStaffPayroll } from "./engine/doctorStaffCalculation";
export { calculateAssistantStaffPayroll } from "./engine/assistantStaffCalculation";
export { calculateAdministratorStaffPayroll } from "./engine/administratorStaffCalculation";
export {
	calculateConsolidatedStaffPayroll,
	validateStaffPayrollInput,
} from "./engine/consolidatedCalculation";

export {
	DOCTOR_SPECIALTY_PAYROLL_PRESETS,
	type DoctorSpecialtyCommissionRule,
	type AssistantShiftRateRule,
	ASSISTANT_SHIFT_RULE,
	type KpiBonusTier,
	KPI_BONUS_TIERS,
	CLINICAL_CATEGORY_COMMISSION_PERCENT,
	DEFAULT_CATEGORY_COMMISSION_PERCENT,
	type DoctorCompletedServiceItem,
	type DoctorPayrollStornoLineItem,
	type DoctorRefundDeductionItem,
	type DoctorPayrollCalculationInput,
	type DoctorPayrollResult,
	type AssistantPayrollResult,
	calculateDoctorPeriodPayroll,
	calculateAssistantPeriodPayroll,
	splitVisitServicesByDoctor,
	filterServicesForDoctor,
	resolveDoctorPreset,
} from "@dental/shared/payroll";

export {
	escapeXml,
	generateDoctorPayrollCsv,
	generateStaffPayrollCsv,
	generateStaffPayrollT51Csv,
	generatePayrollT51Csv,
	generateDoctorPayslipHtml,
	generateDoctorPayslipMessengerText,
	generateStaffPayrollXml,
	generate1CZup31Xml,
	generateStaffPayrollAccountingCsv,
	generate1CZup31Csv,
	generateStaffPayrollLedgerHtml,
	generateFormT51Html,
} from "./staffPayrollExports";

import type { StaffPayrollRecord, ConsolidatedStaffPayrollSummary } from "./engine/staffPayrollAssistantAdminTypes";
import { calculateConsolidatedStaffPayroll } from "./engine/consolidatedCalculation";
import { generateStaffPayrollXml } from "./exports/staffPayrollXmlExporter";
import { generateStaffPayrollCsv } from "./exports/payrollCsvExporter";

// Canonical Aliases & Interop
export type AnyStaffPayrollResult = StaffPayrollRecord;
export type UnifiedStaffPayrollLedger = ConsolidatedStaffPayrollSummary;
export const calculateUnifiedStaffPayrollLedger = calculateConsolidatedStaffPayroll;
export const exportStaffPayrollToXml = generateStaffPayrollXml;
export const exportStaffPayrollTo1CZupXml = generateStaffPayrollXml;
export const exportStaffPayrollToCsv = generateStaffPayrollCsv;
