import { and, eq, gte, inArray, isNotNull, lte, or, sql } from "drizzle-orm";
import { db } from "../../../db/client.js";
import {
	appointments,
	doctorCommissions,
	inventoryItems,
	inventoryTransactions,
	labOrders,
	payments,
	users,
	visits,
} from "../../../db/schema.js";
import type { DoctorPayoutScope } from "./types.js";

/**
 * Один запрос с CTE вместо цикла «на каждого врача по три SELECT» И вместо
 * двух отдельных операторов на строки и контрольную сумму.
 *
 * ЛОВУШКА DRIZZLE, на которой в этом проекте дважды теряли данные: внутри
 * sql`` подстановка `${table.column}` без join-а в запросе рендерится ГОЛЫМ
 * `"column"`, и в коррелированном подзапросе связывается с ВНУТРЕННЕЙ таблицей.
 * Получается `a.patient_id = a.id`: валидный SQL, всегда ложь, пустой экран без
 * единой ошибки. Поэтому внутри sql`` здесь пишется `${table}."column"` —
 * имя таблицы подставляется явно. Проверять себя нужно печатью
 * `query.toSQL().sql`, для этого запрос и собирается отдельной функцией.
 *
 * ПОЧЕМУ КОНТРОЛЬНАЯ СУММА ВНУТРИ ЭТОГО ЖЕ ОПЕРАТОРА — разбор в шапке
 * `doctorPayouts` ниже. Коротко: снимок берётся НА ОПЕРАТОР, а не на
 * транзакцию, поэтому два оператора внутри одной транзакции READ COMMITTED
 * согласованного чтения не дают.
 *
 * ФОРМА СОЕДИНЕНИЯ ВЫБРАНА ТАК, ЧТОБЫ КАССА НЕ ПРОПАДАЛА ПРИ НУЛЕ ВРАЧЕЙ.
 * Ведущая сторона — контрольная сумма (`payout_period_revenue`): агрегат без
 * `group by` возвращает РОВНО одну строку всегда, даже когда платежей нет.
 * Строки врачей присоединяются к ней слева по `true`. Обратный порядок (врачи
 * слева, касса через `cross join`) уронил бы итоги клиники в ноль ровно в том
 * случае, когда они особенно нужны: касса за период есть, а ни один платёж не
 * дошёл до врача по цепочке визит → приём. Владелец увидел бы «выручки нет»
 * вместо «выручка есть, но не отнесена ни к кому».
 */
export function buildDoctorPayoutAggregateQuery(scope: DoctorPayoutScope) {
	const { organizationId, from, to } = scope;

	/*
	 * Визиты, чьи оплаты попали в период. Материалы удерживаются по ТЕМ ЖЕ
	 * визитам, чья касса вошла в расчёт. Иначе материал визита, оплаченного в
	 * следующем месяце, был бы удержан из зарплаты этого месяца — врач заплатил
	 * бы за расход, деньги по которому клиника ещё не получила.
	 */
	const paidVisits = db.$with("payout_paid_visits").as(
		db
			.select({ visitId: payments.visitId })
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, organizationId),
					eq(payments.status, "paid"),
					isNotNull(payments.visitId),
					gte(payments.paidAt, from),
					lte(payments.paidAt, to),
				),
			)
			.groupBy(payments.visitId),
	);

	const revenue = db.$with("payout_revenue").as(
		db
			.select({
				doctorUserId: appointments.doctorUserId,
				revenueRub:
					sql<number>`coalesce(sum(${payments.amountRub}), 0)::numeric(12,2)`.as(
						"revenue_rub",
					),
				paymentCount: sql<number>`count(*)::int`.as("payment_count"),
			})
			.from(payments)
			.innerJoin(visits, eq(payments.visitId, visits.id))
			.innerJoin(appointments, eq(visits.appointmentId, appointments.id))
			.where(
				and(
					eq(payments.organizationId, organizationId),
					eq(payments.status, "paid"),
					gte(payments.paidAt, from),
					lte(payments.paidAt, to),
					// Изоляция клиники на КАЖДОМ звене цепочки, а не только на платеже:
					// строка чужой организации не должна попасть в расчёт даже при
					// испорченной ссылке.
					eq(visits.organizationId, organizationId),
					eq(appointments.organizationId, organizationId),
					isNotNull(appointments.doctorUserId),
				),
			)
			.groupBy(appointments.doctorUserId),
	);

	const materials = db.$with("payout_materials").as(
		db
			.select({
				doctorUserId: appointments.doctorUserId,
				materialCostRub: sql<number>`
					coalesce(
						sum(
							case
								when coalesce(${inventoryItems}."name", '') ~* '(салфетк|ватн.*валик|валик.*стомат|слюноотсос|нагрудник|бахил|стаканчик|перчатк|маск|чехол для позиционер|дезинфицирующ.*салфетк)'
								then 0
								else coalesce(${inventoryTransactions}."unit_cost_rub", 0) * abs(coalesce(${inventoryTransactions}."quantity_changed", 0))
							end
						),
						0
					)::numeric(12,2)
				`.as("material_cost_rub"),
				overheadCostRub: sql<number>`
					coalesce(
						sum(
							case
								when coalesce(${inventoryItems}."name", '') ~* '(салфетк|ватн.*валик|валик.*стомат|слюноотсос|нагрудник|бахил|стаканчик|перчатк|маск|чехол для позиционер|дезинфицирующ.*салфетк)'
								then coalesce(${inventoryTransactions}."unit_cost_rub", 0) * abs(coalesce(${inventoryTransactions}."quantity_changed", 0))
								else 0
							end
						),
						0
					)::numeric(12,2)
				`.as("overhead_cost_rub"),
				movements: sql<number>`count(*)::int`.as("movements"),
				movementsUnpriced: sql<number>`count(*) filter (
					where (${inventoryTransactions}."unit_cost_rub" is null
					   or ${inventoryTransactions}."unit_cost_rub" = 0
					   or ${inventoryTransactions}."quantity_changed" is null
					   or ${inventoryTransactions}."quantity_changed" = 0)
					  and not (coalesce(${inventoryItems}."name", '') ~* '(салфетк|ватн.*валик|валик.*стомат|слюноотсос|нагрудник|бахил|стаканчик|перчатк|маск|чехол для позиционер|дезинфицирующ.*салфетк)')
				)::int`.as("movements_unpriced"),
			})
			.from(inventoryTransactions)
			.innerJoin(
				paidVisits,
				eq(inventoryTransactions.visitId, paidVisits.visitId),
			)
			.innerJoin(visits, eq(inventoryTransactions.visitId, visits.id))
			.innerJoin(appointments, eq(visits.appointmentId, appointments.id))
			.leftJoin(
				inventoryItems,
				and(
					or(
						eq(inventoryTransactions.itemId, inventoryItems.id),
						eq(inventoryTransactions.inventoryItemId, inventoryItems.id),
					),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.where(
				and(
					eq(inventoryTransactions.organizationId, organizationId),
					// Расход материалов при подписании приёма. Приход на склад
					// ('receipt') себестоимостью визита не является.
					eq(inventoryTransactions.transactionType, "auto_deduct"),
					eq(visits.organizationId, organizationId),
					eq(appointments.organizationId, organizationId),
					isNotNull(appointments.doctorUserId),
				),
			)
			.groupBy(appointments.doctorUserId),
	);

	/*
	 * Зуботехническая лаборатория (ЗТЛ): стоимость выполненных и сданных заказов.
	 */
	const labOrdersCte = db.$with("payout_lab_orders").as(
		db
			.select({
				doctorUserId: labOrders.doctorId,
				labCostRub:
					sql<number>`coalesce(sum(${labOrders.priceRub}), 0)::numeric(12,2)`.as(
						"lab_cost_rub",
					),
				labOrdersCount: sql<number>`count(*)::int`.as("lab_orders_count"),
			})
			.from(labOrders)
			.where(
				and(
					eq(labOrders.organizationId, organizationId),
					isNotNull(labOrders.doctorId),
					inArray(labOrders.status, ["received", "completed"]),
					gte(
						sql`coalesce(${labOrders.completedAt}, ${labOrders.createdAt})`,
						from,
					),
					lte(
						sql`coalesce(${labOrders.completedAt}, ${labOrders.createdAt})`,
						to,
					),
					// Гарантийные заказы ЗТЛ (isWarranty / рекламации) относятся на рекламационный фонд клиники
					// и НЕ удерживаются с врача!
					sql`not (
						coalesce(${labOrders.clinicalNotes}, '') ilike '%гарант%' or
						coalesce(${labOrders.clinicalNotes}, '') ilike '%warranty%' or
						coalesce(${labOrders.clinicalNotes}, '') ilike '%переделк%' or
						coalesce(${labOrders.clinicalNotes}, '') ilike '%рекламац%' or
						coalesce(${labOrders.labComments}, '') ilike '%гарант%' or
						coalesce(${labOrders.labComments}, '') ilike '%warranty%' or
						coalesce(${labOrders.labComments}, '') ilike '%переделк%'
					)`,
				),
			)
			.groupBy(labOrders.doctorId),
	);

	/*
	 * Ставки врачей. Уникальности в БД нет (единственный индекс —
	 * doctor_commissions_pkey по id), поэтому у врача может быть несколько
	 * активных строк. Берётся самая свежая по effective_from; сколько их было
	 * всего — уходит в ответ, чтобы владелец увидел двоящуюся настройку, а не
	 * молча получил произвольную из них.
	 */
	const rateCandidates = db.$with("payout_rate_candidates").as(
		db
			.select({
				userId: doctorCommissions.userId,
				commissionPct: doctorCommissions.commissionPct,
				materialDeductionPct: doctorCommissions.materialCostDeductionPct,
				labDeductionPct: doctorCommissions.labCostDeductionPct,
				effectiveFrom: doctorCommissions.effectiveFrom,
				rowNumber: sql<number>`row_number() over (
					partition by ${doctorCommissions}."user_id"
					order by ${doctorCommissions}."effective_from" desc, ${doctorCommissions}."created_at" desc
				)`.as("row_number"),
				rateRowCount:
					sql<number>`(count(*) over (partition by ${doctorCommissions}."user_id"))::int`.as(
						"rate_row_count",
					),
			})
			.from(doctorCommissions)
			.where(
				and(
					eq(doctorCommissions.organizationId, organizationId),
					eq(doctorCommissions.isActive, true),
					lte(doctorCommissions.effectiveFrom, to),
					// Соединять ставку по doctor_id нельзя: эту колонку не пишет ни
					// один писатель, и такой отчёт был бы пуст всегда.
					isNotNull(doctorCommissions.userId),
				),
			),
	);

	const doctorFilter = scope.onlyDoctorUserId
		? and(
				eq(users.organizationId, organizationId),
				eq(users.id, scope.onlyDoctorUserId),
			)
		: eq(users.organizationId, organizationId);

	/*
	 * Итоги кассы за период целиком: сходится ли сумма по врачам с кассой.
	 *
	 * ОХВАТ «ТОЛЬКО СВОИ» ОБЯЗАТЕЛЕН И ЗДЕСЬ, А НЕ ТОЛЬКО В СТРОКАХ.
	 * БЫЛО: `scope` передавался, но `onlyDoctorUserId` этот запрос игнорировал.
	 * Строки врач получал свои, а `totals` — по всей клинике: на живой базе врач с
	 * собственной кассой 23 400 ₽ получал `revenueRub: 67400` и `paymentCount: 8`,
	 * то есть выручку коллег и число чужих оплат. Заслонка на экране этого не
	 * лечит — число уходит в ответ маршрута и видно в сетевой панели браузера.
	 * Зарплата коллеги — не та величина, которую врач вправе сложить из отчёта о
	 * своей выплате.
	 *
	 * При `onlyDoctorUserId` соединения остаются левыми, а условие по врачу стоит в
	 * WHERE: оплата без визита даёт NULL в `doctor_user_id`, сравнение с ним
	 * неверно, и такая касса из «своего» итога выпадает. Поэтому у врача
	 * `revenueRub` = `attributableRevenueRub`, а «не отнесено к врачу» равно нулю —
	 * чужая и ничейная касса в его отчёт не попадают вовсе.
	 */
	const periodRevenue = db.$with("payout_period_revenue").as(
		db
			.select({
				totalRevenueRub:
					sql<number>`coalesce(sum(${payments.amountRub}), 0)::numeric(12,2)`.as(
						"total_revenue_rub",
					),
				totalPaymentCount: sql<number>`count(*)::int`.as("total_payment_count"),
				attributableRevenueRub: sql<number>`coalesce(
					sum(${payments.amountRub}) filter (where ${appointments.doctorUserId} is not null),
					0
				)::numeric(12,2)`.as("attributable_revenue_rub"),
			})
			.from(payments)
			.leftJoin(
				visits,
				and(
					eq(payments.visitId, visits.id),
					eq(visits.organizationId, organizationId),
				),
			)
			.leftJoin(
				appointments,
				and(
					eq(visits.appointmentId, appointments.id),
					eq(appointments.organizationId, organizationId),
				),
			)
			.where(
				and(
					eq(payments.organizationId, organizationId),
					eq(payments.status, "paid"),
					gte(payments.paidAt, from),
					lte(payments.paidAt, to),
					scope.onlyDoctorUserId
						? eq(appointments.doctorUserId, scope.onlyDoctorUserId)
						: undefined,
				),
			),
	);

	const doctorRows = db.$with("payout_doctor_rows").as(
		db
			.select({
				doctorUserId: users.id,
				doctorName: users.fullName,
				role: users.role,
				isActive: users.isActive,
				revenueRub:
					sql<number>`coalesce(${revenue.revenueRub}, 0)::numeric(12,2)`.as(
						"doctor_revenue_rub",
					),
				paymentCount: sql<number>`coalesce(${revenue.paymentCount}, 0)::int`.as(
					"doctor_payment_count",
				),
				materialCostRub:
					sql<number>`coalesce(${materials.materialCostRub}, 0)::numeric(12,2)`.as(
						"doctor_material_cost_rub",
					),
				overheadCostRub:
					sql<number>`coalesce(${materials.overheadCostRub}, 0)::numeric(12,2)`.as(
						"doctor_overhead_cost_rub",
					),
				materialMovements:
					sql<number>`coalesce(${materials.movements}, 0)::int`.as(
						"doctor_material_movements",
					),
				materialMovementsUnpriced:
					sql<number>`coalesce(${materials.movementsUnpriced}, 0)::int`.as(
						"doctor_material_movements_unpriced",
					),
				labCostRub:
					sql<number>`coalesce(${labOrdersCte.labCostRub}, 0)::numeric(12,2)`.as(
						"doctor_lab_cost_rub",
					),
				labOrdersCount:
					sql<number>`coalesce(${labOrdersCte.labOrdersCount}, 0)::int`.as(
						"doctor_lab_orders_count",
					),
				commissionPct: rateCandidates.commissionPct,
				materialDeductionPct: rateCandidates.materialDeductionPct,
				labDeductionPct: rateCandidates.labDeductionPct,
				rateEffectiveFrom: rateCandidates.effectiveFrom,
				rateRowCount:
					sql<number>`coalesce(${rateCandidates.rateRowCount}, 0)::int`.as(
						"doctor_rate_row_count",
					),
			})
			.from(users)
			.leftJoin(revenue, eq(revenue.doctorUserId, users.id))
			.leftJoin(materials, eq(materials.doctorUserId, users.id))
			.leftJoin(labOrdersCte, eq(labOrdersCte.doctorUserId, users.id))
			// Ставка присоединяется только самой свежей строкой: остальные оставлены
			// в CTE ради счётчика rate_row_count.
			.leftJoin(
				rateCandidates,
				and(
					eq(rateCandidates.userId, users.id),
					eq(rateCandidates.rowNumber, 1),
				),
			)
			.where(
				and(
					doctorFilter,
					/*
					 * В отчёт попадают врачи клиники И любой сотрудник, на которого за
					 * период пришла касса или списание материалов или заказы ЗТЛ.
					 */
					or(
						eq(users.role, "doctor"),
						isNotNull(revenue.doctorUserId),
						isNotNull(materials.doctorUserId),
						isNotNull(labOrdersCte.doctorUserId),
					),
				),
			),
	);

	return db
		.with(
			paidVisits,
			revenue,
			materials,
			labOrdersCte,
			rateCandidates,
			periodRevenue,
			doctorRows,
		)
		.select({
			doctorUserId: doctorRows.doctorUserId,
			doctorName: doctorRows.doctorName,
			role: doctorRows.role,
			isActive: doctorRows.isActive,
			revenueRub: doctorRows.revenueRub,
			paymentCount: doctorRows.paymentCount,
			materialCostRub: doctorRows.materialCostRub,
			overheadCostRub: doctorRows.overheadCostRub,
			materialMovements: doctorRows.materialMovements,
			materialMovementsUnpriced: doctorRows.materialMovementsUnpriced,
			labCostRub: doctorRows.labCostRub,
			labOrdersCount: doctorRows.labOrdersCount,
			commissionPct: doctorRows.commissionPct,
			materialDeductionPct: doctorRows.materialDeductionPct,
			labDeductionPct: doctorRows.labDeductionPct,
			rateEffectiveFrom: doctorRows.rateEffectiveFrom,
			rateRowCount: doctorRows.rateRowCount,
			totalRevenueRub: periodRevenue.totalRevenueRub,
			totalPaymentCount: periodRevenue.totalPaymentCount,
			attributableRevenueRub: periodRevenue.attributableRevenueRub,
		})
		.from(periodRevenue)
		.leftJoin(doctorRows, sql`true`);
}
