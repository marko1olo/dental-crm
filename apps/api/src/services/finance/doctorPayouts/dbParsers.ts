import { Decimal } from "decimal.js";

/**
 * Число из базы. numeric приходит то числом (разбор типов включён в
 * db/moneyTypeParsers.ts), то строкой (drizzle возвращает String для колонок
 * без mode: "number"). Обе формы нормальны; молчаливый NaN на деньгах — нет.
 */
export function moneyFromDb(value: unknown, field: string): number {
	if (typeof value === "number" && Number.isFinite(value)) {
		return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
	}
	if (typeof value === "string" && value.trim() !== "") {
		try {
			return new Decimal(value.trim()).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
		} catch {
			// fall through to error
		}
	}
	if (value === null || value === undefined) return 0;
	throw new Error(
		`Поле «${field}» пришло из базы в непригодном для денег виде: ${JSON.stringify(value)}`,
	);
}

/** Процент из базы: null остаётся null, мусор — ошибка, а не тихий ноль. */
export function percentFromDb(value: unknown, field: string): number | null {
	if (value === null || value === undefined) return null;
	if (typeof value === "number" && Number.isFinite(value)) {
		return new Decimal(value).toNumber();
	}
	if (typeof value === "string" && value.trim() !== "") {
		try {
			return new Decimal(value.trim()).toNumber();
		} catch {
			// fall through to error
		}
	}
	throw new Error(
		`Поле «${field}» пришло из базы в непригодном для процента виде: ${JSON.stringify(value)}`,
	);
}
