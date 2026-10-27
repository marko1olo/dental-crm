/**
 * dbTypes.ts — Базовые типы, валидация и утилиты для CRM Database AI Tools.
 * Соответствует Мандатам 8b (<= 120 строк), 8e (автономия врача), 8n (целочисленные копейки).
 */

import type { DentalToolContext } from "../types.js";

export type { DentalToolContext };

export type TwoPhaseGuardStatus = "confirmation_required" | "executed";

/**
 * Валидация номера зуба по международной системе FDI (ISO 3950):
 * - Постоянные зубы: квадранты 1-4, зубы 1-8 (11-18, 21-28, 31-38, 41-48)
 * - Молочные зубы: квадранты 5-8, зубы 1-5 (51-55, 61-65, 71-75, 81-85)
 */
export function isValidFdiToothNumber(tooth: number): boolean {
	const isAdult = tooth >= 11 && tooth <= 48 && tooth % 10 >= 1 && tooth % 10 <= 8;
	const isPediatric = tooth >= 51 && tooth <= 85 && tooth % 10 >= 1 && tooth % 10 <= 5;
	return isAdult || isPediatric;
}

/**
 * Преобразование рублей в целочисленные копейки (Мандат 8n: целые числа amountKopecks)
 */
export function rubToKopecks(rub: number): bigint {
	return BigInt(Math.round(rub * 100));
}

/**
 * Преобразование целочисленных копеек в рубли
 */
export function kopecksToRub(kopecks: bigint | number): number {
	return Number(kopecks) / 100;
}
