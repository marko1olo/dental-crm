import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
	appointments,
	biAnalyticsSnapshots,
	organizations,
	payments,
	treatmentPlanStatus,
	treatmentPlans,
	users,
	visitDiaries,
} from "../db/schema.js";
// Пояс клиники берётся ОДНИМ домом на проект — из отчётов руководителя. Своя
// копия `clinicTimeZone` здесь стала бы вторым источником истины о поясе, а из
// этой болезни в проекте уже выросли четыре разных расчёта долга.
import {
	clinicTimeZone,
	inClinicZone,
	postgresKnowsTimeZone,
} from "./reports/managerReports.js";

/**
 * ЕДИНИЦА И ОТБОР ВЫРУЧКИ.
 *
 * payments."amount_rub" — колонка integer в ЦЕЛЫХ РУБЛЯХ. Раньше здесь стояло
 * `sum(CAST(amount_rub AS float) / 100)`: значение делилось на 100, как будто в
 * колонке копейки, и выручка каждого врача занижалась в сто раз. Плюс приведение
 * к float пускало деньги через двоичную дробь без нужды — сумма целых точна сама.
 * Правильную конвенцию задаёт routes/analytics.ts: `sum(amount_rub)` без деления.
 *
 * Отбирать нужно только оплаченные платежи. Без фильтра в выручку попадают
 * planned (деньги ещё не получены — в этом статусе, например, лежат пополнения
 * семейного кошелька), а также возвраты и аннулированные. Ровно эту ошибку уже
 * исправляли в routes/analytics.ts, здесь она осталась.
 */
const PAID_PAYMENTS_ONLY = eq(payments.status, "paid");

/**
 * Корзина выручки: месяц по часам клиники и сумма ОПЛАЧЕННЫХ платежей за него.
 *
 * ГОРИЗОНТОВ «Month 3 / 6 / 12» ЗДЕСЬ БОЛЬШЕ НЕТ, И ЭТО НЕ ПОТЕРЯ ДАННЫХ.
 * Они не считались никогда — они домножались:
 *
 *     "Month 3":  (r.total || 0) * 1.5,
 *     "Month 6":  (r.total || 0) * 2,
 *     "Month 12": (r.total || 0) * 3,
 *
 * Множители 1.5 / 2 / 3 не выведены ни из одной строки базы: это выдуманные
 * числа, запрещённые правилом «Zero Mocks» из `.agents/AGENTS.md`. Цена именно у
 * `Month 12` наибольшая, потому что ЭКРАН ЧИТАЕТ РОВНО ЭТО ПОЛЕ и подписывает
 * его словами: `AnalyticsDashboardView.tsx:388` рисует область
 * `dataKey="Month 12"` с подписью «За год», а заголовок виджета обещает «сколько
 * денег она принесла за год — то есть LTV». То есть месячная выручка,
 * умноженная на три, предъявлялась владельцу клиники как измеренная годовая, и
 * ошибка была ровно втрое — в сторону завышения. По такому числу решают, сколько
 * тратить на рекламу.
 *
 * ПОЧЕМУ ГОРИЗОНТЫ НЕЛЬЗЯ ПОСЧИТАТЬ ИМЕННО ЗДЕСЬ. Корзина этого запроса — месяц,
 * В КОТОРОМ ПРИШЛИ ДЕНЬГИ, а не месяц регистрации пациента (это зафиксировано
 * проверкой `tests/analyticsCohortTimeZone.test.ts`, и менять ось запроса она
 * запрещает). «Месяц N с момента регистрации» — другая ось, и по этой выборке она
 * не восстанавливается: в ней нет даты регистрации плательщика. Поэтому величина
 * ОТСУТСТВУЕТ, а не заполняется множителем: отсутствующее видно — экран покажет
 * «За год» без данных, — а выдуманное владелец примет за правду. Тот же выбор уже
 * сделан на живом маршруте `routes/analytics.ts:213-218` (`void m1;`), где
 * «выручка первого месяца = 40 % от общей» была снята как константа, а не расчёт.
 *
 * `Month 1` остаётся: это единственная величина, которая здесь ИЗМЕРЕНА, — сумма
 * оплаченных платежей корзины, без множителей.
 */
export interface CohortRevenuePoint {
	readonly cohort: string;
	readonly "Month 1": number;
}

/**
 * МЕСЯЦ КОГОРТЫ СЧИТАЛСЯ В ПОЯСЕ СЕССИИ POSTGRESQL, А НЕ КЛИНИКИ.
 *
 * `to_char(created_at, …)` для колонки с часовым поясом печатает месяц по поясу
 * СЕССИИ. У всех российских поясов смещение положительное, поэтому день в поясе
 * сессии ОТСТАЁТ от местного каждую ночь: в Самаре (пояс клиники по умолчанию в
 * схеме) до 04:00, на Камчатке половину суток. Платёж, принятый вечером
 * последнего дня месяца, уезжал в СЛЕДУЮЩИЙ месяц вместе со своей суммой.
 *
 * ИЗМЕРЕНО на живой базе: момент 30 июня 2026 23:30 по часам клиники
 * (Europe/Moscow) при поясе сессии Europe/Samara даёт `Jul`, в поясе клиники —
 * `Jun`. Пояс режет и ГРУППИРОВКУ, а не только ярлык: два платежа (30 июня
 * 23:30 и 1 июля 10:00 по Москве) в поясе сессии дают ОДНУ корзину из двух
 * строк, в поясе клиники — две по одной.
 *
 * ЗАПРОС РАЗБИТ ПО ОРГАНИЗАЦИЯМ, и это не дробление ради дробления. Пояс —
 * свойство КЛИНИКИ, у каждой свой; одним запросом на все организации месяц
 * нельзя нарезать правильно сразу для всех, потому что резать надо разными
 * поясами. Организаций в этой базе единицы, а задача фоновая и раз в час,
 * поэтому цена запроса на организацию несущественна. Заодно исчез фильтр
 * `if (!r.organizationId) continue` — организация теперь в условии запроса.
 *
 * ЯРЛЫК СТАЛ `YYYY-MM` ВМЕСТО `Mon`, потому что `Mon` — сломанный КЛЮЧ
 * ГРУППИРОВКИ, а не только вопрос языка: в нём нет года, поэтому июль 2025 и
 * июль 2026 складывались в одну корзину «Jul» и выручка двух разных когорт
 * суммировалась. Формат `YYYY-MM` — тот же, что уже отдают два других счётчика
 * когорт (routes/analytics.ts и scripts/cronAnalyticsWorker.ts), так что три
 * места наконец согласованы. Побочно уходит и дефект речи: `to_char(…, 'Mon')`
 * даёт английский `Jul` независимо от `lc_time` (на этом хосте он
 * `Russian_Russia.1251`, и `TMMon` дал бы `июл`), а название месяца по-русски
 * рисует уже слой отображения.
 *
 * Приведение делается только к поясу, который PostgreSQL знает: иначе
 * `AT TIME ZONE` бросает 22023 и вся сборка снимков валится в catch. Пояс
 * неизвестен — поведение прежнее, месяц режется в поясе сессии.
 */
export async function computeCohortLtvAll(organizationIds: readonly string[]) {
	const map = new Map<string, CohortRevenuePoint[]>();

	for (const organizationId of organizationIds) {
		const zone = await postgresKnowsTimeZone(await clinicTimeZone(organizationId));
		// Выражение месяца объявлено ОДИН раз на SELECT, GROUP BY и ORDER BY.
		// Через три отдельных фрагмента имя пояса ушло бы параметром трижды и
		// получило РАЗНЫЕ номера — PostgreSQL считает такие выражения разными и
		// отвергает запрос целиком с «column must appear in the GROUP BY clause».
		// Приведение `::text` тут не спасает: дело не в типе, а в номере.
		const monthBucket = sql`date_trunc('month', ${inClinicZone(payments.createdAt, zone)})`;

		const rows = await db
			.select({
				month: sql<string>`to_char(${monthBucket}, 'YYYY-MM')`,
				total: sql<number>`coalesce(sum(${payments.amountRub}), 0)`,
			})
			.from(payments)
			.where(and(eq(payments.organizationId, organizationId), PAID_PAYMENTS_ONLY))
			.groupBy(monthBucket)
			.orderBy(monthBucket);

		if (!rows.length) continue;

		map.set(
			organizationId,
			rows.map((r) => ({
				cohort: r.month,
				"Month 1": Number(r.total ?? 0),
			})),
		);
	}

	return map;
}

/** Состояние плана лечения так, как его называет перечисление базы. */
export type TreatmentPlanStatus = (typeof treatmentPlanStatus.enumValues)[number];

/**
 * ВЕТВИ ВОРОНКИ ВЫВЕДЕНЫ ИЗ ПЕРЕЧИСЛЕНИЯ, А НЕ ЗАПИСАНЫ ВТОРЫМ СПИСКОМ.
 *
 * Второй список — это и был дефект. В `scripts/cronAnalyticsWorker.ts` стояла
 * карта `{ draft, proposed, approved, active, completed }` со СТРОЧНЫМИ ключами и
 * отбор `if (p.status in funnelMap)`. Перечисление `treatment_plan_status` в базе
 * — `Draft, Active, Approved, Completed, Rejected` С БОЛЬШОЙ БУКВЫ, поэтому
 * условие не выполнялось НИ ДЛЯ ОДНОГО статуса: воронка показывала нули при
 * любом числе планов. ЗАМЕРЕНО на живой базе 2026-07-29: 15 планов (1 Draft,
 * 2 Active, 3 Approved, 4 Completed, 5 Rejected) дали воронку из пяти нулей.
 * Отказа при этом не было — был тихий ноль, по которому владелец клиники решает,
 * сколько тратить на рекламу.
 *
 * Карта расходилась с базой В ОБЕ СТОРОНЫ: `proposed` в перечислении НЕТ вовсе
 * (ветвь, под которой не могло оказаться ни одного плана), а `Rejected` в
 * перечислении ЕСТЬ, и карта его не знала — планы, от которых пациент отказался,
 * из отчёта исчезали. Это ровно тот показатель, по которому видно, что смета не
 * продаётся.
 *
 * Порядок ветвей — порядок `pg_enum` (`enumsortorder`), то есть тот же, в котором
 * состояния объявлены в базе. Своей сортировки здесь нет: она стала бы третьим
 * списком.
 */
const TREATMENT_PLAN_FUNNEL_STATUSES = treatmentPlanStatus.enumValues;

/**
 * Подпись и цвет ветви. `Record` по объединению статусов, а не массив пар:
 * компилятор требует ПОЛНОТЫ и запрещает лишний ключ, поэтому появление статуса
 * в `schema.ts` без подписи здесь — ошибка сборки, а не тихий пропуск. Значение
 * из базы, которого нет в `schema.ts`, компилятор поймать не может по построению:
 * его ловит `buildPlanFunnel` в рантайме и тест по живому `pg_enum`.
 *
 * Подписи русские, как у живого маршрута `routes/analytics.ts` («Запланированы»,
 * «Завершены»): воронку читает владелец клиники, а не разработчик.
 */
const TREATMENT_PLAN_FUNNEL_APPEARANCE: Record<
	TreatmentPlanStatus,
	{ readonly label: string; readonly fill: string }
> = {
	Draft: { label: "Черновики", fill: "#a1a1aa" },
	Active: { label: "В работе", fill: "#f59e0b" },
	Approved: { label: "Согласованы", fill: "#3b82f6" },
	Completed: { label: "Завершены", fill: "#10b981" },
	Rejected: { label: "Отклонены", fill: "#ef4444" },
};

/** Строка «статус → сколько планов» из группирующего запроса. */
export interface PlanStatusCount {
	readonly status: string | null;
	readonly count: number | string | null;
}

/**
 * Ветвь воронки в том виде, в каком она ложится в
 * `bi_analytics_snapshots.plan_funnel_json`.
 *
 * `status` — идентификатор состояния из базы, и он здесь НЕ ДЛЯ КРАСОТЫ: по нему
 * проверка сверяет записанную воронку с живым `pg_enum` в обе стороны. Подпись
 * `name` для этого не годится, она русская и предназначена человеку. Экран читает
 * `name`, `value`, `fill` (`pages/analyticsDoctorMetrics.ts:184-188`) и лишнее
 * поле игнорирует.
 */
export interface PlanFunnelStage {
	readonly status: string;
	readonly name: string;
	readonly value: number;
	readonly fill: string;
}

/**
 * Воронка планов лечения из счётчиков по статусам.
 *
 * НЕИЗВЕСТНОЕ СОСТОЯНИЕ НЕ ВЫБРАСЫВАЕТСЯ. Прежний отбор `if (p.status in
 * funnelMap)` молча терял планы, и сумма воронки не сходилась с числом планов в
 * базе — причём заметить это было нечем. Состояние, которого нет в `schema.ts`,
 * попадает в воронку под своим сырым именем из базы и кричит в лог: придумать ему
 * русскую подпись нельзя, а потерять планы — хуже, чем показать ветвь без
 * перевода. Так сумма ветвей всегда равна числу планов.
 */
export function buildPlanFunnel(rows: readonly PlanStatusCount[]): PlanFunnelStage[] {
	const known = new Map<string, number>(
		TREATMENT_PLAN_FUNNEL_STATUSES.map((status) => [status, 0]),
	);
	const unknown = new Map<string, number>();

	for (const row of rows) {
		const status = row.status ?? "";
		const parsed = Number(row.count ?? 0);
		const count = Number.isFinite(parsed) ? parsed : 0;
		const previous = known.get(status);
		if (previous !== undefined) {
			known.set(status, previous + count);
			continue;
		}
		unknown.set(status, (unknown.get(status) ?? 0) + count);
	}

	if (unknown.size > 0) {
		console.error(
			"[BI] Воронка планов лечения: база вернула состояния, которых нет в перечислении " +
				`treatmentPlanStatus (db/schema.ts): ${[...unknown.keys()].join(", ")}. ` +
				"Планы показаны под сырым именем, чтобы не пропасть из отчёта; подпись и цвет им " +
				"добавляются в TREATMENT_PLAN_FUNNEL_APPEARANCE.",
		);
	}

	return [
		...TREATMENT_PLAN_FUNNEL_STATUSES.map((status) => ({
			status,
			name: TREATMENT_PLAN_FUNNEL_APPEARANCE[status].label,
			value: known.get(status) ?? 0,
			fill: TREATMENT_PLAN_FUNNEL_APPEARANCE[status].fill,
		})),
		...[...unknown.entries()].map(([status, value]) => ({
			status,
			name: status,
			value,
			fill: "#71717a",
		})),
	];
}

/**
 * ВОРОНКА СЧИТАЛАСЬ ПО СТРАТЕГИИ СЦЕНАРИЯ, А НЕ ПО СОСТОЯНИЮ ПЛАНА.
 *
 * Здесь стоял запрос к `treatment_scenarios` с группировкой по `strategy` и
 * раскладкой `urgent → Active`, `standard → Proposed`, `optimal → Draft`, всё
 * остальное → `Completed`. Стратегия — это ПОДХОД к лечению, а не стадия
 * жизненного цикла: перечисление `treatment_plan_scenario_strategy` в базе —
 * `urgent, standard, optimal, phased, maintenance` (снято с `pg_enum`
 * 2026-07-29). То есть сценарий «phased» или «maintenance» попадал в ветку
 * `else` и объявлялся ЗАВЕРШЁННЫМ планом лечения, ни разу таковым не будучи.
 * Никакого перехода между этими значениями не существует, поэтому «воронкой» это
 * не было ни при каких данных — это была раскладка одного справочника по
 * подписям другого.
 *
 * Плюс `os.draft || 1`: ноль подменялся единицей у трёх ветвей из четырёх.
 * Клиника без единого плана лечения видела по одному плану в «Draft», «Proposed»
 * и «Active» — выдуманное число, которое от настоящего не отличается ничем.
 *
 * Теперь считается то, что обещает имя колонки снимка: планы лечения по своему
 * состоянию, через ту же `buildPlanFunnel`, что и `scripts/cronAnalyticsWorker.ts`.
 * Два писателя одной колонки наконец согласованы.
 *
 * Арендатор берётся из `treatment_plans.organization_id` — собственной колонки
 * таблицы, как и у всех остальных запросов этого файла. `cronAnalyticsWorker.ts`
 * идёт к арендатору через соединение с `patients`; расхождение оставлено как
 * есть и не «приведено к единому виду» тихой правкой, потому что это вопрос
 * правила аренды, а не оформления.
 */
export async function computePlanFunnelAll(): Promise<Map<string, PlanFunnelStage[]>> {
	const stats = await db
		.select({
			organizationId: treatmentPlans.organizationId,
			status: treatmentPlans.status,
			count: sql<number>`count(*)::int`,
		})
		.from(treatmentPlans)
		.groupBy(treatmentPlans.organizationId, treatmentPlans.status);

	const byOrganization = new Map<string, PlanStatusCount[]>();
	for (const row of stats) {
		if (!row.organizationId) continue;
		const rows = byOrganization.get(row.organizationId) ?? [];
		rows.push({ status: row.status, count: row.count });
		byOrganization.set(row.organizationId, rows);
	}

	const map = new Map<string, PlanFunnelStage[]>();
	for (const [organizationId, rows] of byOrganization.entries()) {
		map.set(organizationId, buildPlanFunnel(rows));
	}
	return map;
}

async function computeChairUtilizationAll() {
	// Aggregate appointments by chair and organization
	const stats = await db
		.select({
			organizationId: appointments.organizationId,
			chairId: appointments.chairId,
			count: sql<number>`count(*)`,
		})
		.from(appointments)
		.where(eq(appointments.status, "completed"))
		.groupBy(appointments.organizationId, appointments.chairId);

	const orgChairs = new Map<string, any[]>();

	for (const s of stats) {
		if (!s.organizationId) continue;
		if (!orgChairs.has(s.organizationId)) {
			orgChairs.set(s.organizationId, []);
		}

		const arr = orgChairs.get(s.organizationId)!;
		const i = arr.length;
		arr.push({
			name: s.chairId ? `Chair ${s.chairId.substring(0, 4)}` : "Unknown",
			value: Number(s.count),
			fill: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"][i % 4],
		});
	}

	return orgChairs;
}

/**
 * Строка прибыльности врача в том виде, в каком она ложится в
 * `bi_analytics_snapshots.doctor_profitability_json`. Форма — та же, что у
 * второго писателя этой колонки (`DoctorProfitabilitySnapshotRow` в
 * `scripts/cronAnalyticsWorker.ts`), потому что колонку читает один экран.
 */
export interface DoctorProfitabilitySnapshotRow {
	readonly name: string;
	readonly revenue: number;
	readonly margin: number | null;
	readonly completionRate: number | null;
}

/**
 * СЕБЕСТОИМОСТИ В СИСТЕМЕ НЕТ, ПОЭТОМУ ПРИБЫЛИ НЕТ.
 *
 * Здесь стояли `materialCost` = 15 % выручки и `commission` = 25 % выручки, а
 * `margin` — остаток, то есть ровно 60 % выручки. Доли выглядели расчётом:
 * заданы базисными пунктами, сведены до копейки, покрыты пятью проверками.
 * Расчётом они не были — числа 1500 и 2500 не выведены ни из одной строки базы.
 *
 * ПРОВЕРЕНО МНОЙ на живой базе 2026-07-29: все источники затрат пусты —
 * inventory_transactions, inventory_items, procedure_material_rules,
 * doctor_commissions, pricelist_doctor_payrolls, по нулю строк в каждой.
 * Материалов и комиссий в системе не существует, поэтому их доли взять неоткуда.
 *
 * Ноль вместо неизвестной себестоимости подставить тоже нельзя: тогда прибылью
 * объявляется вся выручка целиком — ложь крупнее прежней. Поэтому `margin`
 * равен `null` («считать не из чего»), а `materialCost` и `commission` исчезли:
 * величины, которой нет, не должно быть и в снимке. Экран печатает на месте
 * `null` прочерк (`pages/analyticsDoctorMetrics.ts:154-159`).
 *
 * Ровно это решение уже принято дважды в том же узле — на живом маршруте
 * `routes/analytics.ts:127-132` и в `buildDoctorProfitabilityRow`
 * (`scripts/cronAnalyticsWorker.ts`), где `margin: Number(row.revenue) * 0.4`
 * с подписью «Simplified margin heuristic» снят по той же причине. Два писателя
 * одной колонки давали разные ответы на один вопрос: один честный `null`, другой
 * выдуманные 60 %.
 *
 * УСПЕШНОСТЬ ЗДЕСЬ ТОЖЕ НЕ ИЗМЕРЕНА. Стояло `paymentCount > 0 ? 100 : 0`: врач,
 * у которого нашёлся хотя бы один платёж, объявлялся завершившим 100 % приёмов.
 * Эта выборка идёт по платежам и статусов приёмов не содержит вовсе, поэтому
 * доля не восстанавливается — `null`. Успешность СЧИТАЕМА, но по другому
 * множеству: `buildDoctorProfitabilityRow` берёт её из журнала приёмов
 * (`count(*) filter (where status = 'completed')`), и это правильное место.
 *
 * ВЫРУЧКА — ЧИСЛО, А НЕ СТРОКА, и это не косметика. Строка "500000.00" не
 * доходила до экрана вовсе: разборщик ответа принимает только число
 * (`numberOr` в `pages/analyticsDoctorMetrics.ts:231-233`) и на строке
 * подставляет 0. То есть единственная измеренная величина этой строки
 * показывалась нулём, пока выдуманная маржа показывалась как факт. Копейки
 * здесь не теряются: `payments.amount_rub` — целые рубли, `sum()` над ними
 * точен.
 */
export function doctorProfitabilityRow(
	name: string,
	totalRevenue: string | number | null,
): DoctorProfitabilitySnapshotRow {
	// sum() над integer возвращает bigint, а драйвер отдаёт bigint строкой.
	const revenue = Number(totalRevenue ?? 0);

	return {
		name,
		revenue: Number.isFinite(revenue) ? revenue : 0,
		margin: null,
		completionRate: null,
	};
}

async function computeDoctorProfitabilityAll() {
	/*
	 * DEFECT #37: tenant isolation on diary/doctor joins.
	 * БЫЛО: leftJoin visitDiaries только по visitId; leftJoin users только по
	 * doctorId — без organizationId. visit_diaries.visit_id без FK; UUID визита
	 * теоретически мог совпасть у двух клиник, и выручка org A прилипала к
	 * дневнику/ФИО врача org B. Пользователь чужой org с тем же id (нереально
	 * при UUID, но правило изоляции — organizationId на каждом join).
	 * СТАЛО: join дневника и врача только внутри organizationId платежа.
	 */
	const rows = await db
		.select({
			organizationId: payments.organizationId,
			doctorId: visitDiaries.doctorId,
			doctorName: users.fullName,
			totalRevenue: sql<number>`coalesce(sum(${payments.amountRub}), 0)`,
		})
		.from(payments)
		.leftJoin(
			visitDiaries,
			and(
				eq(payments.visitId, visitDiaries.visitId),
				eq(visitDiaries.organizationId, payments.organizationId),
			),
		)
		.leftJoin(
			users,
			and(
				eq(visitDiaries.doctorId, users.id),
				eq(users.organizationId, payments.organizationId),
			),
		)
		.where(PAID_PAYMENTS_ONLY)
		.groupBy(payments.organizationId, visitDiaries.doctorId, users.fullName);

	const map = new Map<string, DoctorProfitabilitySnapshotRow[]>();
	for (const r of rows) {
		if (!r.organizationId) continue;
		if (!map.has(r.organizationId)) {
			map.set(r.organizationId, []);
		}
		map.get(r.organizationId)!.push(
			// Счётчик платежей больше не нужен: он служил только выдуманной
			// успешности `paymentCount > 0 ? 100 : 0`.
			doctorProfitabilityRow(r.doctorName ?? "Врач не указан", r.totalRevenue),
		);
	}

	return map;
}

export async function computeBiAnalyticsSnapshots() {
	try {
		const orgs = await db.select().from(organizations);
		if (!orgs.length) return;

		const snapshotDate = new Date();

		const [
			cohortLtvMap,
			planFunnelMap,
			chairUtilizationMap,
			doctorProfitabilityMap,
		] = await Promise.all([
			computeCohortLtvAll(orgs.map((org) => org.id)),
			computePlanFunnelAll(),
			computeChairUtilizationAll(),
			computeDoctorProfitabilityAll(),
		]);

		const snapshots = orgs.map((org) => {
			const orgId = org.id;

			/*
			 * ЗДЕСЬ СТОЯЛИ ТРИ ВЫДУМАННЫХ ПОДСТАВНЫХ НАБОРА — на случай, когда у
			 * клиники данных нет. Это худший из возможных случаев для подмены:
			 * ровно НОВАЯ клиника, у которой ещё ничего не накопилось, получала чужие
			 * показатели как свои и по ним принимала первые решения.
			 *
			 *   cohortLtvJson        → [{ cohort: "Jan", "Month 1": 0 }] — когорта
			 *                          «Jan» вместо ярлыка `YYYY-MM`, которого требует
			 *                          остальной код, и месяц, взятый из ниоткуда:
			 *                          января в данных не было вовсе.
			 *   planFunnelJson       → по одному плану в «Draft», «Proposed» и
			 *                          «Active» при полном отсутствии планов.
			 *   chairUtilizationJson → «Chair 1 — 10 приёмов», «Chair 2 — 5»: два
			 *                          кресла, которых у клиники может не быть, и
			 *                          пятнадцать приёмов, которых не было.
			 *
			 * Пустой массив честнее, и в этом узле он уже принят: `routes/analytics.ts`
			 * отдаёт пустые массивы с отдельным признаком `isEmpty`, а экран рисует по
			 * ним «Пока нечего показать» с объяснением, чего именно не хватает
			 * (`AnalyticsDashboardView.tsx:400-408`). Ровно за это же — за
			 * «Иванов И.И. — 240 000 ₽» и «Кресло 1 — 42 %» на пустой базе — подмену
			 * там уже убирали.
			 */
			const cohortLtvJson = cohortLtvMap.get(orgId) ?? [];
			const planFunnelJson = planFunnelMap.get(orgId) ?? [];
			const chairUtilizationJson = chairUtilizationMap.get(orgId) ?? [];
			const doctorProfitabilityJson = doctorProfitabilityMap.get(orgId) ?? [];

			return {
				organizationId: orgId,
				snapshotDate,
				cohortLtvJson,
				planFunnelJson,
				chairUtilizationJson,
				doctorProfitabilityJson,
			};
		});

		if (snapshots.length > 0) {
			await db.insert(biAnalyticsSnapshots).values(snapshots);
			for (const org of orgs) {
				console.log(`[BI Worker] Snapshot generated for org ${org.id}`);
			}
		}
	} catch (err) {
		console.error("[BI Worker] Error generating snapshots:", err);
	}
}

export function startBiAnalyticsWorker() {
	// Run async without blocking startup
	setTimeout(() => computeBiAnalyticsSnapshots(), 5000);

	return setInterval(
		() => {
			computeBiAnalyticsSnapshots();
		},
		1000 * 60 * 60,
	);
}
