import {
	type Kopecks,
	multiplyKopecks,
	sumKopecks,
} from "@dental/shared";
import { safeKopecks } from "./pricingFormatters";

/** Строка сметы в том виде, в каком её отдаёт API. */
export interface PlanMoneyLine {
	readonly price: number | string;
	readonly quantity: number;
	readonly discount?: number | string | null;
}

/**
 * Итог по строке сметы, точно до копейки (Мандаты 8b, 8e).
 * Формула: Math.max(0, price * quantity - discountRub).
 */
export function planLineTotalKopecks(line: PlanMoneyLine): Kopecks | null {
	const unitKopecks = safeKopecks(line.price, { allowEmptyAsZero: true });
	if (unitKopecks === null) return null;
	if (!Number.isInteger(line.quantity) || line.quantity < 0) return null;
	const discountKopecks = safeKopecks(line.discount ?? 0, { allowEmptyAsZero: true });
	if (discountKopecks === null || discountKopecks < 0) return null;

	const gross = multiplyKopecks(unitKopecks, line.quantity);
	return Math.max(0, gross - discountKopecks) as Kopecks;
}

export interface PlanTotal {
	readonly kopecks: Kopecks | null;
	readonly unreadableLines: number;
}

/**
 * Итог плана лечения. Складываются целые копейки (Kopecks),
 * исключая ошибки с плавающей точкой IEEE 754 (0.1 + 0.2 != 0.3).
 */
export function planTotalKopecks(
	lines: readonly PlanMoneyLine[],
	storedTotalRub?: number | string | null,
): PlanTotal {
	if (lines.length === 0) {
		const stored = safeKopecks(storedTotalRub ?? 0, { allowEmptyAsZero: true });
		return { kopecks: stored, unreadableLines: stored === null ? 1 : 0 };
	}

	const totals: Kopecks[] = [];
	let unreadableLines = 0;
	for (const line of lines) {
		const lineTotal = planLineTotalKopecks(line);
		if (lineTotal === null) {
			unreadableLines += 1;
			continue;
		}
		totals.push(lineTotal);
	}
	if (unreadableLines > 0) return { kopecks: null, unreadableLines };
	return { kopecks: sumKopecks(totals), unreadableLines: 0 };
}
