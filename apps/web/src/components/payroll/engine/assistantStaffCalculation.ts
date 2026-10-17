import type {
	AssistantStaffPayrollInput,
	AssistantStaffPayrollResult,
} from "./staffPayrollAssistantAdminTypes";
import { DEFAULT_ASSISTANT_RATES } from "./doctorPresets";

export function calculateAssistantStaffPayroll(
	input: AssistantStaffPayrollInput
): AssistantStaffPayrollResult {
	const rates = input.ratesConfig ?? DEFAULT_ASSISTANT_RATES;
	let totalShifts = 0;
	let totalHours = 0;
	let baseShiftsPayout = 0;
	let sterilizationShiftsCount = 0;
	let totalRadiographs = 0;
	let totalSurgeries = 0;

	for (const shift of input.shifts) {
		totalShifts += 1;
		const shiftHours = Number(shift.hoursWorked) || 0;
		totalHours += shiftHours;

		if (shift.isSterilizationShift) {
			sterilizationShiftsCount += 1;
		}
		if (shift.radiographsTakenCount) {
			totalRadiographs += Math.round(Number(shift.radiographsTakenCount) || 0);
		}
		if (shift.surgeriesAssistedCount) {
			totalSurgeries += Math.round(Number(shift.surgeriesAssistedCount) || 0);
		}

		if (shift.shiftType === "standard_6h") {
			baseShiftsPayout += Math.round(rates.baseShiftRate6hKop);
		} else if (shift.shiftType === "full_12h") {
			baseShiftsPayout += Math.round(rates.baseShiftRate12hKop);
		} else {
			baseShiftsPayout += Math.round((shiftHours / 6.0) * rates.baseShiftRate6hKop);
		}
	}

	const categoryBonusPercent = rates.categoryBonusPercentMap[input.category] ?? 0;
	const categoryBonusKop = Math.round((baseShiftsPayout * categoryBonusPercent) / 100);
	const sterilizationBonusKop = Math.round(sterilizationShiftsCount * rates.sterilizationShiftBonusKop);
	const radiographsPayoutKop = Math.round(totalRadiographs * rates.radiographBonusKop);
	const surgeriesPayoutKop = Math.round(totalSurgeries * rates.surgeryAssistanceBonusKop);
	const manualAdj = Math.round(Number(input.manualAdjustmentKop) || 0);
	const noteRu = input.manualAdjustmentNoteRu ?? "";

	const grossPayoutBeforeTaxKop = Math.max(
		0,
		baseShiftsPayout + categoryBonusKop + sterilizationBonusKop + radiographsPayoutKop + surgeriesPayoutKop + manualAdj
	);

	return {
		employeeId: input.employeeId,
		employeeTabNumber: input.employeeTabNumber,
		employeeFullName: input.employeeFullName,
		role: "assistant",
		positionRu: "Ассистент врача-стоматолога",
		departmentRu: "Сестринская служба / ЦСО",
		periodLabelRu: `${input.periodStartIso} — ${input.periodEndIso}`,
		category: input.category,
		categoryBonusPercent,
		totalShiftsCount: totalShifts,
		totalHoursWorked: totalHours,
		baseShiftsPayoutKop: baseShiftsPayout,
		categoryBonusKop,
		sterilizationShiftsCount,
		sterilizationBonusKop,
		totalRadiographsCount: totalRadiographs,
		radiographsPayoutKop,
		totalSurgeriesCount: totalSurgeries,
		surgeriesPayoutKop,
		manualAdjustmentKop: manualAdj,
		manualAdjustmentNoteRu: noteRu,
		grossPayoutBeforeTaxKop,
	};
}
