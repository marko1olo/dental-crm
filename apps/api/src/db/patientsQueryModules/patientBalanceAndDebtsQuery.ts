import { and, eq, inArray } from "drizzle-orm";
import {
	buildPatientLedgers,
	MoneyPrecisionError,
	type PaymentRow,
	patientAccountBalanceKopecks,
	QuantityContractError,
	rublesFromKopecks,
	type TreatmentChargeRow,
} from "../../money/patientDebt.js";
import { db } from "../client.js";
import * as schema from "../schema.js";

/**
 * САЛЬДО КАРТОЧКИ ПАЦИЕНТА — ИЗ ЕДИНОГО ДОМА ФОРМУЛЫ ДОЛГА.
 *
 * ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ. В `rowToPatient` стояло `balanceRub: 0` — не
 * формула, а константа. То есть API картотеки утверждал, что клинике не должен
 * никто и клиника не должна никому. Замер боевым маршрутом `GET /api/patients`
 * на клинике `d0000000-…-d001` (2026-07-29): 14 пациентов, `balanceRub = 0` у
 * ВСЕХ, тогда как прямой SQL по той же клинике даёт четыре ненулевых сальдо —
 * `…0103` и `…0104` должны по 26 500,00 ₽, `…0100` и `…0101` переплатили по
 * 800,00 ₽. Администратор, открывший карточку перед звонком, видел ноль у
 * должника на 26 500 ₽.
 *
 * ВТОРОЙ ФОРМУЛЫ ЗДЕСЬ НЕ ЗАВЕДЕНО. Считает `money/patientDebt.ts` —
 * единственный дом этого вопроса; разбор всех девяти прежних расчётов и порядок
 * переезда — `.agents/lead/recon-debt-formula-sprawl.md`. В этом файле осталась
 * только пересадка строк базы в строки модуля и один SELECT на денежную таблицу.
 *
 * ЗНАК. Поле `Patient.balanceRub` объявлено контрактом как «оплачено минус
 * запланировано, отрицательное — долг» (`packages/shared/src/index.ts`), и тот
 * же знак печатает второй живой производитель этого поля —
 * `db/domainStateHydration.ts`. Поэтому берётся `patientAccountBalanceKopecks`,
 * а не канонический `patientOwesClinicKopecks`: иначе один и тот же пациент был
 * бы должником в картотеке и переплатившим в сводке.
 *
 * ЧТО ОЗНАЧАЕТ ОТВЕТ. Для КАЖДОГО запрошенного пациента в ответе есть запись:
 *   • число — сальдо посчитано;
 *   • `null` — посчитать не удалось, и это НЕ ноль (см. ниже);
 *   • число 0 бывает двух видов, и оба — измеренный ноль: у пациента нет ни
 *     одной денежной строки, либо все его позиции отменены и оплат нет.
 *
 * ПОЧЕМУ ОТКАЗ ИЗОЛИРУЕТСЯ ПО ПАЦИЕНТУ, А НЕ РОНЯЕТ СПИСОК. Модуль отвергает
 * суммы, потерявшие точность, и количество, нарушающее общий контракт
 * (`quantity: z.number().int().positive()`; колонка `numeric(10,2)` дробное
 * значение пропустит). Одна такая строка у одного пациента не должна лишать
 * клинику всей картотеки — это первый экран смены. Поэтому сальдо собирается по
 * пациенту отдельно, отказ пишется в журнал с именем пациента и причиной, а
 * остальные сальдо остаются точными.
 *
 * ЧЕСТНО О ГРАНИЦЕ, КОТОРУЮ ЗДЕСЬ НЕ ПЕРЕЙТИ. `balanceRub` объявлено
 * `moneyRubSchema.default(0)` — в этом поле нельзя выразить «не рассчитано», а
 * контракт правит другой агент. Значит для такого пациента карточка покажет 0,
 * то есть неизвестное напечатается нулём — ровно то, что запрещает
 * `tests/unknownIsNotZero.test.ts`. Единственное, что здесь можно сделать, — не
 * молчать: причина уходит в журнал целиком. Настоящее лечение — признак «сальдо
 * известно» рядом с суммой, и это долг, названный вслух, а не умолчание.
 *
 * СБОЙ БАЗЫ, В ОТЛИЧИЕ ОТ ГРЯЗНЫХ ДАННЫХ, НАРУЖУ ЛЕТИТ. Он означает, что
 * прочитать деньги нельзя вообще; молча отдать нули значило бы то же, против
 * чего написан весь остальной файл.
 */
export async function patientAccountBalancesRub(
	organizationId: string,
	patientIds: readonly string[],
): Promise<Map<string, number | null>> {
	const balances = new Map<string, number | null>();
	if (patientIds.length === 0) return balances;

	/*
	 * Оптимизация выборки сальдо: запрашиваем начисления и платежи
	 * ИСКЛЮЧИТЕЛЬНО для запрашиваемого набора patientIds через inArray.
	 * Условие по organizationId строго сохраняется для multi-tenant изоляции.
	 */
	const firstPatientId = patientIds[0];
	const patientIdFilter =
		patientIds.length === 1 && firstPatientId !== undefined
			? eq(schema.treatmentItems.patientId, firstPatientId)
			: inArray(schema.treatmentItems.patientId, patientIds as string[]);
	const chargeScope = and(
		eq(schema.treatmentItems.organizationId, organizationId),
		patientIdFilter,
	);

	const paymentPatientFilter =
		patientIds.length === 1 && firstPatientId !== undefined
			? eq(schema.payments.patientId, firstPatientId)
			: inArray(schema.payments.patientId, patientIds as string[]);
	const paymentScope = and(
		eq(schema.payments.organizationId, organizationId),
		paymentPatientFilter,
	);

	const [chargeRows, paymentRows] = await Promise.all([
		db
			.select({
				patientId: schema.treatmentItems.patientId,
				status: schema.treatmentItems.status,
				unitPriceRub: schema.treatmentItems.unitPriceRub,
				quantity: schema.treatmentItems.quantity,
				discountRub: schema.treatmentItems.discountRub,
			})
			.from(schema.treatmentItems)
			.where(chargeScope),
		db
			.select({
				patientId: schema.payments.patientId,
				status: schema.payments.status,
				amountRub: schema.payments.amountRub,
			})
			.from(schema.payments)
			.where(paymentScope),
	]);

	/* Группировка по пациенту — один проход на таблицу. Фильтрация массива в
	   цикле по пациентам дала бы O(пациенты × строки): на клинике с тысячами
	   карт и десятками тысяч позиций это заметно на каждом открытии картотеки. */
	const chargesByPatient = new Map<string, TreatmentChargeRow[]>();
	for (const row of chargeRows) {
		const bucket = chargesByPatient.get(row.patientId);
		if (bucket) bucket.push(row);
		else chargesByPatient.set(row.patientId, [row]);
	}
	const paymentsByPatient = new Map<string, PaymentRow[]>();
	for (const row of paymentRows) {
		const bucket = paymentsByPatient.get(row.patientId);
		if (bucket) bucket.push(row);
		else paymentsByPatient.set(row.patientId, [row]);
	}

	for (const patientId of patientIds) {
		const charges = chargesByPatient.get(patientId) ?? [];
		const patientPayments = paymentsByPatient.get(patientId) ?? [];
		try {
			const ledger = buildPatientLedgers(charges, patientPayments).get(
				patientId,
			);
			/* Сальдо нет в ответе модуля, когда ни одна строка не пошла в зачёт:
			   нет денежных строк вовсе либо все позиции отменены и оплат нет. Это
			   ИЗМЕРЕННЫЙ ноль, и он обязан отличаться от «не рассчитано» ниже. */
			balances.set(
				patientId,
				ledger ? rublesFromKopecks(patientAccountBalanceKopecks(ledger)) : 0,
			);
		} catch (error) {
			if (
				error instanceof MoneyPrecisionError ||
				error instanceof QuantityContractError
			) {
				console.error(
					`[patientsQuery] Сальдо пациента ${patientId} (клиника ${organizationId}) не рассчитано: ${error.message} ` +
						"В карточке будет 0, потому что поле balanceRub контракта не умеет говорить «не рассчитано». " +
						"Это не измеренный ноль: почините строку денег, названную в причине.",
				);
				balances.set(patientId, null);
				continue;
			}
			throw error;
		}
	}
	return balances;
}
