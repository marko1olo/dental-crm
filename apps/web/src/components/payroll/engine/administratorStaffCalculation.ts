import type {
	AdministratorStaffPayrollInput,
	AdministratorStaffPayrollResult,
} from "./staffPayrollAssistantAdminTypes";
import { DEFAULT_ADMINISTRATOR_RATES } from "./doctorPresets";

export function calculateAdministratorStaffPayroll(
	input: AdministratorStaffPayrollInput
): AdministratorStaffPayrollResult {
	const rates = input.ratesConfig ?? DEFAULT_ADMINISTRATOR_RATES;
	const shiftsWorked = Math.round(Number(input.shiftsWorked) || 0);
	const hoursWorked = input.hoursWorked !== undefined ? Number(input.hoursWorked) : (shiftsWorked * 12.0);

	const baseSalaryPayoutKop = Math.round(shiftsWorked * rates.baseShiftRateKop);
	const cashRevKop = Math.round(Number(input.clinicCashRevenueKop) || 0);
	const cashRevenueCommissionKop = Math.round((cashRevKop * rates.cashRevenueCommissionPercent) / 100);

	const primLeads = Math.round(Number(input.primaryLeadsCount) || 0);
	const convLeads = Math.round(Number(input.convertedLeadsCount) || 0);
	const conversionRatePercent = primLeads > 0 ? Number(((convLeads / primLeads) * 100).toFixed(1)) : 0;

	const leadConversionBonusKop =
		conversionRatePercent >= rates.leadConversionThresholdPercent && convLeads > 0
			? Math.round(rates.leadConversionBonusKop)
			: 0;

	const manualAdj = Math.round(Number(input.manualAdjustmentKop) || 0);
	const noteRu = input.manualAdjustmentNoteRu ?? "";

	const grossPayoutBeforeTaxKop = Math.max(
		0,
		baseSalaryPayoutKop + cashRevenueCommissionKop + leadConversionBonusKop + manualAdj
	);

	return {
		employeeId: input.employeeId,
		employeeTabNumber: input.employeeTabNumber,
		employeeFullName: input.employeeFullName,
		role: "administrator",
		positionRu: "Администратор клиники",
		departmentRu: "Ресепшен и клиентский сервис",
		periodLabelRu: `${input.periodStartIso} — ${input.periodEndIso}`,
		shiftsWorked,
		hoursWorked,
		baseSalaryPayoutKop,
		clinicCashRevenueKop: input.clinicCashRevenueKop,
		cashRevenueCommissionPercent: rates.cashRevenueCommissionPercent,
		cashRevenueCommissionKop,
		primaryLeadsCount: input.primaryLeadsCount,
		convertedLeadsCount: input.convertedLeadsCount,
		conversionRatePercent,
		conversionThresholdPercent: rates.leadConversionThresholdPercent,
		leadConversionBonusKop,
		manualAdjustmentKop: manualAdj,
		manualAdjustmentNoteRu: noteRu,
		grossPayoutBeforeTaxKop,
	};
}
