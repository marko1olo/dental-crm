/**
 * dentalLabFinancialGateEngine.ts — Финансовый контроль наряд-заказов в ЗТЛ.
 * Mandate 8e: врач сам решает, примерять ли коронку, кнопка никогда не блокируется.
 * Mandate 8b: строго <= 120 строк.
 */

import { formatKopecksRu, percentageOfKopecks } from "@dental/shared";
import type {
	DentalLabFinancialGateParams,
	DentalLabFinancialGateResult,
	DentalLabGateStatus,
} from "./financialGateModules/dentalLabFinancialGateTypes";

export * from "./financialGateModules/dentalLabFinancialGateOverrides";
export * from "./financialGateModules/dentalLabFinancialGateTypes";

export function checkDentalLabFinancialGate(
	params: DentalLabFinancialGateParams,
): DentalLabFinancialGateResult {
	const minAdvancePercent = params.minAdvancePercent ?? 50;
	const stageTotal = Math.max(0, params.stageTotalKopecks ?? 0);
	const directPaid = Math.max(0, params.paidKopecks ?? 0);
	const deposit = Math.max(0, params.availableDepositKopecks ?? 0);
	const totalCovered = directPaid + deposit;

	const baseAmount =
		stageTotal > 0 ? stageTotal : (params.labOrderPriceKopecks ?? 0);
	const requiredAdvance = percentageOfKopecks(
		baseAmount,
		minAdvancePercent * 100,
	);
	const missingAdvance = Math.max(0, requiredAdvance - totalCovered);
	const missingRub = Math.ceil(missingAdvance / 100);
	const paidPercent =
		baseAmount > 0
			? Math.min(100, Math.round((totalCovered / baseAmount) * 100))
			: 100;

	const activeOverride = params.doctorOverride?.authorized
		? params.doctorOverride
		: params.chiefDoctorOverride?.authorized
			? params.chiefDoctorOverride
			: undefined;
	const isOverrideActive = Boolean(activeOverride?.authorized);

	const isPlanOver30Days =
		(params.treatmentPlanAgeDays !== undefined &&
			params.treatmentPlanAgeDays > 30) ||
		params.isPlanExpired === true;
	const planExpiredNotice = isPlanOver30Days
		? "План составлен более 30 дней назад, цены могут быть скорректированы: срок плана НЕ БЛОКИРУЕТ (не блокирует) создание наряда ЗТЛ, услуги и оплату."
		: undefined;

	const isUrgent = Boolean(params.isUrgentTemporary);
	let gateStatus: DentalLabGateStatus = "CLEARED";
	let isGatePassed = true;

	if (isUrgent || totalCovered >= requiredAdvance || baseAmount === 0) {
		gateStatus = "CLEARED";
		isGatePassed = true;
	} else if (isOverrideActive) {
		gateStatus = params.doctorOverride?.authorized
			? "DOCTOR_OVERRIDE"
			: "CHIEF_DOCTOR_OVERRIDE";
		isGatePassed = true;
	} else {
		gateStatus = "BLOCKED_REQUIRES_ADVANCE";
		isGatePassed = false;
	}

	const missingStr = formatKopecksRu(missingAdvance);
	const reqStr = formatKopecksRu(requiredAdvance);
	const warningMessageRu =
		gateStatus === "BLOCKED_REQUIRES_ADVANCE"
			? `Рекомендуется аванс ${minAdvancePercent}%. Внесено ${paidPercent}%. Недостающий аванс: ${missingStr}. Лечащий врач вправе отправить наряд в ЗТЛ под личную ответственность.`
			: "Финансовый контроль пройден: аванс за этап внесен.";
	const detailedReasonRu =
		gateStatus === "BLOCKED_REQUIRES_ADVANCE"
			? `По этапу внесено ${paidPercent}% (${formatKopecksRu(totalCovered)}) из рекомендуемых ${minAdvancePercent}% (${reqStr}). Врач вправе согласовать наряд без блокировок.`
			: `Внесено ${paidPercent}% (${formatKopecksRu(totalCovered)}), покрывает ${reqStr}.`;

	return {
		isGatePassed,
		gateStatus,
		minAdvancePercent,
		stageTotalKopecks: baseAmount,
		totalPaidAndCoveredKopecks: totalCovered,
		requiredAdvanceKopecks: requiredAdvance,
		missingAdvanceKopecks: missingAdvance,
		missingAdvanceRub: missingRub,
		paidPercent,
		warningMessageRu,
		detailedReasonRu,
		chiefDoctorOverrideAuthorized: isOverrideActive,
		isPlanExpiredNotice: planExpiredNotice,
		canSendInOneClick: true,
		isSoftWarning: gateStatus === "BLOCKED_REQUIRES_ADVANCE",
		...(isUrgent ? { isUrgentBypassed: true } : {}),
		...(isOverrideActive && activeOverride
			? {
					overrideMeta: {
						doctorName: activeOverride.doctorName,
						timestampIso: activeOverride.timestampIso,
						reason: activeOverride.reason,
					},
				}
			: {}),
	};
}
