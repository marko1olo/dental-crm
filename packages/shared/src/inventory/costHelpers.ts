import { rublesToKopecks } from "../money.js";

export type KopecksLike = bigint | number | string | null | undefined;
export type RublesLike = string | number | null | undefined;

function toPositiveBigIntKopecks(val: KopecksLike): bigint | null {
	if (val === null || val === undefined || val === "") return null;
	if (typeof val === "bigint") return val > 0n ? val : null;
	if (typeof val === "number") {
		if (!Number.isFinite(val)) return null;
		const rounded = Math.trunc(val);
		return rounded > 0 ? BigInt(rounded) : null;
	}
	const trimmed = val.trim();
	if (!/^-?\d+$/.test(trimmed)) return null;
	try {
		const parsed = BigInt(trimmed);
		return parsed > 0n ? parsed : null;
	} catch {
		return null;
	}
}

function toPositiveKopecksFromRub(val: RublesLike): bigint | null {
	if (val === null || val === undefined || val === "") return null;
	const num = typeof val === "number" ? val : Number(String(val).replace(",", ".").trim());
	if (!Number.isFinite(num) || num <= 0) return null;
	const kopecks = BigInt(rublesToKopecks(num));
	return kopecks > 0n ? kopecks : null;
}

/**
 * Resolves unit cost in integer kopecks (`bigint`).
 * Because DB columns (`unitCostKopecks`, `pricePerUnitKopecks`, `purchasePricePerUnitKopecks`)
 * are `.notNull().default(0n)`, `0n ?? fallback` silently evaluates to `0n`.
 * Treating `<= 0n` as unset allows falling back to ruble values and item defaults.
 */
export function resolveCostKopecks(
	primaryKopecks: KopecksLike,
	fallbackRub?: RublesLike,
	secondaryKopecks?: KopecksLike,
	secondaryRub?: RublesLike,
): bigint {
	return (
		toPositiveBigIntKopecks(primaryKopecks) ??
		toPositiveKopecksFromRub(fallbackRub) ??
		toPositiveBigIntKopecks(secondaryKopecks) ??
		toPositiveKopecksFromRub(secondaryRub) ??
		0n
	);
}
