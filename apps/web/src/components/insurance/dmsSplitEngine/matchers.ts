/**
 * matchers.ts — Утилиты форматирования и проверки согласования услуг и зубов
 */

import { formatCurrencyRu, formatKopecksRu } from "@dental/shared";
import type { DmsGuaranteeLetter } from "./types.js";

/** Форматирование суммы в рублях с копейками */
export function formatCurrencyRub(rublesOrKopecks: number, isKopecks = false): string {
	return isKopecks ? formatKopecksRu(Math.round(rublesOrKopecks)) : formatCurrencyRu(rublesOrKopecks);
}

/** Прямое форматирование копеек в рубли */
export function formatCurrencyKopecks(kopecks: number): string {
	return formatKopecksRu(Math.round(kopecks));
}

/** Нормализация номера зуба (FDI: 11..48, 51..85) */
export function normalizeToothFdi(tooth: string | undefined): string | undefined {
	if (!tooth) return undefined;
	const cleaned = tooth.replace(/[^0-9]/g, "");
	return cleaned.length >= 2 ? cleaned : tooth.trim();
}

/** Проверка согласованности зуба по гарантийному письму */
export function isToothApprovedByLetter(
	tooth: string | undefined,
	letter: DmsGuaranteeLetter | undefined,
): boolean {
	if (!letter) return true;
	if (!letter.approvedTeethFdi || letter.approvedTeethFdi.length === 0) return true;
	if (!tooth) return true;

	const cleanTooth = normalizeToothFdi(tooth);
	return letter.approvedTeethFdi.some((t) => normalizeToothFdi(t) === cleanTooth);
}

/** Проверка согласованности кода услуги по гарантийному письму */
export function isServiceCodeApprovedByLetter(
	serviceCode: string,
	letter: DmsGuaranteeLetter | undefined,
): boolean {
	if (!letter) return true;
	const codes = letter.approvedServiceCodes804n || letter.approvedServiceCodes;
	if (!codes || codes.length === 0) return true;

	const cleanCode = serviceCode.trim().toUpperCase();
	return codes.some((c) => {
		const approved = c.trim().toUpperCase();
		return cleanCode === approved || cleanCode.startsWith(approved);
	});
}
