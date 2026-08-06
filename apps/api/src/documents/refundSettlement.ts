import {
	applyPaymentRefundSettlementsInDb,
	getPaymentsByPatientIdInDb,
} from "../db/billingQuery.js";
import { getDocumentsByPatientId } from "../db/documentQuery.js";
import { paymentRefundSettlements } from "./guards.js";

/**
 * ШОВ «ВОЗВРАТ → КАССА»: статус платежа следует за выданными заявлениями.
 *
 * ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ. Возврат существовал только как документ. Заявление
 * на возврат 500 ₽ оформлялось и ВЫДАВАЛОСЬ (HTTP 200), а `payments.status` того
 * платежа оставался `paid` — замерено сквозным прогоном денежной цепочки. Так как
 * выручка считается как `sum(amount_rub) where status = 'paid'`, отчёты
 * руководителю показывали возвращённые пациенту деньги как полученные: касса не
 * сходилась с фактическим остатком в ящике, а налоговая справка собрала бы
 * возвращённую сумму в вычет пациента как оплату — то есть клиника выдала бы
 * пациенту документ для ФНС на деньги, которые ему же и вернула.
 *
 * ПОЧЕМУ ИМЕННО ВЫДАЧА ДОКУМЕНТА, А НЕ ОТДЕЛЬНОЕ ДЕЙСТВИЕ КАССЫ.
 *  1. Выдача — это и есть момент, когда деньги покидают кассу. Так уже устроен
 *     контроль суммы возврата: `routes/documents/issue.ts` намеренно перепроверяет
 *     остаток по чеку именно при выдаче, а не при создании черновика.
 *  2. Черновик кассы касаться не должен: его можно изменить или удалить, деньги
 *     ещё не выходили, и снимать их с выручки без юридического основания нельзя.
 *  3. Отдельное действие кассы завело бы ВТОРУЮ запись того же факта — и вместе с
 *     ней ровно тот дефект, который здесь закрывается: выданное заявление, о
 *     котором кассе не сказали. Учёт возвратов уже ведётся по документам
 *     (`alreadyRefundedKopecksForPayment`), а не по колонке, поэтому у факта
 *     остаётся один владелец.
 *
 * ПОЧЕМУ СОСТОЯНИЕ ПЕРЕСЧИТЫВАЕТСЯ ЦЕЛИКОМ, А НЕ «ПРИБАВЛЯЕТСЯ ЭТОТ ВОЗВРАТ».
 * Функция читает документы пациента из базы ПОСЛЕ записи выдачи или
 * аннулирования, поэтому видит уже сложившуюся истину и не зависит от того, какое
 * действие её вызвало. Отсюда два следствия: аннулирование выданного заявления
 * возвращает деньги в выручку тем же кодом, и повторный вызов ничего не портит.
 *
 * ГРАНИЦА, КОТОРАЯ ЗДЕСЬ НЕ ЗАКРЫТА, — НАЗЫВАЮ ЧЕСТНО. Запись документа и запись
 * статуса платежа идут двумя отдельными операторами, а не одной транзакцией.
 * Каждый переход статуса атомарен сам по себе (условие «из какого статуса» стоит
 * в `where`), но падение между двумя записями оставит выданный документ с
 * несведённым платежом — то есть прежнее состояние дефекта. Восстановление
 * встроено: следующая выдача или аннулирование любого заявления на возврат этого
 * пациента пересчитает все его платежи заново.
 */
export type RefundSettlementOutcome = {
	/** Платежи, ушедшие из выручки: возврат покрыл чек целиком. */
	refunded: string[];
	/** Платежи, вернувшиеся в выручку: покрытие исчезло (заявление аннулировано). */
	restored: string[];
	/**
	 * Платежи с ЧАСТИЧНЫМ возвратом — они осознанно остались `paid`.
	 *
	 * В `payments` нет столбца, которым частичный возврат выражается: `status` —
	 * один флаг на всю строку, `amount_rub` — сумма исходного фискального чека, и
	 * править её нельзя. Пометить такой чек `refunded` значило бы убрать из выручки
	 * ВЕСЬ чек вместо возвращённой части. Это возвращается вызывающему, чтобы факт
	 * был видим, а не молчал.
	 */
	partiallyRefunded: {
		paymentId: string;
		refundedKopecks: number;
		amountKopecks: number;
	}[];
};

export async function settleRefundedPaymentsForPatient(
	organizationId: string,
	patientId: string,
): Promise<RefundSettlementOutcome> {
	const [payments, documents] = await Promise.all([
		getPaymentsByPatientIdInDb(organizationId, patientId),
		getDocumentsByPatientId(organizationId, patientId),
	]);
	const settlements = paymentRefundSettlements(payments, documents);
	if (settlements.length === 0) {
		return { refunded: [], restored: [], partiallyRefunded: [] };
	}
	const applied = await applyPaymentRefundSettlementsInDb(
		organizationId,
		settlements,
	);
	return {
		refunded: applied.refunded,
		restored: applied.restored,
		partiallyRefunded: settlements
			.filter((item) => !item.fullyRefunded && item.refundedKopecks > 0)
			.map((item) => ({
				paymentId: item.paymentId,
				refundedKopecks: item.refundedKopecks,
				amountKopecks: item.amountKopecks,
			})),
	};
}
