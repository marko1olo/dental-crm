/**
 * packages/shared/src/finance/payrollModules/assistantPayrollEngine.ts
 * Calculates assistant shift pay, radiograph bonuses, and surgery assistance.
 * Mandate 8b: <= 120 lines.
 */

import type { AssistantPayrollResult, AssistantShiftLogItem, AssistantShiftRateRule } from "./payrollPresetTypes.js";
import { ASSISTANT_SHIFT_RULE } from "./payrollRules.js";

/**
 * Calculates assistant shift pay + piece rate bonuses
 */
export function calculateAssistantPeriodPayroll(
	assistantId: string,
	assistantName: string,
	periodLabel: string,
	shifts: readonly AssistantShiftLogItem[],
	rules: AssistantShiftRateRule = ASSISTANT_SHIFT_RULE,
): AssistantPayrollResult {
	let totalShifts = 0;
	let totalRadiographs = 0;
	let totalSurgeries = 0;
	let baseShiftPayout = 0;

	for (const shift of shifts) {
		totalShifts += 1;
		totalRadiographs += shift.radiographsTakenCount ?? 0;
		totalSurgeries += shift.surgeriesAssistedCount ?? 0;

		if (shift.shiftType === "standard_6h") {
			baseShiftPayout += rules.baseShiftRateKop;
		} else if (shift.shiftType === "full_12h") {
			baseShiftPayout += rules.baseShiftRateKop * 2;
		} else {
			baseShiftPayout += Math.round((shift.hoursWorked / 6) * rules.baseShiftRateKop);
		}
	}

	const radiographPayout = totalRadiographs * rules.radiographBonusKop;
	const surgeryPayout = totalSurgeries * rules.surgeryAssistanceBonusKop;
	const grossTotal = baseShiftPayout + radiographPayout + surgeryPayout;
	// Округление НДФЛ 13% строго до целых рублей (п. 6 ст. 225 НК РФ)
	const ndfl13 = Math.round((grossTotal * 13) / 10000) * 100;
	const netToAssistant = Math.max(0, grossTotal - ndfl13);

	return {
		assistantId,
		assistantName,
		periodLabelRu: periodLabel,
		totalShifts,
		totalRadiographs,
		totalSurgeries,
		baseShiftPayoutKop: baseShiftPayout,
		radiographPayoutKop: radiographPayout,
		surgeryPayoutKop: surgeryPayout,
		totalGrossPayoutKop: grossTotal,
		ndfl13TaxKop: ndfl13,
		netPayoutToAssistantKop: netToAssistant,
	};
}
