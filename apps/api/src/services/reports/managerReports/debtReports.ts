/**
 * Расчёт дебиторки и переплат пациентов в точных копейках без float drift.
 */

import { kopecksToRubles, sumKopecks } from "@dental/shared";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { withTenantCtx, type TenantDb } from "../../../db/rls.js";
import {
	patients,
	payments,
	treatmentItems,
	visits,
} from "../../../db/schema.js";
import {
	type Kopecks,
	rublesFromKopecks,
	toKopecks,
} from "../../../money/patientDebt.js";
import { assertKopecks } from "../../../money/patientDebtCore.js";
import type {
	ReceivablesBucket,
	ReceivablesPrepaymentRow,
	ReceivablesReport,
	ReceivablesRow,
} from "./types.js";

/**
 * Деньги в тексте для человека — всегда с копейками.
 *
 * `toLocaleString("ru-RU")` без параметров печатает 3 100,5 вместо 3 100,50:
 * в примечании к отчёту о деньгах это выглядит как другая сумма.
 *
 * ВХОД — ЦЕЛЫЕ КОПЕЙКИ, А НЕ РУБЛИ ЧИСЛОМ, и это не косметика. Пока сюда
 * принимались рубли, в примечание можно было передать результат сложения в
 * плавающей точке: `toLocaleString` с двумя знаками напечатал бы
 * `3 491,4900000000002` как «3 491,49», то есть ТИХО подтвердил бы потерю
 * точности ровно в том тексте, который бухгалтер сверяет с кассой. С копейками
 * на входе передать сюда грязь физически нечем: `rublesFromKopecks` принимает
 * только целое число копеек и на нецелом бросает `MoneyPrecisionError`.
 */
function rubToKopeckText(kopecks: Kopecks): string {
	return kopecksToRubles(kopecks).toLocaleString("ru-RU", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

/**
 * Дебиторка: кто и сколько не доплатил — и кто переплатил.
 *
 * Долг = назначено минус оплачено, как это считает db/domainStateHydration.ts.
 * Считается на дату отчёта, а не за период: долг не «возникает в марте», он
 * просто есть. Срок определяется по самой ранней неоплаченной позиции; позиции
 * без визита датировать нечем — они попадают в отдельную корзину, а не
 * приписываются к «текущим».
 *
 * ПОЧЕМУ ЗДЕСЬ ПОЯВИЛИСЬ ПЕРЕПЛАТЫ. Отрицательный долг этот отчёт отбрасывал
 * фильтром `debtRub >= minDebtRub`, и переплативший пациент просто исчезал из
 * всех отчётов. При этом главный экран (`buildBillingSummary`, sampleData.ts)
 * вычитает оплаченное из назначенного ПО ВСЕЙ КЛИНИКЕ одним действием, то есть
 * чужая переплата молча уменьшает чей-то долг. Так и появилось расхождение,
 * измерено на живой базе: 51 400 ₽ на главном экране против 53 000 ₽ в
 * дебиторке — разница ровно в двух переплатах по 800 ₽. Ни один экран не
 * говорил, что клиника должна двум людям деньги.
 *
 * Проверено повторно сквозным прогоном (tests/routes/chainWeldProof.ts): оплата
 * 1 500,50 ₽ пациенту без назначенного лечения уменьшила долг всей клиники на
 * главном экране и не изменила дебиторку.
 *
 * Способ подсчёта долга здесь НЕ менялся: `totalDebtRub` и корзины считаются
 * прежним выражением, иначе разошлись бы ещё сильнее. Добавлено недостающее
 * понятие — переплата отдельным числом, с которым числа двух экранов сходятся:
 * долг − переплаты = сумма, которую показывает главный экран.
 *
 * Переплаты берутся по ОБЪЕДИНЕНИЮ пациентов из позиций лечения и из платежей:
 * пациент, заплативший вперёд до любых назначений, в позициях лечения не
 * встречается вовсе, и по одной таблице его переплату не увидеть.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ГДЕ ЭТОТ КАНОН ТЕРЯЛ КОПЕЙКИ — В СТРОКЕ, А НЕ В ФОРМУЛЕ (замер 2026-07-29)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Формула была права, а РЕЗУЛЬТАТ дособирался в JavaScript плавающей точкой:
 *
 *     debtRub: Number(planned) - paid        // 41300.99 − 14800
 *
 * На живой демо-клинике `d0000000-…-d001` это давало в СТРОКЕ отчёта
 * `26500.989999999998` вместо `26500.99` — измерено через маршрут
 * `/api/reports/receivables`, не выведено. Итог при этом округлялся отдельным
 * `Math.round(value * 100) / 100` и печатался чистым (`53 001,49`), то есть
 * строка отчёта и его итог были посчитаны РАЗНОЙ арифметикой.
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. Третий знак после запятой не проходит
 * `moneyRubSchema` (`packages/shared/src/tests/money-contract-kopecks.test.ts`),
 * а колонка `numeric(12,2)` его молча обрежет: сумма, названная пациенту по
 * телефону, и сумма, попавшая в базу, расходятся, и объяснить расхождение
 * нечем — в отчёте оно не видно, потому что итог округлён, а строка нет.
 * Корзина (`byBucket`) не округлялась ВООВСЕ и копила те же грязные значения;
 * сегодня её сумма вышла чистой случайно (`26500.989999999998 + 26500.5`
 * попало ровно в `53001.49`), при другом наборе строк она отдала бы хвост.
 *
 * ЧТО ИСПРАВЛЕНО И ПОЧЕМУ ИМЕННО ТАК. Арифметика НЕ переехала в JavaScript:
 * умножение на количество, вычитание скидки, зажим в ноль и суммирование по
 * пациенту по-прежнему делает PostgreSQL точным `numeric` — в запросах ниже не
 * изменён ни один символ. Изменено то, что делается с ЕГО ответом:
 *
 *  1. Сумма переводится в ЦЕЛЫЕ КОПЕЙКИ при первом касании (`toKopecks` из
 *     `money/patientDebt.ts`), и до самой границы контракта деньги живут целыми
 *     числами: вычитание, отбор по порогу, сортировка, корзины, итог.
 *     `2650099` копеек — это ровно 26 500,99 ₽, потерять копейку в целых нечем.
 *  2. `Math.round(value * 100) / 100` удалён отовсюду. Он не «округляет до
 *     копейки», а МОЛЧА ПРИНИМАЕТ `3491.4900000000002` за `3491.49`, то есть
 *     подписывается за чужую потерю точности. `toKopecks` на таком значении
 *     бросает `MoneyPrecisionError` (422) — отказ громкий, а не тихий.
 *  3. В рубли числом переводится только то, что уходит в ответ
 *     (`rublesFromKopecks`), потому что контракт объявлен `number`. Складывать
 *     эти числа обратно нельзя — имя функции для этого и выбрано так, чтобы
 *     любое такое сложение было видно в диффе.
 *
 * ПОЧЕМУ ВЫЧИТАНИЕ НЕ ОТДАНО POSTGRESQL ОДНИМ `full outer join`. Оно бы
 * закрыло ОДНУ строку из трёх мест потери: корзины и итог всё равно
 * складываются в JavaScript — корзина зависит от `now` и от календарной
 * арифметики, а порог отбора применяется после. Значит целые копейки в
 * JavaScript обязательны в любом случае, а как только они целые, вычитание в
 * них уже точное, и второй запрос не покупает ничего. Против него — цена:
 * канон стоит под 22 проверками маршрута, а соединение двух агрегатов в
 * построителе запросов — ровно та конструкция, на которой этот файл уже терял
 * отчёты в 500 (имя пояса уходило параметром, и одно выражение получало разные
 * номера в SELECT и GROUP BY). Точную часть PostgreSQL и так уже делает; дефект
 * был в том, что JavaScript выбрасывал её точность следующей же строкой.
 *
 * ПОЧЕМУ ЭТО НЕ ДЕСЯТАЯ ФОРМУЛА ДОЛГА. Формула та же — «назначено минус
 * оплачено» на пациенте. Аппарат копеек взят готовым из `money/patientDebt.ts`
 * (`toKopecks`, `rublesFromKopecks`) и `packages/shared` (`sumKopecks`); своего
 * разбора денег, своего округления и своей печати сумм здесь нет.
 */
export async function receivables(
	organizationId: string,
	options: {
		readonly now?: Date;
		readonly minDebtRub?: number;
		readonly limit?: number;
	} = {},
	executor?: TenantDb,
): Promise<ReceivablesReport> {
	const runQuery = async (tx: TenantDb): Promise<ReceivablesReport> => {
		const now = options.now ?? new Date();
		const minDebtKopecks = toKopecks(
			Math.max(1, options.minDebtRub ?? 1),
			"порог долга",
		);
		const limit = Math.max(1, Math.min(1000, options.limit ?? 200));

		const unitKopSql = sql`case when ${treatmentItems.unitPriceKopecks} is not null and ${treatmentItems.unitPriceKopecks} <> 0 then ${treatmentItems.unitPriceKopecks}::bigint else round(coalesce(${treatmentItems.unitPriceRub}, 0)::numeric * 100)::bigint end`;
		const discountKopSql = sql`case when ${treatmentItems.discountKopecks} is not null and ${treatmentItems.discountKopecks} <> 0 then ${treatmentItems.discountKopecks}::bigint else round(coalesce(${treatmentItems.discountRub}, 0)::numeric * 100)::bigint end`;
		const itemNetKopSql = sql`greatest(0::bigint, round((${unitKopSql})::numeric * coalesce(${treatmentItems.quantity}, 0)::numeric)::bigint - (${discountKopSql}))`;

		const plannedRows = await tx
			.select({
				patientId: treatmentItems.patientId,
				plannedKopecks: sql<string>`coalesce(sum(${itemNetKopSql}), 0)::bigint`,
				oldestChargeAt: sql<Date | string | null>`min(${visits.createdAt})`,
				undatedItems: sql<number>`count(*) filter (where ${visits.createdAt} is null)::int`,
			})
			.from(treatmentItems)
			.leftJoin(visits, eq(treatmentItems.visitId, visits.id))
			.where(
				and(
					eq(treatmentItems.organizationId, organizationId),
					ne(treatmentItems.status, "cancelled"),
				),
			)
			.groupBy(treatmentItems.patientId);

		const plannedByPatient = new Map<
			string,
			{ plannedKopecks: number; oldestChargeAt: Date | null; undatedItems: number }
		>();
		for (const row of plannedRows) {
			const plannedKopecks = Number(row.plannedKopecks ?? 0);
			assertKopecks(plannedKopecks, "назначено пациенту");
			plannedByPatient.set(row.patientId, {
				plannedKopecks,
				oldestChargeAt: row.oldestChargeAt ? new Date(row.oldestChargeAt) : null,
				undatedItems: Number(row.undatedItems ?? 0),
			});
		}

		const rawPaymentKopSql = sql`case when ${payments.amountKopecks} is not null and ${payments.amountKopecks} <> 0 then ${payments.amountKopecks}::bigint else round(coalesce(${payments.amountRub}, 0)::numeric * 100)::bigint end`;
		const explicitRefundMetaSql = sql`(
			lower(coalesce(${payments.fiscalReceipt}->>'operationType', '')) in ('refund', 'income_return', 'advance_refund', 'return', 'refund_correction')
			or lower(coalesce(${payments.fiscalReceipt}->>'type', '')) in ('refund', 'income_return', 'advance_refund', 'return', 'refund_correction')
		)`;
		const personalAdvanceOffsetSql = sql`(
			lower(coalesce(${payments.fiscalReceipt}->>'isPersonalAdvanceOffset', 'false')) = 'true'
			or lower(coalesce(${payments.fiscalReceipt}->>'calculationMethod', '')) = 'advance_offset'
		)`;
		const signedLedgerPaymentKopSql = sql<string>`coalesce(sum(case
			when (${explicitRefundMetaSql} or (${rawPaymentKopSql}) < 0) then -abs(${rawPaymentKopSql})::bigint
			when ${payments.status} = 'refunded' then 0::bigint
			when ${personalAdvanceOffsetSql} then 0::bigint
			else abs(${rawPaymentKopSql})::bigint
		end), 0)::bigint`;

		const paidRows = await tx
			.select({
				patientId: payments.patientId,
				paidKopecks: signedLedgerPaymentKopSql,
			})
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, organizationId),
					inArray(payments.status, ["paid", "refunded"]),
					sql`(${payments.documentId} is null or not exists (select 1 from patient_invoices pi where pi.id = ${payments.documentId} and pi.organization_id = ${organizationId} and pi.status in ('voided', 'cancelled')))`,
				),
			)
			.groupBy(payments.patientId);

		const paidByPatient = new Map<string, number>();
		for (const row of paidRows) {
			const totalKop = Number(row.paidKopecks ?? 0);
			if (totalKop === 0) continue;
			assertKopecks(totalKop, "оплачено пациентом");
			paidByPatient.set(row.patientId, totalKop);
		}

		const balances = [
			...new Set<string>([...plannedByPatient.keys(), ...paidByPatient.keys()]),
		].map((patientId) => {
			const planned = plannedByPatient.get(patientId);
			const oldestChargeAt = planned?.oldestChargeAt ?? null;
			const plannedKopecks = planned?.plannedKopecks ?? 0;
			if (planned !== undefined) {
				assertKopecks(plannedKopecks, "назначено пациенту");
			}
			return {
				patientId,
				debtKopecks: plannedKopecks - (paidByPatient.get(patientId) ?? 0),
				oldestChargeAt,
				hasUndated: (planned?.undatedItems ?? 0) > 0,
			};
		});

		const debtors = balances
			.filter((row) => row.debtKopecks >= minDebtKopecks)
			.sort((left, right) => right.debtKopecks - left.debtKopecks)
			.slice(0, limit);

		const overpaid = balances
			.filter((row) => -row.debtKopecks >= minDebtKopecks)
			.sort((left, right) => left.debtKopecks - right.debtKopecks)
			.slice(0, limit);

		const totalPrepaidKopecks = sumKopecks(
			overpaid.map((row) => -row.debtKopecks),
		);

		if (debtors.length === 0 && overpaid.length === 0) {
			return {
				rows: [],
				totalDebtRub: 0,
				byBucket: {
					current: 0,
					up_to_30: 0,
					up_to_90: 0,
					over_90: 0,
					undated: 0,
				},
				prepayments: [],
				totalPrepaidRub: 0,
				note: "Долгов нет, переплат тоже нет.",
				isEmpty: true,
			};
		}

		const neededPatientIds = Array.from(
			new Set<string>([
				...debtors.map((d) => d.patientId),
				...overpaid.map((o) => o.patientId),
			]),
		);
		const names = new Map<string, string>();
		if (neededPatientIds.length > 0) {
			const nameRows = await tx
				.select({ id: patients.id, fullName: patients.fullName })
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, organizationId),
						inArray(patients.id, neededPatientIds),
					),
				);
			for (const row of nameRows) names.set(row.id, row.fullName);
		}

		const byBucketKopecks: Record<ReceivablesBucket, Kopecks> = {
			current: 0,
			up_to_30: 0,
			up_to_90: 0,
			over_90: 0,
			undated: 0,
		};

		const rows: ReceivablesRow[] = debtors.map((row) => {
			let bucket: ReceivablesBucket;
			if (!row.oldestChargeAt) {
				bucket = "undated";
			} else {
				const ageDays = Math.floor(
					(now.getTime() - row.oldestChargeAt.getTime()) / 86_400_000,
				);
				bucket =
					ageDays <= 7
						? "current"
						: ageDays <= 30
							? "up_to_30"
							: ageDays <= 90
								? "up_to_90"
								: "over_90";
			}
			byBucketKopecks[bucket] += row.debtKopecks;

			return {
				patientId: row.patientId,
				patientName: names.get(row.patientId) ?? "Пациент вне картотеки",
				debtRub: rublesFromKopecks(row.debtKopecks),
				oldestChargeAt: row.oldestChargeAt
					? row.oldestChargeAt.toISOString()
					: null,
				bucket,
			};
		});

		const prepayments: ReceivablesPrepaymentRow[] = overpaid.map((row) => ({
			patientId: row.patientId,
			patientName: names.get(row.patientId) ?? "Пациент вне картотеки",
			prepaidRub: rublesFromKopecks(-row.debtKopecks),
		}));

		const totalDebtKopecks = sumKopecks(debtors.map((row) => row.debtKopecks));
		const byBucket: Record<ReceivablesBucket, number> = {
			current: rublesFromKopecks(byBucketKopecks.current),
			up_to_30: rublesFromKopecks(byBucketKopecks.up_to_30),
			up_to_90: rublesFromKopecks(byBucketKopecks.up_to_90),
			over_90: rublesFromKopecks(byBucketKopecks.over_90),
			undated: rublesFromKopecks(byBucketKopecks.undated),
		};

		return {
			rows,
			totalDebtRub: rublesFromKopecks(totalDebtKopecks),
			byBucket,
			prepayments,
			totalPrepaidRub: rublesFromKopecks(totalPrepaidKopecks),
			note:
				"Долг = назначено минус оплачено, на дату отчёта. Срок — по самой ранней позиции лечения; " +
				"позиции без привязки к приёму датировать нечем, они в отдельной корзине. " +
				(totalPrepaidKopecks > 0
					? `Переплаты показаны отдельно: клиника должна вернуть ${rubToKopeckText(totalPrepaidKopecks)} ₽ ` +
						`${prepayments.length} пациент(ам). На главном экране сумма к оплате считается по всей клинике одним ` +
						`вычитанием, поэтому там переплаты уже зачтены в долг других пациентов: ` +
						`${rubToKopeckText(totalDebtKopecks)} − ${rubToKopeckText(totalPrepaidKopecks)} = ` +
						`${rubToKopeckText(totalDebtKopecks - totalPrepaidKopecks)} ₽.`
					: "Переплат нет: ни один пациент не заплатил больше назначенного."),
			isEmpty: false,
		};
	};

	if (executor) return runQuery(executor);
	return withTenantCtx(organizationId, runQuery);
}
