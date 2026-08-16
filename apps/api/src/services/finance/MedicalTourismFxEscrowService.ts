import { Decimal } from "decimal.js";

/**
 * Сервис для фиксации валютных курсов и расчета эскроу для медицинского туризма.
 */
export class MedicalTourismFxEscrowService {
	/**
	 * Фиксация курса (FX Rate Lock) для суммы в иностранной валюте.
	 */
	public static lockRate(amountForeign: string, exchangeRate: string): string {
		const amount = new Decimal(amountForeign);
		const rate = new Decimal(exchangeRate);

		if (amount.lessThanOrEqualTo(0) || rate.lessThanOrEqualTo(0)) {
			throw new Error("Сумма и курс должны быть больше нуля.");
		}

		return amount.times(rate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
	}

	/**
	 * Расчет депозита и этапных списаний.
	 */
	public static calculateStageBreakdown(
		totalEscrowRub: string,
		stageSharePercent: number,
	): {
		stageAmountRub: string;
		remainingEscrowRub: string;
	} {
		const total = new Decimal(totalEscrowRub);
		const share = new Decimal(stageSharePercent).dividedBy(100);

		const stageAmount = total.times(share).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
		const remaining = total.minus(stageAmount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

		return {
			stageAmountRub: stageAmount.toFixed(2),
			remainingEscrowRub: remaining.toFixed(2),
		};
	}
}
