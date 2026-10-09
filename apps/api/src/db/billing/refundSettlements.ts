import { and, eq, inArray } from "drizzle-orm";
import { db } from "../client.js";
import * as schema from "../schema.js";
import type {
	PaymentRefundSettlementItem,
	PaymentRefundSettlementResult,
} from "./types.js";

/**
 * Приводит статус платежей в соответствие с ВЫДАННЫМИ заявлениями на возврат.
 *
 * ЗАЧЕМ ЭТО ПОЯВИЛОСЬ. В этом файле не было ни одного writer'а по платежам,
 * кроме вставки: `db.update(schema.payments)` не вызывался нигде во всём
 * `apps/api/src`. Возврат жил как документ и не существовал как движение денег —
 * выручка (`sum(amount_rub) where status = 'paid'`) продолжала считать
 * возвращённые пациенту деньги полученными.
 *
 * Решение «полностью возвращён» принимается НЕ здесь, а в
 * `documents/guards.ts: paymentRefundSettlements` — там же, где живёт учёт
 * остатка по чеку. Этот слой только записывает, и записывает ровно два перехода:
 *   • `paid` → `refunded`, когда выданные заявления покрыли чек целиком;
 *   • `refunded` → `paid`, когда покрытие исчезло (заявление аннулировано).
 * `planned` и `voided` не трогаются: `planned` — ещё не полученные деньги,
 * `voided` — отменённая строка кассы, и возврат ни ту, ни другую не двигает.
 *
 * Условие по текущему статусу стоит в самом `where`, а не в предварительном
 * чтении: переход выполняется одним оператором, поэтому два одновременных
 * запроса не могут увидеть одно и то же «было» и записать противоречащие «стало».
 * Вызов идемпотентен — повтор не находит строк и возвращает пустой список.
 */
export async function applyPaymentRefundSettlementsInDb(
	organizationId: string,
	settlements: readonly PaymentRefundSettlementItem[],
): Promise<PaymentRefundSettlementResult> {
	const toRefund = settlements
		.filter((item) => item.fullyRefunded)
		.map((item) => item.paymentId);
	const toRestore = settlements
		.filter((item) => !item.fullyRefunded)
		.map((item) => item.paymentId);

	async function move(
		paymentIds: readonly string[],
		from: "paid" | "refunded",
		to: "paid" | "refunded",
	): Promise<string[]> {
		if (paymentIds.length === 0) return [];
		const changed = await db
			.update(schema.payments)
			.set({ status: to, updatedAt: new Date() })
			.where(
				and(
					eq(schema.payments.organizationId, organizationId),
					inArray(schema.payments.id, [...paymentIds]),
					eq(schema.payments.status, from),
				),
			)
			.returning({ id: schema.payments.id });
		return changed.map((row) => row.id);
	}

	return {
		refunded: await move(toRefund, "paid", "refunded"),
		restored: await move(toRestore, "refunded", "paid"),
	};
}
