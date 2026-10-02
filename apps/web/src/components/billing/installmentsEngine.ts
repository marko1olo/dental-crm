/**
 * UNIFIED BILLING FACADE — Clinic Internal Installments Engine (Mandate 8s)
 * Canonical logic lives in @dental/shared/finance/installmentsEngine.ts
 */

export {
	type InstallmentPlanStatus,
	type InstallmentItemStatus,
	type InternalInstallmentScheduleItem,
	type ClinicInstallmentItem,
	type InstallmentPlan,
	type GenerateInstallmentScheduleInput,
	type RecordInstallmentPaymentInput,
	type FiscalReceipt54FzResult,
	type InstallmentReminderOutput,
	type TreatmentPresetType,
	type TreatmentPresetConfig,
	TREATMENT_INSTALLMENT_PRESETS,
	generateInstallmentSchedule,
	evaluateInstallmentStatus,
	recordInstallmentPayment,
	generateInstallmentReminder,
	createDefaultInternalInstallmentsPreset,
	generateInstallmentContractNumber,
} from "@dental/shared";
