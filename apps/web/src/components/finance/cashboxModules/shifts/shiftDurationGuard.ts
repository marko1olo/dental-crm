/**
 * shiftDurationGuard.ts — Layer 2: 54-FZ 24h Shift Duration Guard & Formatters.
 *
 * DENTE Dental CRM — Cash Register 54-FZ, Discounts & Staff Autonomy Operations.
 */

import type { CashboxShiftValidation } from "../cashboxTypes.js";

/**
 * Статья 4.3 54-ФЗ: Продолжительность смены на ККТ не должна превышать 24 часов.
 * При превышении 24 часов фискальный накопитель (ФН) блокирует формирование кассовых чеков.
 */
export function checkShift24hLimit(
	openedAt: Date | string | number,
	now: Date | string | number = new Date(),
): CashboxShiftValidation {
	const openTime = new Date(openedAt).getTime();
	const currentTime = new Date(now).getTime();

	if (Number.isNaN(openTime) || openTime <= 0) {
		return {
			isLimitExceeded: false,
			durationHours: 0,
			durationMinutes: 0,
			remainingHours: 24,
			canOpen: true,
			canClose: false,
			statusMessageRu: "Смена не открыта",
		};
	}

	const diffMs = Math.max(0, currentTime - openTime);
	const durationMinutes = Math.floor(diffMs / (1000 * 60));
	const durationHours = Number((diffMs / (1000 * 60 * 60)).toFixed(1));
	const isLimitExceeded = durationMinutes >= 24 * 60;
	const remainingMinutes = Math.max(0, 24 * 60 - durationMinutes);
	const remainingHours = Number((remainingMinutes / 60).toFixed(1));

	let statusMessageRu = `Смена открыта (${durationHours} ч.)`;
	let warningRu: string | undefined;

	if (isLimitExceeded) {
		statusMessageRu = `Смена превысила 24 часа (${durationHours} ч.)`;
		warningRu = "Смена длится более 24 часов. Требуется закрыть смену и снять Z-отчет перед новыми чеками.";
	} else if (remainingMinutes <= 60) {
		warningRu = `До истечения 24 часов осталось ${remainingMinutes} мин. Рекомендуется закрыть смену.`;
	}

	return {
		isLimitExceeded,
		durationHours,
		durationMinutes,
		remainingHours,
		canOpen: false,
		canClose: true,
		statusMessageRu,
		warningRu,
	};
}

/**
 * Форматирование продолжительности смены в человекочитаемый вид (например: "8 ч 35 мин").
 */
export function formatShiftDuration(
	openedAt: Date | string | number,
	now: Date | string | number = new Date(),
): string {
	const openTime = new Date(openedAt).getTime();
	const currentTime = new Date(now).getTime();
	if (Number.isNaN(openTime) || openTime <= 0) return "0 мин";

	const diffMs = Math.max(0, currentTime - openTime);
	const totalMins = Math.floor(diffMs / (1000 * 60));
	const hours = Math.floor(totalMins / 60);
	const mins = totalMins % 60;

	if (hours === 0) return `${mins} мин`;
	return `${hours} ч ${mins} мин`;
}
