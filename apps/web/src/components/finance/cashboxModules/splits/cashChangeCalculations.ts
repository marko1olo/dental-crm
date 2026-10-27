/**
 * cashChangeCalculations.ts — Layer 1: Cash Change & 1-Click Fast Presets.
 *
 * DENTE Dental CRM — Cash Register 54-FZ, Discounts & Staff Autonomy Operations.
 */

import { kopecksToRub, rubToKopecks } from "@dental/shared";
import type { CashChangeResult, MultiTenderStateRub } from "../cashboxTypes.js";

/**
 * Расчёт сдачи при приёме наличных:
 * Если внесено ровно столько, сколько к оплате — режим «Без сдачи» (change = 0 ₽).
 */
export function calculateCashChange(totalDueRub: number, receivedCashRub: number): CashChangeResult {
	const safeDueRub = Number.isFinite(totalDueRub) ? Math.max(0, totalDueRub) : 0;
	const safeRecRub = Number.isFinite(receivedCashRub) ? Math.max(0, receivedCashRub) : 0;
	const dueKop = rubToKopecks(safeDueRub);
	const recKop = rubToKopecks(safeRecRub);
	const isExact = recKop === dueKop;
	const isShortage = recKop < dueKop;
	const changeKop = isShortage ? 0 : recKop - dueKop;
	const shortageKop = isShortage ? dueKop - recKop : 0;
	return {
		totalDueRub: kopecksToRub(dueKop),
		receivedCashRub: kopecksToRub(recKop),
		changeRub: kopecksToRub(changeKop),
		changeKopecks: changeKop,
		shortageRub: kopecksToRub(shortageKop),
		shortageKopecks: shortageKop,
		isExact,
		isExactWithoutChange: isExact,
		isInsufficient: isShortage,
		isShortage,
	};
}

/**
 * Пресет «Без сдачи»: наличные = 100% сумме чека, сдача 0 ₽.
 */
export function createExactCashTenders(totalDueRub: number): MultiTenderStateRub {
	return { cardRub: 0, cashRub: totalDueRub, sbpRub: 0, depositRub: 0, familyRub: 0 };
}

/**
 * Пресет «Оплата картой 100%».
 */
export function createFullCardTenders(totalDueRub: number): MultiTenderStateRub {
	return { cardRub: totalDueRub, cashRub: 0, sbpRub: 0, depositRub: 0, familyRub: 0 };
}

/**
 * Пресет «Комбинированная оплата (Списать весь аванс + остаток картой)».
 */
export function createDepositAndCardComboTenders(totalDueRub: number, patientDepositRub: number): MultiTenderStateRub {
	const totalKop = rubToKopecks(Math.max(0, totalDueRub));
	const depKop = Math.min(totalKop, rubToKopecks(Math.max(0, patientDepositRub)));
	const cardKop = Math.max(0, totalKop - depKop);
	return { cardRub: kopecksToRub(cardKop), cashRub: 0, sbpRub: 0, depositRub: kopecksToRub(depKop), familyRub: 0 };
}

/**
 * Пресет «Комбинированная оплата: Сертификат + остаток картой».
 */
export function createCertificateAndCardComboTenders(totalDueRub: number, certificateRub: number): MultiTenderStateRub {
	const totalKop = rubToKopecks(Math.max(0, totalDueRub));
	const certKop = Math.min(totalKop, rubToKopecks(Math.max(0, certificateRub)));
	const cardKop = Math.max(0, totalKop - certKop);
	return { cardRub: kopecksToRub(cardKop), cashRub: 0, sbpRub: 0, depositRub: 0, familyRub: 0, certificateRub: kopecksToRub(certKop), bonusRub: 0 };
}

/**
 * Пресет «Комбинированная оплата: Бонусы + остаток картой».
 */
export function createBonusAndCardComboTenders(totalDueRub: number, bonusRub: number): MultiTenderStateRub {
	const totalKop = rubToKopecks(Math.max(0, totalDueRub));
	const bonusKop = Math.min(totalKop, rubToKopecks(Math.max(0, bonusRub)));
	const cardKop = Math.max(0, totalKop - bonusKop);
	return { cardRub: kopecksToRub(cardKop), cashRub: 0, sbpRub: 0, depositRub: 0, familyRub: 0, certificateRub: 0, bonusRub: kopecksToRub(bonusKop) };
}
