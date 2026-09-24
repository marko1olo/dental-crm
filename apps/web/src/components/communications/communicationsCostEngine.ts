/**
 * communicationsCostEngine.ts
 *
 * Kopeck-Exact Arithmetic & SMS Segment Costing Engine for Omnichannel Communications.
 * Compliant with:
 * - Mandate 8b: Kopeck-exact money arithmetic, zero float drift, integer kopecks.
 * - Mandate 8s: Solo Doctor & Small Clinic Sovereignty (free WhatsApp/Telegram, exact SMS cost projections).
 * - Mandate 8i: CRM != Reality Simulator (real segment pricing, actual billable unit math).
 */

import {
	type Kopecks,
	formatKopecksRu,
	formatKopecksToRubles,
	parseKopecks,
} from "@dental/shared";

/**
 * Базовый тариф SMS за один сегмент по РФ (в целых копейках).
 * 250 копеек = 2 рубля 50 копеек.
 */
export const DEFAULT_SMS_SEGMENT_COST_KOPECKS: Kopecks = 250;

/**
 * Расчёт стоимости отправки SMS в целых копейках без float drift.
 *
 * @param segmentsPerMessage Количество сегментов в одном сообщении (>= 1)
 * @param recipients Количество получателей (>= 0)
 * @param costPerSegmentKopecks Стоимость одного сегмента в целых копейках (по умолчанию 250 коп.)
 * @returns Итоговая сумма в целых копейках
 */
export function calculateSmsCostKopecks(
	segmentsPerMessage: number,
	recipients: number,
	costPerSegmentKopecks: Kopecks = DEFAULT_SMS_SEGMENT_COST_KOPECKS,
): Kopecks {
	const validSegments = Math.max(0, Math.floor(segmentsPerMessage || 0));
	const validRecipients = Math.max(0, Math.floor(recipients || 0));
	const validCost = Math.max(0, Math.floor(costPerSegmentKopecks || 0));
	const billableSegments = validSegments * validRecipients;
	return billableSegments * validCost;
}

/**
 * Расчёт стоимости тарифицируемых единиц сообщения в копейках.
 * Для мессенджеров (Telegram, WhatsApp) и почты стоимость = 0 (бесплатно для клиники).
 */
export function calculateMessagingCostKopecks(
	channel: string,
	billableUnits: number,
	costPerUnitKopecks: Kopecks = DEFAULT_SMS_SEGMENT_COST_KOPECKS,
): Kopecks {
	if (channel !== "sms") {
		return 0; // Мессенджеры и email бесплатны
	}
	const validUnits = Math.max(0, Math.floor(billableUnits || 0));
	const validCost = Math.max(0, Math.floor(costPerUnitKopecks || 0));
	return validUnits * validCost;
}

/**
 * Форматирует денежный баланс SMS-шлюза с точностью до копейки без погрешности float.
 */
export function formatSmsBalance(
	balance: { amount: number; currency: string } | null | undefined,
): string {
	if (!balance || typeof balance.amount !== "number" || !Number.isFinite(balance.amount)) {
		return "0.00";
	}
	const kopecks = parseKopecks(balance.amount);
	return formatKopecksToRubles(kopecks);
}

/**
 * Форматирует расчётную стоимость SMS для интерфейса в рублях с копейками.
 */
export function formatSmsCostRu(kopecks: Kopecks): string {
	return formatKopecksRu(kopecks);
}

export {
	formatKopecksRu,
	formatKopecksToRubles,
	parseKopecks,
	type Kopecks,
};
