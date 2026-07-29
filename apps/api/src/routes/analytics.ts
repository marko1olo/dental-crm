import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	appointments,
	chairs,
	payments,
	patients,
	users,
	visits,
} from "../db/schema.js";
// Пояс клиники берётся ОДНИМ домом на проект — из отчётов руководителя. Своя
// копия `clinicTimeZone` здесь стала бы вторым источником истины о поясе, а из
// этой болезни в проекте уже выросли четыре разных расчёта долга.
import {
	clinicTimeZone,
	inClinicZone,
	postgresKnowsTimeZone,
} from "../services/reports/managerReports.js";

/**
 * Названия месяцев для ярлыка когорты. Экспортируются, чтобы тест-замок на пояс
 * когорты сверял ярлык с ЭТОЙ таблицей, а не с собственной копией: вторая копия
 * разошлась бы с первой, и тест перестал бы проверять то, что показывают
 * владельцу клиники.
 */
export const RU_MONTHS = [
	"Янв", "Фев", "Мар", "Апр",
	"Май", "Июн", "Июл", "Авг",
	"Сен", "Окт", "Ноя", "Дек",
];

export async function registerAnalyticsRoutes(app: FastifyInstance) {
	app.get("/api/analytics/dashboard", async (request, reply) => {
		// БЫЛО: `const orgId = await requireClinicalReadAccess(...)` — этот guard
		// возвращает Promise<boolean> (проверка секрета), а не идентификатор
		// организации. При успешной проверке orgId === true, поэтому условие
		// `typeof orgId !== "string"` срабатывало ВСЕГДА и обработчик выходил до
		// первого запроса к базе: весь дашборд молча отдавал пустой ответ.
		// Типизация это не ловит — сравнение typeof у boolean легально.
		// Теперь два шага явно разделены: гейт по секрету и получение арендатора
		// из подписанного токена.
		const readAllowed = await requireClinicalReadAccess(
			request,
			reply,
			"analytics dashboard",
		);
		if (!readAllowed) return;

		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"analytics dashboard",
		);
		if (!orgId) return;

		try {
			const { range } = request.query as { range?: string };
			let startDate: Date | undefined;

			// БЫЛО: setMonth(getMonth() - 1) на 31-м числе перескакивал через месяц.
			// 31 марта → "31 февраля" → 3 марта: отчёт "за прошлый месяц" охватывал
			// 28 дней вместо 31 и молча терял конец февраля. Сначала ставим 1-е число.
			const monthsBack = range === "last_month" ? 1 : range === "last_3_months" ? 3 : 0;
			if (monthsBack > 0) {
				const now = new Date();
				startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, now.getDate());
				if (startDate.getDate() !== now.getDate()) {
					// День не существует в целевом месяце (31 → 30/28): берём его последний день.
					startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 0);
				}
				startDate.setHours(0, 0, 0, 0);
			} else if (range === "this_year") {
				startDate = new Date(new Date().getFullYear(), 0, 1);
			}

			const withDate = (orgCol: any, dateCol?: any) =>
				startDate ? and(eq(orgCol, orgId), gte(dateCol, startDate)) : eq(orgCol, orgId);

			// 1. Appointment Funnel (Planned, Confirmed, Completed, Cancelled)
			const apptRes = await db
				.select({
					status: appointments.status,
					count: sql<number>`count(*)`,
				})
				.from(appointments)
				.where(withDate(appointments.organizationId, appointments.startsAt))
				.groupBy(appointments.status);

			const apptCounts = { planned: 0, confirmed: 0, completed: 0, cancelled: 0 };
			for (const r of apptRes) {
				const st = r.status || "planned";
				const key = st.toLowerCase();
				if (key in apptCounts) {
					apptCounts[key as keyof typeof apptCounts] += Number(r.count);
				} else {
					apptCounts.planned += Number(r.count);
				}
			}

			const planFunnelJson = [
				{ name: "Запланированы", value: apptCounts.planned, fill: "#a1a1aa" },
				{ name: "Подтверждены", value: apptCounts.confirmed, fill: "#3b82f6" },
				{ name: "Завершены", value: apptCounts.completed, fill: "#10b981" },
				{ name: "Отменены", value: apptCounts.cancelled, fill: "#ef4444" },
			].filter((x) => x.value > 0);

			// 2. Doctor Profitability — payments grouped by doctorUserId
			const docProfRes = await db
				.select({
					doctorId: appointments.doctorUserId,
					revenue: sql<number>`coalesce(sum(${payments.amountRub}),0)`,
				})
				.from(payments)
				.leftJoin(visits, eq(payments.visitId, visits.id))
				.leftJoin(appointments, eq(visits.appointmentId, appointments.id))
				// БЫЛО: суммировались ВСЕ платежи, включая planned (деньги ещё не
				// получены), refunded и voided. Клиника видела выручку в разы больше
				// фактической. Фронтенд (useAppLogic) считает правильно — только "paid".
				.where(and(withDate(payments.organizationId, payments.createdAt), eq(payments.status, "paid")))
				.groupBy(appointments.doctorUserId);

			const allDocs = await db
				.select({ id: users.id, fullName: users.fullName })
				.from(users)
				.where(eq(users.organizationId, orgId));
			const docMap = new Map(allDocs.map((d) => [d.id, d.fullName]));

			const doctorProfitabilityJson = docProfRes
				.map((r) => {
					const revenue = Number(r.revenue || 0);
					return {
						name: r.doctorId
							? (docMap.get(r.doctorId) || "Врач клиники")
							: "Общая касса",
						revenue,
						// БЫЛО: margin = 35% от выручки и completionRate = 85 — константы,
						// выдаваемые за расчёт. Пока в БД нет данных о себестоимости
						// материалов и проценте врача, возвращаем null: интерфейс покажет
						// прочерк вместо правдоподобного, но выдуманного числа.
						margin: null as number | null,
						completionRate: null as number | null,
					};
				})
				.filter((x) => x.revenue > 0)
				.sort((a, b) => b.revenue - a.revenue);

			// 3. Chair Utilization
			const chairUtilRes = await db
				.select({
					chairId: appointments.chairId,
					count: sql<number>`count(*)`,
				})
				.from(appointments)
				.where(withDate(appointments.organizationId, appointments.startsAt))
				.groupBy(appointments.chairId);

			const allChairs = await db
				.select({ id: chairs.id, name: chairs.name })
				.from(chairs)
				.where(eq(chairs.organizationId, orgId));
			const chairMap = new Map(allChairs.map((c) => [c.id, c.name]));

			const colors = ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];
			const chairUtilizationJson = chairUtilRes
				.map((r, i) => ({
					name: r.chairId ? (chairMap.get(r.chairId) || "Кресло") : "Основное кресло",
					value: Number(r.count),
					fill: colors[i % colors.length],
				}))
				.filter((x) => x.value > 0);

			// 4. Cohort LTV — payments grouped by patient creation month
			const now = new Date();
			const ltvStartDate = new Date(now);
			ltvStartDate.setMonth(ltvStartDate.getMonth() - 12);

			/*
			 * МЕСЯЦ КОГОРТЫ СЧИТАЛСЯ В ПОЯСЕ СЕССИИ POSTGRESQL, А НЕ КЛИНИКИ.
			 *
			 * `date_trunc('month', …)` для колонки с часовым поясом режет месяц по
			 * поясу СЕССИИ. У всех российских поясов смещение положительное, поэтому
			 * день в поясе сессии ОТСТАЁТ от местного каждую ночь: в Самаре (пояс
			 * клиники по умолчанию в схеме) до 04:00, на Камчатке половину суток.
			 * Пациент, зарегистрированный вечером последнего дня месяца, попадал в
			 * когорту СЛЕДУЮЩЕГО месяца — и оставался там навсегда, потому что
			 * когорта присваивается один раз, по дате регистрации.
			 *
			 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. Владелец сравнивает когорты между собой и
			 * по этому сравнению решает, какая реклама сработала. Сдвинутый пациент
			 * уносит свою выручку в чужой месяц: месяц регистрации недосчитывает
			 * его, следующий получает подарок. Средний чек когорты — деление на
			 * число пациентов в ней, поэтому ошибаются ОБА месяца сразу.
			 *
			 * ИЗМЕРЕНО на живой базе: момент 30 июня 2026 23:30 по часам клиники
			 * (Europe/Moscow) при поясе сессии Europe/Samara даёт когорту 2026-07,
			 * в поясе клиники — 2026-06. Пояс режет и ГРУППИРОВКУ, а не только
			 * ярлык: два момента (30 июня 23:30 и 1 июля 10:00 по Москве) в поясе
			 * сессии дают ОДНУ корзину 2026-07 из двух строк, в поясе клиники —
			 * две корзины по одной.
			 *
			 * Приведение делается только к поясу, который PostgreSQL знает: иначе
			 * `AT TIME ZONE` бросает 22023 и дашборд отдаёт 503. Пояс неизвестен —
			 * поведение прежнее, ответ тот же, что и до правки.
			 *
			 * ВЫРАЖЕНИЕ ОБЪЯВЛЕНО ОДИН РАЗ на все ТРИ места (SELECT, GROUP BY,
			 * ORDER BY). Через три отдельных фрагмента имя пояса ушло бы
			 * параметром трижды и получило РАЗНЫЕ номера ($1, $6, $7) —
			 * PostgreSQL считает такие выражения разными и отвергает запрос
			 * целиком с «column must appear in the GROUP BY clause». Приведение
			 * `::text` тут не спасает: дело не в типе, а в номере. Так уже дважды
			 * падала в 500 тепловая карта смен.
			 */
			const cohortZone = await postgresKnowsTimeZone(await clinicTimeZone(orgId));
			const cohortMonthBucket = sql`date_trunc('month', ${inClinicZone(patients.createdAt, cohortZone)})`;

			const cohortRaw = await db
				.select({
					cohortMonth: sql<string>`to_char(${cohortMonthBucket}, 'YYYY-MM')`,
					patientId: payments.patientId,
					totalRevenue: sql<number>`coalesce(sum(${payments.amountRub}), 0)`,
				})
				.from(payments)
				.innerJoin(patients, eq(payments.patientId, patients.id))
				.where(
					and(
						eq(patients.organizationId, orgId),
						gte(patients.createdAt, ltvStartDate),
						// Только фактически полученные деньги (см. комментарий выше).
						eq(payments.status, "paid"),
					),
				)
				.groupBy(cohortMonthBucket, payments.patientId)
				.orderBy(cohortMonthBucket);

			const cohortMap = new Map<string, { m1: number[]; m12: number[] }>();
			for (const row of cohortRaw) {
				const cm = row.cohortMonth;
				if (!cm) continue;
				if (!cohortMap.has(cm)) {
					cohortMap.set(cm, { m1: [], m12: [] });
				}
				const bucket = cohortMap.get(cm)!;
				const rev = Number(row.totalRevenue);
				// БЫЛО: "выручка первого месяца" = 40% от общей — константа, а не расчёт.
				// Пока платежи не разделены по месяцам от даты регистрации пациента,
				// показываем только фактическую суммарную выручку когорты.
				bucket.m12.push(rev);
			}

			const cohortLtvJson = Array.from(cohortMap.entries())
				.slice(-6)
				.map(([key, { m1, m12 }]) => {
					const [, monthStr] = key.split("-");
					const monthIdx = monthStr ? parseInt(monthStr, 10) - 1 : 0;
					const label = RU_MONTHS[monthIdx] ?? key;
					const avg = (arr: number[]) =>
						arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
					void m1;
					return {
						cohort: label,
						"Month 12": avg(m12),
					};
				});

			const [patientCountRow] = await db
				.select({ count: sql<number>`count(*)` })
				.from(patients)
				.where(withDate(patients.organizationId, patients.createdAt));

			const [revenueRow] = await db
				.select({ total: sql<number>`coalesce(sum(${payments.amountRub}), 0)` })
				.from(payments)
				// Только фактически полученные деньги (см. комментарий выше).
				.where(and(withDate(payments.organizationId, payments.createdAt), eq(payments.status, "paid")));

			// Средний чек считается на ПЛАТИВШИХ пациентов. Раньше делили выручку
			// периода на число пациентов, ЗАРЕГИСТРИРОВАННЫХ в этом периоде: при
			// 10 новых пациентах и выручке со старых средний чек улетал в космос.
			const [payingPatientRow] = await db
				.select({ count: sql<number>`count(distinct ${payments.patientId})` })
				.from(payments)
				.where(and(withDate(payments.organizationId, payments.createdAt), eq(payments.status, "paid")));

			const [apptCountRow] = await db
				.select({ count: sql<number>`count(*)` })
				.from(appointments)
				.where(withDate(appointments.organizationId, appointments.startsAt));

			const data = {
				kpis: {
					totalPatients: Number(patientCountRow?.count ?? 0),
					totalRevenue: Number(revenueRow?.total ?? 0),
					totalAppointments: Number(apptCountRow?.count ?? 0),
					avgRevenuePerPatient:
						Number(payingPatientRow?.count ?? 0) > 0
							? Math.round(
									Number(revenueRow?.total ?? 0) /
										Number(payingPatientRow?.count ?? 0),
								)
							: 0,
				},
				// БЫЛО: при пустом результате подставлялись выдуманные данные —
				// "Иванов И.И. — 240 000 ₽", "Кресло 1 — 42%" и т.п. Новая клиника
				// видела чужие показатели как свои и принимала по ним решения.
				// Пустой массив честнее: интерфейс покажет "нет данных за период".
				cohortLtvJson,
				planFunnelJson,
				chairUtilizationJson,
				doctorProfitabilityJson,
				// Явный признак пустого периода, чтобы интерфейс отличал "нет данных"
				// от "все показатели равны нулю".
				isEmpty:
					!cohortLtvJson.length &&
					!planFunnelJson.length &&
					!chairUtilizationJson.length &&
					!doctorProfitabilityJson.length,
			};

			return { success: true, data };
		} catch (e) {
			// БЫЛО: при ошибке БД возвращался success:true с нулями — руководитель
			// видел "выручка 0 ₽" и считал, что клиника ничего не заработала,
			// вместо того чтобы узнать о сбое. Теперь ошибка видна честно.
			request.log.error({ err: e }, "Не удалось построить аналитику");
			return reply.code(503).send({
				success: false,
				error: "AnalyticsUnavailable",
				message: "Не удалось построить аналитику. Данные не потеряны, повторите позже.",
			});
		}
	});
}
