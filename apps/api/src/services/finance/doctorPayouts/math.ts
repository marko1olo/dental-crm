import { Decimal } from "decimal.js";

/** Копейки: округление половины вверх, как в бухгалтерии. */
export function roundMoney(value: Decimal | number | string): number {
	return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

/** Процент от суммы, округлённый до копейки. */
export function percentOfMoney(amountRub: number, percent: number): number {
	return roundMoney(new Decimal(amountRub).times(new Decimal(percent)).div(100));
}

/**
 * Пригодна ли ставка для расчёта зарплаты.
 *
 * Отрицательный процент означал бы, что врач платит клинике за то, что принял
 * пациента; больше 100 % — что клиника отдаёт врачу больше, чем получила.
 * И то и другое — испорченные данные, а не политика: считать по ним нельзя.
 */
export function isUsablePercent(value: number | null): value is number {
	return value !== null && Number.isFinite(value) && value >= 0 && value <= 100;
}
