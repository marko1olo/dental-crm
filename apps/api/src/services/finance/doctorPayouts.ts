/**
 * Выплаты врачам: сколько врач заработал клинике, сколько удержано за материалы
 * и сколько ему причитается.
 *
 * ЗАЧЕМ ЭТОТ ФАЙЛ
 * Расчёта зарплаты врача в системе не было вовсе. Два экрана обещали его
 * (`apps/web/src/pages/FinancialDashboard.tsx` и `DoctorPayoutDashboard.tsx`),
 * но оба недостижимы из интерфейса, а второй зовёт адрес, которого на сервере не
 * существовало. То есть владелец клиники считал выплаты в тетради, хотя данные
 * для расчёта в базе уже пишутся живым потоком.
 *
 * ЕДИНСТВЕННАЯ СВЯЗЬ ДЕНЕГ С ВРАЧОМ
 * В таблице `payments` колонки врача НЕТ. Врач достаётся только цепочкой
 * `payments.visit_id → visits.appointment_id → appointments.doctor_user_id`.
 * Это не догадка: ровно этой цепочкой уже пользуется рабочий отчёт
 * `services/reports/managerReports.ts` (doctorPerformance), и другой связи в
 * схеме не существует.
 *
 * ПРАВИЛА, КОТОРЫЕ ЗДЕСЬ НЕЛЬЗЯ НАРУШАТЬ
 *
 * 1. Ставка читается ТОЛЬКО из `doctor_commissions.commission_pct` и ТОЛЬКО по
 *    `user_id`. В таблице есть ещё `commission_percent` (живой DEFAULT '25') и
 *    `doctor_id`. Их не пишет ни один писатель в рабочем коде: `routes/diary.ts`
 *    и `routes/workspaceProfile.ts` пишут `user_id` + `commission_pct`. Чтение
 *    `commission_percent` заплатило бы 25 % там, где клиника назначила 30 %, —
 *    без ошибки и без расхождения в логах. Соединение по `doctor_id` дало бы
 *    пустоту всегда.
 *
 * 2. Если ставки нет — выплата НЕ считается. 30 % из `diary.ts` — это значение,
 *    которое код подставляет при СОЗДАНИИ строки, а не факт о договорённости с
 *    врачом. Тихая цифра по чужому предположению — это выдуманная зарплата.
 *
 * 3. Порядок операций: процент начисляется от кассы, и только потом из
 *    начисленного вычитается доля себестоимости материалов. Обратный порядок
 *    `(касса − материалы) × ставка` даёт другое число и означает другую
 *    договорённость с врачом. Основание именно для этого порядка:
 *    `doctor_commissions` держит ДВА независимых процента, и второй
 *    (`material_cost_deduction_pct`) осмыслен только как доля ОТ СЕБЕСТОИМОСТИ.
 *    ДОЛГ: договорённости клиники в коде нет, продуктовое решение за ведущим.
 *
 * 4. Выплата может быть ОТРИЦАТЕЛЬНОЙ — материалы дороже начисленного процента.
 *    Обнулять нельзя: это долг врача клинике, и спрятав его, клиника теряет
 *    деньги.
 *
 * 5. Ноль в колонке материалов и отсутствие списаний — РАЗНЫЕ вещи. Поэтому
 *    рядом с суммой всегда идёт число строк списания и число строк без цены:
 *    иначе «0,00 ₽» прочитают как «материалов не расходовали», а не как «мы это
 *    не считаем», и клиника молча переплатит врачу.
 *
 * 6. Деньги — точно до копейки, через decimal.js. Умножение на процент в
 *    двоичном float даёт расхождение в копейку на суммах вида 23 400,55 × 30 %,
 *    а зарплата и налоговые документы копейку не прощают.
 */

import { Decimal } from "decimal.js";
import { and, eq, gte, isNotNull, lte, or, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	appointments,
	doctorCommissions,
	inventoryTransactions,
	payments,
	users,
	visits,
} from "../../db/schema.js";
import { currentMonthPeriod, type ReportPeriod } from "../reports/managerReports.js";
import { withTenantCtx, withSuperuserBypass } from "../../db/rls.js";

/**
 * Период по умолчанию берётся из отчётов руководителю, а не объявляется здесь
 * заново: «текущий месяц» должен быть одним и тем же и в отчёте по врачам, и в
 * выплатах, иначе два экрана покажут разные суммы за один и тот же месяц.
 */
export { currentMonthPeriod };

/**
 * Предел ширины периода — тот же, что у отчётов руководителю
 * (`routes/reports.ts`). Слишком широкий диапазон отклоняется, а не обрезается
 * молча: расчёт «за всё время», выданный за расчёт «за год», хуже отказа —
 * по нему заплатят зарплату.
 */
export const MAX_PAYOUT_PERIOD_DAYS = 400;

export type ResolvedPayoutPeriod =
	| { readonly ok: true; readonly from: Date; readonly to: Date }
	| { readonly ok: false; readonly message: string };

/**
 * Период расчёта из параметров запроса. Умолчание — текущий месяц целиком:
 * зарплату считают раз в месяц.
 */
export function resolvePayoutPeriod(
	input: { readonly from?: string | undefined; readonly to?: string | undefined },
	now = new Date(),
	/**
	 * Часовой пояс клиники. Без него границы месяца считались в поясе СЕРВЕРНОГО
	 * процесса: зарплату за месяц клиника получала с чужими границами, и приёмы
	 * последнего вечера уезжали в следующий расчётный период либо считались
	 * дважды. Зарплату считают раз в месяц, поэтому ошибка границы — это не
	 * копейки, а целая смена.
	 *
	 * Необязателен: без него поведение прежнее, ни один вызывающий не ломается,
	 * а отсутствие пояса означает «неизвестно», а не «подставить московский».
	 */
	timeZone?: string | null,
): ResolvedPayoutPeriod {
	const fallback = currentMonthPeriod(now, timeZone);
	const from = input.from ? new Date(input.from) : fallback.from;
	const to = input.to ? new Date(input.to) : fallback.to;

	if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
		return {
			ok: false,
			message: "Даты периода не разобраны. Передайте начало и конец периода в формате даты со временем.",
		};
	}
	if (from.getTime() > to.getTime()) {
		return { ok: false, message: "Начало периода позже его конца. Поменяйте даты местами." };
	}
	const spanDays = (to.getTime() - from.getTime()) / 86_400_000;
	if (spanDays > MAX_PAYOUT_PERIOD_DAYS) {
		return {
			ok: false,
			message:
				`Период длиннее ${MAX_PAYOUT_PERIOD_DAYS} дней, а зарплату считают за месяц. ` +
				"Сузьте диапазон: широкий период смешает несколько зарплатных периодов в одну сумму.",
		};
	}
	return { ok: true, from, to };
}

export type DoctorPayoutScope = ReportPeriod & {
	readonly organizationId: string;
	/**
	 * Врач, которому разрешено видеть только свои выплаты (право
	 * `payroll.read.own`). Фильтр применяется в SQL, а не после выборки: строки
	 * чужой зарплаты не должны покидать базу вовсе.
	 */
	readonly onlyDoctorUserId?: string | null;
};

/** Состояние расчёта по врачу. Ни одно из значений не подменяет другое. */
export type DoctorPayoutState =
	/** Ставка есть, выплата посчитана. */
	| "computed"
	/** Ставки нет ни одной активной строки — считать не из чего. */
	| "rate_missing"
	/** Ставка в базе есть, но её значение непригодно для расчёта. */
	| "rate_invalid"
	/** Есть списания материалов, но процент удержания не задан. */
	| "material_policy_missing";

/** Что известно про себестоимость материалов врача за период. */
export type DoctorPayoutMaterialsState =
	/** Списания есть, у всех указана цена. */
	| "counted"
	/** Списаний по оплаченным визитам нет вовсе — удерживать нечего. */
	| "no_movements"
	/** Списания есть, но часть без цены или без количества: себестоимость занижена. */
	| "cost_missing";

export type DoctorPayoutRow = {
	readonly doctorUserId: string;
	readonly doctorName: string;
	readonly role: string;
	/** Сотрудник уволен/отключён, но заработанное за период у него остаётся. */
	readonly isActive: boolean;

	/** Фактически полученные деньги: только платежи `paid` за период. */
	readonly revenueRub: number;
	readonly paymentCount: number;

	/** Себестоимость материалов по тем же визитам, чьи оплаты попали в период. */
	readonly materialCostRub: number;
	readonly materialMovements: number;
	/** Списания без цены или без количества: они не удорожают себестоимость. */
	readonly materialMovementsUnpriced: number;
	readonly materialsState: DoctorPayoutMaterialsState;

	/** Ставка: `commission_pct`, ничто иное. null — строки ставки нет. */
	readonly commissionPct: number | null;
	readonly materialDeductionPct: number | null;
	readonly rateEffectiveFrom: string | null;
	/** Сколько активных ставок нашлось: уникальности в БД нет, взята свежая. */
	readonly rateRowCount: number;

	readonly state: DoctorPayoutState;
	readonly accruedRub: number | null;
	readonly withheldMaterialRub: number | null;
	readonly payoutRub: number | null;

	/** Причина и действие человеческим языком — для показа как есть. */
	readonly note: string;
};

export type DoctorPayoutTotals = {
	/** Вся касса периода, включая то, что не отнесено ни к одному врачу. */
	readonly revenueRub: number;
	readonly paymentCount: number;
	/** Касса, дошедшая до врача по цепочке визит → приём. */
	readonly attributableRevenueRub: number;
	/** Касса без врача: платёж без визита или визит без приёма. */
	readonly unattributedRevenueRub: number;
	readonly materialCostRub: number;
	/** Итоги считаются ТОЛЬКО по врачам, у которых ставка задана. */
	readonly accruedRub: number;
	readonly withheldMaterialRub: number;
	readonly payoutRub: number;
	readonly doctorsCounted: number;
	readonly doctorsWithoutRate: number;
};

export type DoctorPayoutReport = {
	readonly period: { readonly from: string; readonly to: string };
	readonly rows: DoctorPayoutRow[];
	readonly totals: DoctorPayoutTotals;
	/** Как именно посчитано — обязательно к показу рядом с суммами. */
	readonly methodNote: string;
	/** Чего расчёт не умеет. Пустой массив означает «ограничений нет». */
	readonly limitations: string[];
	readonly isEmpty: boolean;
};

// ─── Формула. Чистые функции, ни одного обращения к базе ─────────────────────

/** Копейки: округление половины вверх, как в бухгалтерии. */
function roundMoney(value: Decimal): number {
	return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

/** Процент от суммы, округлённый до копейки. */
export function percentOfMoney(amountRub: number, percent: number): number {
	return roundMoney(new Decimal(amountRub).times(percent).div(100));
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

export type PayoutFormulaInput = {
	readonly revenueRub: number;
	readonly materialCostRub: number;
	readonly materialMovements: number;
	readonly commissionPct: number | null;
	readonly materialDeductionPct: number | null;
};

export type PayoutFormulaResult = {
	readonly state: DoctorPayoutState;
	readonly accruedRub: number | null;
	readonly withheldMaterialRub: number | null;
	readonly payoutRub: number | null;
};

/**
 * Выплата врачу за период.
 *
 * Начислено = касса × ставка. Удержано = себестоимость материалов × процент
 * удержания. Выплата = начислено − удержано, со знаком.
 */
export function computeDoctorPayout(input: PayoutFormulaInput): PayoutFormulaResult {
	if (input.commissionPct === null) {
		return { state: "rate_missing", accruedRub: null, withheldMaterialRub: null, payoutRub: null };
	}
	if (!isUsablePercent(input.commissionPct)) {
		return { state: "rate_invalid", accruedRub: null, withheldMaterialRub: null, payoutRub: null };
	}

	const accruedRub = percentOfMoney(input.revenueRub, input.commissionPct);

	// Списаний нет — удерживать нечего, и это не то же самое, что «процент
	// удержания не задан»: результат одинаков, но причина разная, и она уходит
	// в текст строки.
	if (input.materialMovements === 0 || input.materialCostRub === 0) {
		return {
			state: "computed",
			accruedRub,
			withheldMaterialRub: 0,
			payoutRub: accruedRub,
		};
	}

	if (!isUsablePercent(input.materialDeductionPct)) {
		// Себестоимость есть, а доля удержания неизвестна. Подставить 0 значит
		// выплатить врачу материалы клиники; подставить 100 — удержать то, о чём
		// не договаривались. Показываем начисленное и отказываемся от итога.
		return {
			state: "material_policy_missing",
			accruedRub,
			withheldMaterialRub: null,
			payoutRub: null,
		};
	}

	const withheldMaterialRub = percentOfMoney(input.materialCostRub, input.materialDeductionPct);
	return {
		state: "computed",
		accruedRub,
		withheldMaterialRub,
		payoutRub: roundMoney(new Decimal(accruedRub).minus(withheldMaterialRub)),
	};
}

/** Состояние себестоимости по числу строк списания. */
export function materialsStateOf(movements: number, unpriced: number): DoctorPayoutMaterialsState {
	if (movements === 0) return "no_movements";
	return unpriced > 0 ? "cost_missing" : "counted";
}

/**
 * Текст строки: причина и действие. Возвращается сервером, а не собирается на
 * клиенте, чтобы объяснение нельзя было потерять при вёрстке.
 */
export function payoutRowNote(input: {
	readonly state: DoctorPayoutState;
	readonly materialsState: DoctorPayoutMaterialsState;
	readonly materialMovementsUnpriced: number;
	readonly commissionPct: number | null;
	readonly rateRowCount: number;
	readonly payoutRub: number | null;
	readonly revenueRub: number;
}): string {
	const parts: string[] = [];

	switch (input.state) {
		case "rate_missing":
			parts.push(
				"Ставка врача не задана, поэтому сумму к выплате считать не из чего. " +
					"Задайте процент врача — до этого показана только касса за период.",
			);
			break;
		case "rate_invalid":
			parts.push(
				`Ставка врача в базе непригодна для расчёта: ${input.commissionPct ?? "—"} %. ` +
					"Процент должен быть от 0 до 100. Исправьте ставку: по такому значению зарплата вышла бы неверной.",
			);
			break;
		case "material_policy_missing":
			parts.push(
				"Процент удержания за материалы не задан, а списания по оплаченным визитам есть. " +
					"Начислено показано, итог к выплате — нет: без процента удержания он был бы либо " +
					"выплатой материалов клиники врачу, либо удержанием, о котором не договаривались.",
			);
			break;
		case "computed":
			parts.push("Начислено процентом от кассы, затем удержана доля себестоимости материалов.");
			break;
	}

	if (input.state !== "rate_missing" && input.state !== "rate_invalid") {
		if (input.materialsState === "no_movements") {
			parts.push(
				"Списаний материалов по оплаченным визитам нет — удерживать нечего. " +
					"Если материалы расходовались, включите их списание при подписании приёма: " +
					"иначе себестоимость в зарплату не попадёт.",
			);
		} else if (input.materialsState === "cost_missing") {
			parts.push(
				`Списаний без цены или без количества: ${input.materialMovementsUnpriced}. ` +
					"Себестоимость занижена, значит удержание меньше настоящего. Проставьте цену позиций склада.",
			);
		}
	}

	if (input.state === "computed" && input.payoutRub !== null && input.payoutRub < 0) {
		parts.push(
			"Выплата отрицательная: материалы дороже начисленного процента. " +
				"Это долг врача клинике, а не ноль — обнулять его нельзя.",
		);
	}

	if (input.revenueRub === 0) {
		parts.push(
			"Кассы за период нет: оплаты по приёмам этого врача не проходили либо оплата не привязана к приёму.",
		);
	}

	if (input.rateRowCount > 1) {
		parts.push(
			`Активных ставок у врача найдено ${input.rateRowCount}; взята самая свежая по дате начала действия. ` +
				"Уникальности в базе нет — лишние ставки лучше отключить, чтобы расчёт не зависел от порядка строк.",
		);
	}

	return parts.join(" ");
}

// ─── Запрос. Один агрегат на всех врачей, без цикла по врачам ────────────────

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
    				revenueRub: sql<number>`coalesce(sum(${payments.amountRub}), 0)::numeric(12,2)`.as("revenue_rub"),
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
							coalesce(${inventoryTransactions}."unit_cost_rub", 0)
							* abs(coalesce(${inventoryTransactions}."quantity_changed", 0))
						),
						0
					)::numeric(12,2)
				`.as("material_cost_rub"),
    				movements: sql<number>`count(*)::int`.as("movements"),
    				movementsUnpriced: sql<number>`count(*) filter (
					where ${inventoryTransactions}."unit_cost_rub" is null
					   or ${inventoryTransactions}."unit_cost_rub" = 0
					   or ${inventoryTransactions}."quantity_changed" is null
					   or ${inventoryTransactions}."quantity_changed" = 0
				)::int`.as("movements_unpriced"),
    			})
    			.from(inventoryTransactions)
    			.innerJoin(paidVisits, eq(inventoryTransactions.visitId, paidVisits.visitId))
    			.innerJoin(visits, eq(inventoryTransactions.visitId, visits.id))
    			.innerJoin(appointments, eq(visits.appointmentId, appointments.id))
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
    				effectiveFrom: doctorCommissions.effectiveFrom,
    				rowNumber: sql<number>`row_number() over (
					partition by ${doctorCommissions}."user_id"
					order by ${doctorCommissions}."effective_from" desc, ${doctorCommissions}."created_at" desc
				)`.as("row_number"),
    				rateRowCount: sql<number>`(count(*) over (partition by ${doctorCommissions}."user_id"))::int`.as(
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
    			)
    	);

	const doctorFilter = scope.onlyDoctorUserId
		? and(eq(users.organizationId, organizationId), eq(users.id, scope.onlyDoctorUserId))
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
				totalRevenueRub: sql<number>`coalesce(sum(${payments.amountRub}), 0)::numeric(12,2)`.as(
					"total_revenue_rub",
				),
				totalPaymentCount: sql<number>`count(*)::int`.as("total_payment_count"),
				attributableRevenueRub: sql<number>`coalesce(
					sum(${payments.amountRub}) filter (where ${appointments.doctorUserId} is not null),
					0
				)::numeric(12,2)`.as("attributable_revenue_rub"),
			})
			.from(payments)
			.leftJoin(visits, and(eq(payments.visitId, visits.id), eq(visits.organizationId, organizationId)))
			.leftJoin(
				appointments,
				and(eq(visits.appointmentId, appointments.id), eq(appointments.organizationId, organizationId)),
			)
			.where(
				and(
					eq(payments.organizationId, organizationId),
					eq(payments.status, "paid"),
					gte(payments.paidAt, from),
					lte(payments.paidAt, to),
					scope.onlyDoctorUserId ? eq(appointments.doctorUserId, scope.onlyDoctorUserId) : undefined,
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
				revenueRub: sql<number>`coalesce(${revenue.revenueRub}, 0)::numeric(12,2)`.as("doctor_revenue_rub"),
				paymentCount: sql<number>`coalesce(${revenue.paymentCount}, 0)::int`.as("doctor_payment_count"),
				materialCostRub: sql<number>`coalesce(${materials.materialCostRub}, 0)::numeric(12,2)`.as(
					"doctor_material_cost_rub",
				),
				materialMovements: sql<number>`coalesce(${materials.movements}, 0)::int`.as("doctor_material_movements"),
				materialMovementsUnpriced: sql<number>`coalesce(${materials.movementsUnpriced}, 0)::int`.as(
					"doctor_material_movements_unpriced",
				),
				commissionPct: rateCandidates.commissionPct,
				materialDeductionPct: rateCandidates.materialDeductionPct,
				rateEffectiveFrom: rateCandidates.effectiveFrom,
				rateRowCount: sql<number>`coalesce(${rateCandidates.rateRowCount}, 0)::int`.as("doctor_rate_row_count"),
			})
			.from(users)
			.leftJoin(revenue, eq(revenue.doctorUserId, users.id))
			.leftJoin(materials, eq(materials.doctorUserId, users.id))
			// Ставка присоединяется только самой свежей строкой: остальные оставлены
			// в CTE ради счётчика rate_row_count.
			.leftJoin(rateCandidates, and(eq(rateCandidates.userId, users.id), eq(rateCandidates.rowNumber, 1)))
			.where(
				and(
					doctorFilter,
					/*
					 * В отчёт попадают врачи клиники И любой сотрудник, на которого за
					 * период пришла касса или списание материалов. Второе условие
					 * обязательно: приём может вести владелец или сотрудник с иной
					 * ролью, и его заработок нельзя потерять из-за фильтра по роли.
					 */
					or(eq(users.role, "doctor"), isNotNull(revenue.doctorUserId), isNotNull(materials.doctorUserId)),
				),
			),
	);

	return db
		.with(paidVisits, revenue, materials, rateCandidates, periodRevenue, doctorRows)
		.select({
			doctorUserId: doctorRows.doctorUserId,
			doctorName: doctorRows.doctorName,
			role: doctorRows.role,
			isActive: doctorRows.isActive,
			revenueRub: doctorRows.revenueRub,
			paymentCount: doctorRows.paymentCount,
			materialCostRub: doctorRows.materialCostRub,
			materialMovements: doctorRows.materialMovements,
			materialMovementsUnpriced: doctorRows.materialMovementsUnpriced,
			commissionPct: doctorRows.commissionPct,
			materialDeductionPct: doctorRows.materialDeductionPct,
			rateEffectiveFrom: doctorRows.rateEffectiveFrom,
			rateRowCount: doctorRows.rateRowCount,
			totalRevenueRub: periodRevenue.totalRevenueRub,
			totalPaymentCount: periodRevenue.totalPaymentCount,
			attributableRevenueRub: periodRevenue.attributableRevenueRub,
		})
		.from(periodRevenue)
		.leftJoin(doctorRows, sql`true`);
}

/**
 * Число из базы. numeric приходит то числом (разбор типов включён в
 * db/moneyTypeParsers.ts), то строкой (drizzle возвращает String для колонок
 * без mode: "number"). Обе формы нормальны; молчаливый NaN на деньгах — нет.
 */
function moneyFromDb(value: unknown, field: string): number {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	if (value === null || value === undefined) return 0;
	throw new Error(`Поле «${field}» пришло из базы в непригодном для денег виде: ${JSON.stringify(value)}`);
}

/** Процент из базы: null остаётся null, мусор — ошибка, а не тихий ноль. */
function percentFromDb(value: unknown, field: string): number | null {
	if (value === null || value === undefined) return null;
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	throw new Error(`Поле «${field}» пришло из базы в непригодном для процента виде: ${JSON.stringify(value)}`);
}

const METHOD_NOTE =
	"Касса — только платежи со статусом «оплачен», по дате оплаты в периоде. " +
	"Врач определяется по цепочке оплата → приём → врач приёма: отдельного поля врача у платежа нет. " +
	"Материалы удерживаются по тем же визитам, чья оплата вошла в период. " +
	"Порядок: сначала процент от кассы, затем вычет доли себестоимости материалов.";

/**
 * Выплаты всем врачам клиники за период.
 *
 * ОДИН ОПЕРАТОР SQL НА СТРОКИ И НА КОНТРОЛЬНУЮ СУММУ. Контрольная сумма (касса
 * периода целиком) имеет смысл только если обе половины читают ОДНО И ТО ЖЕ
 * состояние `payments`: иначе разница «касса минус сумма по врачам» уходит в
 * строку «не отнесено к врачу», и владелец видит потерянные деньги там, где их
 * не терял.
 *
 * ЗДЕСЬ БЫЛА МОЯ ОШИБКА, И ОНА ИСПРАВЛЯЕТСЯ ВМЕСТЕ С КОДОМ. В этом месте стоял
 * комментарий: «Оба запроса выполняются внутри одной транзакции … REPEATABLE
 * READ не требуется: внутри одной транзакции READ COMMITTED даёт обоим запросам
 * согласованное чтение только при условии, что между ними нет записи из этой же
 * транзакции — здесь оба запроса read-only». ЭТО НЕВЕРНО. Документация
 * PostgreSQL, 13.2.1 Read Committed Isolation Level, дословно:
 *
 *   «In effect, a SELECT query sees a snapshot of the database as of the instant
 *    the query begins to run.»
 *   «Also note that two successive SELECT commands can see different data, even
 *    though they are within a single transaction, if other transactions commit
 *    changes after the first SELECT starts and before the second SELECT starts.»
 *
 * То есть снимок берётся НА ОПЕРАТОР, а не на транзакцию, и `Promise.all` на
 * одном соединении лишь сериализует два оператора в два разных снимка. Общая
 * транзакция не давала контрольной сумме ничего: расхождение оставалось ровно
 * тем же, каким было до «починки».
 *
 * ПОЧЕМУ ОДИН ОПЕРАТОР, А НЕ REPEATABLE READ. Оба варианта закрывают дефект, и
 * REPEATABLE READ здесь не принёс бы даже ошибок сериализации: та же
 * документация, 13.2.2, говорит «Note that only updating transactions might need
 * to be retried; read-only transactions will never have serialization
 * conflicts», а оба запроса — обычные SELECT без FOR UPDATE/FOR SHARE. Но
 * поднять уровень изоляции ЗДЕСЬ НЕЧЕМ, и это не вкус, а измеримый факт:
 *   • `SET TRANSACTION` (docs, sql-set-transaction): «The transaction isolation
 *     level cannot be changed after the first query or data-modification
 *     statement … of a transaction has been executed.»
 *   • К моменту вызова транзакция уже выполнила запрос: маршруты обёрнуты
 *     транзакцией автоматически, а `withTenantCtx` (`db/rls.ts`) на входе
 *     выполняет `SELECT current_setting('app.current_tenant', true)`.
 *   Значит команда смены уровня получила бы 25001, а чтобы её принять, пришлось
 *   бы править `db/rls.ts` и `server.ts` — файлы за границей этой правки, и
 *   уровень изоляции стал бы общим для всех маршрутов ради одного отчёта.
 *
 * Один оператор даёт ту же гарантию безусловно и локально: «each SQL statement
 * sees a snapshot of data … as it was some time ago» (docs, 13.1), а для CTE —
 * «All the statements are executed with the same snapshot» (docs, 7.8.4).
 * Цена — запрос стал длиннее на два CTE; повторных попыток и обработки 40001 не
 * требуется вовсе.
 *
 * ЧТО ОСТАЛОСЬ НЕ ЗАКРЫТЫМ И ЭТО НАДО ГОВОРИТЬ ВСЛУХ: согласован СНИМОК, а не
 * бизнес-смысл. Оплата, принятая ПОСЛЕ этого оператора, в отчёт не попадёт
 * вовсе — ни в строки, ни в контрольную сумму, — и это правильно: отчёт
 * отвечает на вопрос о состоянии кассы на один момент времени.
 */
export async function doctorPayouts(scope: DoctorPayoutScope): Promise<DoctorPayoutReport> {
	const snapshotRows = await withTenantCtx(scope.organizationId, async () =>
		buildDoctorPayoutAggregateQuery(scope),
	);

	/*
	 * Контрольная сумма лежит в КАЖДОЙ строке ответа (левое соединение по `true`),
	 * поэтому читается из первой. Строк всегда минимум одна: ведущая сторона —
	 * агрегат без `group by`.
	 */
	const [snapshotHead] = snapshotRows;
	const aggregateRows = snapshotRows.filter(
		(row): row is typeof row & { doctorUserId: string; doctorName: string; role: string; isActive: boolean } =>
			row.doctorUserId !== null,
	);

	const rows: DoctorPayoutRow[] = aggregateRows.map((row) => {
		const revenueRub = moneyFromDb(row.revenueRub, "выручка врача");
		const materialCostRub = moneyFromDb(row.materialCostRub, "себестоимость материалов");
		const materialMovements = Number(row.materialMovements ?? 0);
		const materialMovementsUnpriced = Number(row.materialMovementsUnpriced ?? 0);
		const commissionPct = percentFromDb(row.commissionPct, "ставка врача (commission_pct)");
		const materialDeductionPct = percentFromDb(
			row.materialDeductionPct,
			"процент удержания за материалы (material_cost_deduction_pct)",
		);

		const computed = computeDoctorPayout({
			revenueRub,
			materialCostRub,
			materialMovements,
			commissionPct,
			materialDeductionPct,
		});
		const materialsState = materialsStateOf(materialMovements, materialMovementsUnpriced);
		const rateRowCount = Number(row.rateRowCount ?? 0);

		return {
			doctorUserId: row.doctorUserId,
			doctorName: row.doctorName,
			role: row.role,
			isActive: row.isActive,
			revenueRub,
			paymentCount: Number(row.paymentCount ?? 0),
			materialCostRub,
			materialMovements,
			materialMovementsUnpriced,
			materialsState,
			commissionPct,
			materialDeductionPct,
			rateEffectiveFrom: row.rateEffectiveFrom ? new Date(row.rateEffectiveFrom).toISOString() : null,
			rateRowCount,
			state: computed.state,
			accruedRub: computed.accruedRub,
			withheldMaterialRub: computed.withheldMaterialRub,
			payoutRub: computed.payoutRub,
			note: payoutRowNote({
				state: computed.state,
				materialsState,
				materialMovementsUnpriced,
				commissionPct,
				rateRowCount,
				payoutRub: computed.payoutRub,
				revenueRub,
			}),
		};
	});

	rows.sort(
		(left, right) => right.revenueRub - left.revenueRub || left.doctorName.localeCompare(right.doctorName, "ru"),
	);

	const totalRevenueRub = moneyFromDb(snapshotHead?.totalRevenueRub ?? 0, "касса за период");
	const attributableRevenueRub = moneyFromDb(
		snapshotHead?.attributableRevenueRub ?? 0,
		"касса, отнесённая к врачам",
	);

	let accrued = new Decimal(0);
	let withheld = new Decimal(0);
	let payout = new Decimal(0);
	let materialCost = new Decimal(0);
	let doctorsCounted = 0;
	let doctorsWithoutRate = 0;

	for (const row of rows) {
		materialCost = materialCost.plus(row.materialCostRub);
		if (row.state === "computed" && row.payoutRub !== null && row.withheldMaterialRub !== null) {
			accrued = accrued.plus(row.accruedRub ?? 0);
			withheld = withheld.plus(row.withheldMaterialRub);
			payout = payout.plus(row.payoutRub);
			doctorsCounted += 1;
		} else {
			doctorsWithoutRate += 1;
		}
	}

	const limitations: string[] = [];
	if (doctorsWithoutRate > 0) {
		limitations.push(
			`Итог к выплате посчитан по ${doctorsCounted} врач(ам) из ${rows.length}: ` +
				`у ${doctorsWithoutRate} не задана пригодная ставка. Это не ноль к выплате, а отсутствие расчёта.`,
		);
	}
	if (rows.length > 0 && rows.every((row) => row.materialMovements === 0)) {
		limitations.push(
			"Себестоимость материалов не удержана ни у одного врача: списаний по оплаченным визитам нет. " +
				"Пока склад не ведётся и материалы не списываются при подписании приёма, удерживать нечего.",
		);
	}
	if (totalRevenueRub - attributableRevenueRub > 0) {
		limitations.push(
			"Часть кассы периода не отнесена ни к одному врачу: платёж не связан с приёмом. " +
				"Чтобы деньги попадали врачу, оплату нужно оформлять из визита, созданного из записи в расписании.",
		);
	}
	limitations.push(
		"Разные проценты за терапию и ортопедию не поддержаны: ставка применяется как одна на врача. " +
			"Категория услуги у платежа в базе не хранится, привязать процент к услуге нечем.",
	);
	limitations.push(
		"Возвраты в расчёт не входят: перевод платежа в статус «возврат» в рабочем коде не выполняет никто, " +
			"и колонка возвратов была бы гарантированным нулём.",
	);

	return {
		period: { from: scope.from.toISOString(), to: scope.to.toISOString() },
		rows,
		totals: {
			revenueRub: totalRevenueRub,
			paymentCount: Number(snapshotHead?.totalPaymentCount ?? 0),
			attributableRevenueRub,
			unattributedRevenueRub: roundMoney(new Decimal(totalRevenueRub).minus(attributableRevenueRub)),
			materialCostRub: roundMoney(materialCost),
			accruedRub: roundMoney(accrued),
			withheldMaterialRub: roundMoney(withheld),
			payoutRub: roundMoney(payout),
			doctorsCounted,
			doctorsWithoutRate,
		},
		methodNote: METHOD_NOTE,
		limitations,
		isEmpty: rows.length === 0,
	};
}
