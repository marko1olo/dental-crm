import { Decimal } from "decimal.js";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { advanceDepositTaggings } from "../../db/schema/billing.js";
import { generatedDocuments } from "../../db/schema/clinical.js";

export interface EscrowReleaseResult {
	releaseAmountRub: string;
	remainingEscrowRub: string;
}

/**
 * Сервис для управления эскроу-блокировками авансов по комплексным планам лечения.
 */
export class TreatmentEscrowLockService {
	/**
	 * Расчет частичного релиза средств по проценту выполненного клинического этапа (Decimal.js)
	 */
	public static calculateStageRelease(
		totalEscrowRub: string,
		stageSharePercent: number,
	): EscrowReleaseResult {
		const total = new Decimal(totalEscrowRub);
		const percent = new Decimal(stageSharePercent).dividedBy(100);

		if (percent.lessThan(0) || percent.greaterThan(1)) {
			throw new Error("Процент этапа должен быть в диапазоне от 0 до 100.");
		}

		const releaseAmount = total.times(percent).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
		const remainingEscrow = total.minus(releaseAmount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

		return {
			releaseAmountRub: releaseAmount.toFixed(2),
			remainingEscrowRub: remainingEscrow.toFixed(2),
		};
	}

	/**
	 * Расчет суммы возврата неиспользованного остатка (Decimal.js)
	 */
	public static calculateRefundAmount(totalEscrowRub: string, releasedAmountRub: string): string {
		const total = new Decimal(totalEscrowRub);
		const released = new Decimal(releasedAmountRub);

		const refund = total.minus(released);
		if (refund.lessThan(0)) {
			throw new Error("Сумма релиза превышает заблокированный эскроу-баланс.");
		}

		return refund.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
	}

	/**
	 * Блокирует внесенный пациентом аванс в системе.
	 */
	static async lockAdvance(
		organizationId: string,
		patientName: string,
		amount: string,
		targetType: string,
		targetName: string,
	) {
		const amountDecimal = new Decimal(amount);
		if (amountDecimal.lessThanOrEqualTo(0)) {
			throw new Error("Аванс должен быть больше нуля.");
		}

		return await db.insert(advanceDepositTaggings).values({
			organizationId,
			patientName,
			depositAmountRub: amountDecimal.toFixed(2),
			taggedTargetType: targetType,
			taggedTargetName: targetName,
			allocationStatus: "pinned",
		});
	}

	/**
	 * Релиз средств при подписании акта выполненных работ.
	 */
	static async releaseFunds(organizationId: string, taggingId: string, documentId: string) {
		const doc = await db
			.select()
			.from(generatedDocuments)
			.where(
				and(
					eq(generatedDocuments.id, documentId),
					eq(generatedDocuments.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!doc.length || doc[0]?.status !== "issued") {
			throw new Error("Акт не найден или не выпущен.");
		}

		await db
			.update(advanceDepositTaggings)
			.set({ allocationStatus: "released" })
			.where(
				and(
					eq(advanceDepositTaggings.id, taggingId),
					eq(advanceDepositTaggings.organizationId, organizationId),
				),
			);

		return { released: true };
	}

	/**
	 * Возврат неиспользованного остатка.
	 */
	static async refundRemaining(organizationId: string, taggingId: string) {
		return await db
			.update(advanceDepositTaggings)
			.set({ allocationStatus: "refunded" })
			.where(
				and(
					eq(advanceDepositTaggings.id, taggingId),
					eq(advanceDepositTaggings.organizationId, organizationId),
				),
			);
	}
}
