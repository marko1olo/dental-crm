/**
 * UNIFIED FINANCE FACADE — Installment Schedule Engine (Mandate 8s)
 * Canonical logic lives in @dental/shared/finance/installmentScheduleEngine.ts
 */
export {
	type InstallmentMonthSchedule,
	type PatientDebtSummary,
	type ClinicalStagePaymentItem,
	generate0PercentInstallmentSchedule,
	createDefaultImplantStagesPreset,
	calculatePatientDebtSummary,
	generateDebtPaymentReminderMessage,
} from "@dental/shared";
