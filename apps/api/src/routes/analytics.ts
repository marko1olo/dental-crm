import { and, eq, gte, inArray, lte, ne, or, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	appointments,
	cashOperations,
	chairs,
	crmLeads,
	diagnocatAiFindings,
	diagnocatReports,
	doctorPayrollStatements,
	labOrders,
	organizations,
	patients,
	payments,
	rebookingConversionRules,
	serviceCatalogItems,
	treatmentItems,
	treatmentPlanItemsNew,
	treatmentPlans,
	users,
	visits,
} from "../db/schema.js";
// Ветви воронки планов лечения выводятся из перечисления базы ОДНИМ местом на
// проект — той же функцией, что пишет колонку `bi_analytics_snapshots.plan_funnel_json`
// (`services/biAnalyticsWorker.ts` и `scripts/cronAnalyticsWorker.ts`). Своя карта
// состояний здесь стала бы ТРЕТЬИМ списком, а второй уже разошёлся с `pg_enum` и по
// регистру, и по составу: воронка показывала нули при любом числе планов (d1ff7ab21).
import { buildPlanFunnel } from "../services/biAnalyticsWorker.js";
// Пояс клиники берётся ОДНИМ домом на проект — из отчётов руководителя. Своя
// копия `clinicTimeZone` здесь стала бы вторым источником истины о поясе, а из
// этой болезни в проекте уже выросли четыре разных расчёта долга.
import {
	type CuratorFunnelStage,
	type CuratorPatientQueueItem,
	calculateCuratorMetrics,
	evaluatePatientUrgency,
	type ExecutiveDashboardPayload,
	type ExecutiveDepartmentKey,
	type ExecutiveFunnelStage,
	type ExecutivePeriod,
	calculateDepartmentBreakdown,
	calculateExecutiveFunnel,
	calculateExecutiveKpisSummary,
} from "@dental/shared";
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
	"Янв",
	"Фев",
	"Мар",
	"Апр",
	"Май",
	"Июн",
	"Июл",
	"Авг",
	"Сен",
	"Окт",
	"Ноя",
	"Дек",
];

/**
 * Извлекает метку времени создания (Unix epoch ms) из UUIDv7.
 * В UUIDv7 первые 48 бит (12 hex-символов) содержат миллисекунды от Unix Epoch.
 */
export function extractCreatedAtFromUuidV7(id: string | null | undefined): Date | null {
	if (!id || typeof id !== "string") return null;
	const clean = id.replace(/-/g, "");
	if (clean.length < 13) return null;
	// Проверяем версию UUID (13-й hex-символ должен быть '7')
	if (clean[12] !== "7") return null;

	const hexTime = clean.slice(0, 12);
	const ms = parseInt(hexTime, 16);
	if (isNaN(ms) || ms < 1577836800000 || ms > 2524608000000) {
		return null;
	}
	return new Date(ms);
}

/**
 * Алгоритм 15-минутного окна конверсии повторной записи (Врач vs Администратор):
 * \Delta t = \text{created\_at} - \text{completed\_at}.
 * Если повторная запись создана в течение 15 минут после завершения визита (\Delta t \le 15 мин),
 * конверсия атрибутируется Врачу (запись создана у кресла).
 * Если \Delta t > 15 мин или визит не предшествовал записи, конверсия атрибутируется Администратору/Ресепшену.
 */
export function calculateRebookingDeltaMinutes(
	createdAt: Date | string,
	completedAt: Date | string,
	isSoloDoctor = false,
): {
	deltaMinutes: number;
	creditedRole: "doctor" | "administrator";
	attributionReason: "chairside_rebooking_under_15m" | "frontdesk_rebooking_over_15m";
} {
	const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
	const completed = typeof completedAt === "string" ? new Date(completedAt) : completedAt;
	const diffMs = created.getTime() - completed.getTime();
	const deltaMinutes = Math.floor(diffMs / 60000);

	// В соло-режиме (1–2 кресла, субаренда, solo doctor) нет администратора на ресепшене (Мандат 8n).
	// Все 100% повторных записей атрибутируются врачу у кресла.
	if (isSoloDoctor) {
		return {
			deltaMinutes: Math.max(0, deltaMinutes),
			creditedRole: "doctor",
			attributionReason: "chairside_rebooking_under_15m",
		};
	}

	if (deltaMinutes <= 15) {
		return {
			deltaMinutes: Math.max(0, deltaMinutes),
			creditedRole: "doctor",
			attributionReason: "chairside_rebooking_under_15m",
		};
	}

	return {
		deltaMinutes,
		creditedRole: "administrator",
		attributionReason: "frontdesk_rebooking_over_15m",
	};
}

export function formatDoctorSpecialty(specialties: unknown): string {
	if (!specialties) return "Стоматолог общей практики";
	if (Array.isArray(specialties)) {
		const str = specialties
			.filter((s) => typeof s === "string" && s.trim())
			.join(", ");
		return str || "Стоматолог общей практики";
	}
	if (typeof specialties === "string" && specialties.trim()) {
		return specialties.trim();
	}
	return "Стоматолог общей практики";
}

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

			const now = new Date();
			if (range === "today") {
				startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
			} else if (range === "week") {
				const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0 = Monday
				startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
			} else if (range === "month" || range === "last_month") {
				startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
			} else if (range === "quarter" || range === "last_3_months") {
				const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
				startDate = new Date(now.getFullYear(), quarterMonth, 1, 0, 0, 0, 0);
			} else if (range === "year" || range === "this_year") {
				startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
			}

			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			const withDate = (orgCol: any, dateCol?: any) =>
				startDate
					? and(eq(orgCol, orgId), gte(dateCol, startDate))
					: eq(orgCol, orgId);

			/*
			 * 1. ВОРОНКА ПЛАНОВ ЛЕЧЕНИЯ. ЗДЕСЬ СЧИТАЛИСЬ ПРИЁМЫ.
			 *
			 * Поле называется `planFunnelJson`, экран рисует его под заголовком
			 * «Воронка планов лечения» и подписывает числа склонением «план / плана /
			 * планов» (`AnalyticsDashboardView.tsx:412` и `:66-69`), а расчёт брал
			 * `appointments.status` — четыре ветви `planned / confirmed / completed /
			 * cancelled` под подписями «Запланированы, Подтверждены, Завершены,
			 * Отменены». Планов лечения он не касался вовсе.
			 *
			 * ЗАМЕРЕНО на живой базе 2026-07-29 (демонстрационная клиника
			 * `d0000000-…-d001`: 27 приёмов, НОЛЬ планов лечения):
			 *   [{Запланированы 8}, {Подтверждены 2}, {Завершены 13}, {Отменены 4}],
			 *   сумма 27 — ровно `kpis.totalAppointments`.
			 * То есть владельцу клиники предъявлялось 27 «планов лечения», из них 13
			 * «завершённых», при полном отсутствии планов. Пустое состояние виджета
			 * («Планов лечения ещё нет. Составьте план в карточке пациента») не
			 * показывалось НИКОГДА, пока в клинике есть хоть один приём: указание,
			 * которое оператору и надо было выполнить, оказалось недостижимо.
			 *
			 * ВТОРАЯ ПОЛОВИНА ДЕФЕКТА — ветка `else`. Карта знала четыре статуса приёма
			 * из семи (`appointment_status`: planned, confirmed, arrived, in_treatment,
			 * completed, cancelled, no_show), а незнакомые молча прибавлялись к
			 * «Запланированы»: в том же замере 8 = 5 `planned` + 3 `no_show`, то есть
			 * три НЕЯВИВШИХСЯ пациента предъявлялись как приёмы, которые ещё
			 * состоятся. `st.toLowerCase()` был заряженным ружьём рядом: регистр
			 * совпадал случайно — `appointment_status` в базе строчный, в отличие от
			 * `treatment_plan_status`, — и в день смены регистра перечисления все семь
			 * статусов ушли бы в ту же ветку `else` одной строкой «Запланированы».
			 *
			 * ПОЧЕМУ ВЫБРАНЫ ПЛАНЫ, А НЕ ПЕРЕИМЕНОВАНИЕ ПОЛЯ В «воронку приёмов».
			 * Решает то, что видит оператор: заголовок, пустое состояние, указание
			 * «составьте план в карточке пациента» и единица измерения в подсказке —
			 * всё это про планы лечения, и на том же экране приёмы показаны уже дважды
			 * (плитка «Приёмов за период» и «Загруженность кресел» со своим склонением
			 * «приём / приёма / приёмов»). Плюс состояние `Rejected` — отказ пациента
			 * от сметы — среди статусов приёма не имеет соответствия вовсе, а это
			 * единственное место в продукте, где владелец видит, продаётся ли смета.
			 * И колонка снимка `plan_funnel_json` теперь считается по планам у обоих
			 * писателей (d1ff7ab21): оставить здесь приёмы значило бы дать одному имени
			 * поля два разных смысла в одном продукте.
			 *
			 * АРЕНДАТОР — из `treatment_plans.organization_id`, собственной колонки
			 * таблицы, как у всех остальных запросов этого файла и как в
			 * `services/biAnalyticsWorker.ts`. Колонка `NOT NULL` с миграции 0146,
			 * поэтому план не может выпасть из воронки из-за отсутствия арендатора.
			 * `scripts/cronAnalyticsWorker.ts` идёт к организации соединением с
			 * `patients` — это ДРУГОЕ правило: план, чей пациент заведён в соседней
			 * клинике, уходит по нему к соседям и исчезает из своей воронки, а сумма
			 * ветвей перестаёт сходиться с числом планов. Расхождение оставлено как
			 * есть и не приведено к единому виду тихой правкой: это вопрос правила
			 * аренды, а не оформления, и файл воркера принадлежит другой задаче.
			 *
			 * ПЕРИОД — по `createdAt` плана, как у всех виджетов этого экрана
			 * (приёмы по `startsAt`, платежи и пациенты по `createdAt`). Даты смены
			 * состояния в схеме нет (есть только `approvedAt`), поэтому иначе воронка
			 * перестала бы слушаться переключателя периода.
			 */
			const planCounts = await db
				.select({
					status: treatmentPlans.status,
					count: sql<number>`count(*)::int`,
				})
				.from(treatmentPlans)
				.where(
					withDate(treatmentPlans.organizationId, treatmentPlans.createdAt),
				)
				.groupBy(treatmentPlans.status);

			/*
			 * Ветви — из перечисления базы, подписи и цвета — из `Record` по нему,
			 * поэтому сумма ветвей всегда равна числу планов: состояние, которого нет в
			 * объявлении, попадает в воронку под сырым именем и кричит в лог, а не
			 * исчезает в `else`. Именно из-за `else` соседний писатель этой же колонки
			 * объявлял завершёнными планы, которых никто не завершал.
			 *
			 * Нулевые ветви отбрасываются, и это не потеря данных: экран сам скрывает
			 * ветви со нулём (`AnalyticsDashboardView.tsx:416`), а ПУСТАЯ воронка —
			 * единственный признак, по которому он показывает «Планов лечения ещё нет»
			 * с указанием, что делать, и по которому считается `isEmpty` всего
			 * дашборда. Сумма от этого не меняется: отброшенные ветви несут ноль.
			 */
			const planFunnelJson = buildPlanFunnel(planCounts).filter(
				(x) => x.value > 0,
			);

			// 2. Doctor Profitability — payments and appointments grouped by doctorUserId
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
				.where(
					and(
						withDate(payments.organizationId, payments.createdAt),
						eq(payments.status, "paid"),
					),
				)
				.groupBy(appointments.doctorUserId);

			const docApptRes = await db
				.select({
					doctorId: appointments.doctorUserId,
					totalAppointments: sql<number>`count(*)::int`,
					completedAppointments: sql<number>`coalesce(sum(case when ${appointments.status} in ('completed', 'arrived', 'in_treatment') then 1 else 0 end), 0)::int`,
					totalMinutes: sql<number>`coalesce(sum(case when ${appointments.status} not in ('cancelled', 'no_show') then extract(epoch from (${appointments.endsAt} - ${appointments.startsAt})) / 60 else 0 end), 0)::int`,
				})
				.from(appointments)
				.where(withDate(appointments.organizationId, appointments.startsAt))
				.groupBy(appointments.doctorUserId);

			const docApptMap = new Map(
				docApptRes.map((d) => [d.doctorId ?? "unassigned", d]),
			);

			const allDocs = await db
				.select({ id: users.id, fullName: users.fullName })
				.from(users)
				.where(eq(users.organizationId, orgId));
			const docMap = new Map(allDocs.map((d) => [d.id, d.fullName]));

			// 2b. Выработка врачей по номенклатуре 804н (услуги) и сданным нарядам ЗТЛ
			const docServicesRes = await db
				.select({
					doctorId: sql<string | null>`coalesce(${treatmentItems.plannedDoctorUserId}, ${appointments.doctorUserId})`,
					servicesCount: sql<number>`count(*)::int`,
				})
				.from(treatmentItems)
				.innerJoin(visits, eq(treatmentItems.visitId, visits.id))
				.leftJoin(appointments, eq(visits.appointmentId, appointments.id))
				.where(withDate(treatmentItems.organizationId, visits.createdAt))
				.groupBy(sql`coalesce(${treatmentItems.plannedDoctorUserId}, ${appointments.doctorUserId})`);
			const docServicesMap = new Map(
				docServicesRes.map((s) => [s.doctorId ?? "unassigned", Number(s.servicesCount || 0)]),
			);

			const docLabRes = await db
				.select({
					doctorId: labOrders.doctorId,
					labOrdersCount: sql<number>`count(*)::int`,
					labOrdersCostRub: sql<number>`coalesce(sum(${labOrders.priceRub}), 0)`,
				})
				.from(labOrders)
				.where(
					and(
						withDate(labOrders.organizationId, labOrders.createdAt),
						inArray(labOrders.status, ["completed", "received", "installed"]),
					),
				)
				.groupBy(labOrders.doctorId);
			const docLabMap = new Map(
				docLabRes.map((l) => [l.doctorId ?? "unassigned", Number(l.labOrdersCount || 0)]),
			);
			const docLabCostMap = new Map(
				docLabRes.map((l) => [l.doctorId ?? "unassigned", Number(l.labOrdersCostRub || 0)]),
			);

			// 2c. Зарплатные ведомости Т-51 (начисленные сдельные комиссии врачей)
			const docPayrollRes = await db
				.select({
					doctorId: doctorPayrollStatements.doctorId,
					payrollRub: sql<number>`coalesce(sum(${doctorPayrollStatements.calculatedPieceworkRub}), 0)`,
					labCostRub: sql<number>`coalesce(sum(${doctorPayrollStatements.labCostRub}), 0)`,
					finalPayoutRub: sql<number>`coalesce(sum(${doctorPayrollStatements.netPayoutRub}), 0)`,
				})
				.from(doctorPayrollStatements)
				.where(
					and(
						eq(doctorPayrollStatements.organizationId, orgId),
						startDate
							? gte(
									doctorPayrollStatements.period,
									sql`to_char(${startDate}::date, 'YYYY-MM')`,
								)
							: sql`true`,
					),
				)
				.groupBy(doctorPayrollStatements.doctorId);
			const docPayrollMap = new Map(
				docPayrollRes.map((p) => [p.doctorId, Number(p.payrollRub || 0)]),
			);

			const allDoctorIds = Array.from(
				new Set([
					...docProfRes.map((r) => r.doctorId),
					...docApptRes.map((r) => r.doctorId),
					...docServicesRes.map((r) => r.doctorId),
					...docLabRes.map((r) => r.doctorId),
					...docPayrollRes.map((r) => r.doctorId),
				]),
			);

			const doctorProfitabilityJson = allDoctorIds
				.map((docId) => {
					const prof = docProfRes.find(
						(p) => (p.doctorId ?? null) === (docId ?? null),
					);
					const appt = docApptMap.get(docId ?? "unassigned");
					const revenue = Number(prof?.revenue || 0);
					const appointmentsCount = Number(appt?.totalAppointments || 0);
					const completedCount = Number(appt?.completedAppointments || 0);
					const workedMinutes = Number(appt?.totalMinutes || 0);
					const workedHours = Math.round((workedMinutes / 60) * 10) / 10;
					const avgTicketRub =
						completedCount > 0
							? Math.round(revenue / completedCount)
							: appointmentsCount > 0
								? Math.round(revenue / appointmentsCount)
								: 0;
					const hourlyRevenueRub =
						workedMinutes > 0
							? Math.round(revenue / (workedMinutes / 60))
							: 0;
					const completionRate =
						appointmentsCount > 0
							? Math.round((completedCount / appointmentsCount) * 100)
							: null;
					const services804nCount = docServicesMap.get(docId ?? "unassigned") || 0;
					const labOrdersCount = docLabMap.get(docId ?? "unassigned") || 0;
					const labOrdersCostRub = docLabCostMap.get(docId ?? "unassigned") || 0;
					// Реальная зарплатная комиссия врача Т-51 из ведомостей или расчетная по стандартной ставке 25% (Net Revenue)
					const recordedPayroll = docId ? (docPayrollMap.get(docId) || 0) : 0;
					const doctorPayrollRub = recordedPayroll > 0
						? recordedPayroll
						: revenue > 0
							? Math.round(Math.max(0, revenue - labOrdersCostRub) * 0.25)
							: 0;
					const clinicMarginRub = revenue > 0
						? revenue - labOrdersCostRub - doctorPayrollRub
						: 0;
					const margin = revenue > 0
						? Math.round((clinicMarginRub / revenue) * 100)
						: null;

					return {
						doctorId: docId ?? null,
						name: docId
							? docMap.get(docId) || "Врач клиники"
							: "Общая касса",
						revenue,
						appointmentsCount,
						avgTicketRub,
						workedHours,
						hourlyRevenueRub,
						margin,
						completionRate,
						services804nCount,
						labOrdersCount,
						labOrdersCostRub,
						doctorPayrollRub,
						clinicMarginRub,
					};
				})
				.filter(
					(x) =>
						x.revenue > 0 ||
						(x.appointmentsCount ?? 0) > 0 ||
						(x.services804nCount ?? 0) > 0 ||
						(x.labOrdersCount ?? 0) > 0 ||
						(x.doctorPayrollRub ?? 0) > 0,
				)
				.sort((a, b) => b.revenue - a.revenue);

			// 3. Chair Utilization (% времени в кресле от доступного рабочего времени смены)
			const daysInPeriod = startDate
				? Math.max(
						1,
						Math.ceil(
							(now.getTime() - startDate.getTime()) /
								(1000 * 60 * 60 * 24),
						),
					)
				: 30;
			const availableMinutesPerChair = daysInPeriod * 12 * 60; // 12-часовая рабочая смена

			const chairUtilRes = await db
				.select({
					chairId: appointments.chairId,
					count: sql<number>`count(*)::int`,
					occupiedMinutes: sql<number>`coalesce(sum(case when ${appointments.status} not in ('cancelled', 'no_show') then extract(epoch from (${appointments.endsAt} - ${appointments.startsAt})) / 60 else 0 end), 0)::int`,
				})
				.from(appointments)
				.where(withDate(appointments.organizationId, appointments.startsAt))
				.groupBy(appointments.chairId);

			const allChairs = await db
				.select({ id: chairs.id, name: chairs.name })
				.from(chairs)
				.where(eq(chairs.organizationId, orgId));
			const chairMap = new Map(allChairs.map((c) => [c.id, c.name]));

			const colors = [
				"#8b5cf6",
				"#ec4899",
				"#f59e0b",
				"#10b981",
				"#3b82f6",
				"#06b6d4",
				"#a855f7",
			];
			const chairUtilizationJson = chairUtilRes
				.map((r, i) => {
					const count = Number(r.count || 0);
					const occupiedMinutes = Number(r.occupiedMinutes || 0);
					const utilizationPercent =
						availableMinutesPerChair > 0
							? Math.min(
									100,
									Math.round(
										(occupiedMinutes / availableMinutesPerChair) * 1000,
									) / 10,
								)
							: 0;
					return {
						chairId: r.chairId ?? null,
						name: r.chairId
							? chairMap.get(r.chairId) || "Кресло"
							: "Основное кресло",
						value: count,
						occupiedMinutes,
						availableMinutes: availableMinutesPerChair,
						utilizationPercent,
						fill: colors[i % colors.length]!,
					};
				})
				.filter((x) => x.value > 0);

			// 4. Cohort LTV — payments grouped by patient creation month
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
			const cohortZone = await postgresKnowsTimeZone(
				await clinicTimeZone(orgId),
			);
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
				// biome-ignore lint/style/noNonNullAssertion: automated suppression
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
						arr.length
							? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
							: 0;
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
				.select({
					total: sql<number>`coalesce(sum(${payments.amountRub}), 0)`,
					cash: sql<number>`coalesce(sum(case when ${payments.method} = 'cash' then ${payments.amountRub} else 0 end), 0)`,
					card: sql<number>`coalesce(sum(case when ${payments.method} = 'card' then ${payments.amountRub} else 0 end), 0)`,
					cashless: sql<number>`coalesce(sum(case when ${payments.method} in ('bank_transfer', 'online') then ${payments.amountRub} else 0 end), 0)`,
					advance: sql<number>`coalesce(sum(case when ${payments.method} in ('family_wallet', 'insurance', 'other') then ${payments.amountRub} else 0 end), 0)`,
					sbp: sql<number>`coalesce(sum(case when ${payments.method} = 'online' then ${payments.amountRub} else 0 end), 0)`,
					bankTransfer: sql<number>`coalesce(sum(case when ${payments.method} = 'bank_transfer' then ${payments.amountRub} else 0 end), 0)`,
					insurance: sql<number>`coalesce(sum(case when ${payments.method} = 'insurance' then ${payments.amountRub} else 0 end), 0)`,
				})
				.from(payments)
				// Только фактически полученные деньги (см. комментарий выше).
				.where(
					and(
						withDate(payments.organizationId, payments.createdAt),
						eq(payments.status, "paid"),
					),
				);

			// Средний чек считается на ПЛАТИВШИХ пациентов. Раньше делили выручку
			// периода на число пациентов, ЗАРЕГИСТРИРОВАННЫХ в этом периоде: при
			// 10 новых пациентах и выручке со старых средний чек улетал в космос.
			const [payingPatientRow] = await db
				.select({ count: sql<number>`count(distinct ${payments.patientId})` })
				.from(payments)
				.where(
					and(
						withDate(payments.organizationId, payments.createdAt),
						eq(payments.status, "paid"),
					),
				);

			const [apptCountRow] = await db
				.select({ count: sql<number>`count(*)` })
				.from(appointments)
				.where(withDate(appointments.organizationId, appointments.startsAt));

			// 5. 3-Tier Treatment Plan Acceptance Rate & Primary Consultation Conversion
			const allPlans = await db
				.select({
					id: treatmentPlans.id,
					name: treatmentPlans.name,
					status: treatmentPlans.status,
					totalPriceRub: treatmentPlans.totalPriceRub,
					totalPrice: treatmentPlans.totalPrice,
				})
				.from(treatmentPlans)
				.where(
					withDate(treatmentPlans.organizationId, treatmentPlans.createdAt),
				);

			const [consultationApptRow] = await db
				.select({
					count: sql<number>`count(*)::int`,
				})
				.from(appointments)
				.where(
					and(
						withDate(appointments.organizationId, appointments.startsAt),
						sql`(${appointments.reason} ilike '%конс%' or ${appointments.reason} ilike '%первич%' or ${appointments.reason} is null)`,
					),
				);

			const totalConsultations = Number(consultationApptRow?.count ?? 0);

			type TierKey = "basic" | "optimum" | "premium";
			const tierGroups: Record<
				TierKey,
				{
					label: string;
					totalPlans: number;
					acceptedPlans: number;
					totalRub: number;
				}
			> = {
				basic: {
					label: "Базовый (эконом)",
					totalPlans: 0,
					acceptedPlans: 0,
					totalRub: 0,
				},
				optimum: {
					label: "Оптимальный (стандарт)",
					totalPlans: 0,
					acceptedPlans: 0,
					totalRub: 0,
				},
				premium: {
					label: "Премиум (комплексный)",
					totalPlans: 0,
					acceptedPlans: 0,
					totalRub: 0,
				},
			};

			for (const plan of allPlans) {
				const price = Number(plan.totalPriceRub || plan.totalPrice || 0);
				const nameLower = (plan.name || "").toLowerCase();
				let tier: TierKey = "optimum";
				if (
					nameLower.includes("премиум") ||
					nameLower.includes("комплекс") ||
					nameLower.includes("all-on") ||
					price >= 150_000
				) {
					tier = "premium";
				} else if (
					nameLower.includes("базов") ||
					nameLower.includes("эконом") ||
					nameLower.includes("терапевт") ||
					price < 50_000
				) {
					tier = "basic";
				}

				tierGroups[tier].totalPlans += 1;
				const isAccepted =
					plan.status === "Approved" ||
					plan.status === "Active" ||
					plan.status === "Completed";
				if (isAccepted) {
					tierGroups[tier].acceptedPlans += 1;
					tierGroups[tier].totalRub += price;
				}
			}

			const totalPlansCount = allPlans.length;
			const acceptedPlansCount = Object.values(tierGroups).reduce(
				(s, g) => s + g.acceptedPlans,
				0,
			);
			const overallAcceptancePercent =
				totalPlansCount > 0
					? Math.round((acceptedPlansCount / totalPlansCount) * 100)
					: 0;
			const consultationToPlanConversionPercent =
				totalConsultations > 0
					? Math.min(
							100,
							Math.round((acceptedPlansCount / totalConsultations) * 100),
						)
					: acceptedPlansCount > 0
						? 100
						: 0;

			const tierAcceptance = {
				totalConsultations,
				consultationToPlanConversionPercent,
				totalPlansCount,
				acceptedPlansCount,
				overallAcceptancePercent,
				tiers: (["basic", "optimum", "premium"] as const).map((key) => {
					const group = tierGroups[key];
					const acceptanceRatePercent =
						group.totalPlans > 0
							? Math.round((group.acceptedPlans / group.totalPlans) * 100)
							: 0;
					return {
						tier: key,
						label: group.label,
						totalPlans: group.totalPlans,
						acceptedPlans: group.acceptedPlans,
						acceptanceRatePercent,
						totalRub: group.totalRub,
					};
				}),
			};

			// 6. No-Show & Cancellation Heatmap
			const noShowTimeBucket = inClinicZone(
				appointments.startsAt,
				cohortZone,
			);
			const dowExpr = sql`extract(isodow from ${noShowTimeBucket})::int`;
			const hourExpr = sql`extract(hour from ${noShowTimeBucket})::int`;

			const noShowRaw = await db
				.select({
					dayOfWeek: dowExpr,
					hour: hourExpr,
					status: appointments.status,
					count: sql<number>`count(*)::int`,
				})
				.from(appointments)
				.where(
					and(
						withDate(appointments.organizationId, appointments.startsAt),
						sql`${appointments.status} in ('cancelled', 'no_show')`,
					),
				)
				.groupBy(dowExpr, hourExpr, appointments.status);

			const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
			const DAY_FULL_NAMES = [
				"Понедельник",
				"Вторник",
				"Среда",
				"Четверг",
				"Пятница",
				"Суббота",
				"Воскресенье",
			];

			const matrix = new Map<string, { cancelled: number; noShow: number }>();
			let totalCancelled = 0;
			let totalNoShow = 0;

			for (const row of noShowRaw) {
				const dow = Number(row.dayOfWeek || 1);
				const hr = Number(row.hour || 0);
				const cnt = Number(row.count || 0);
				const key = `${dow}_${hr}`;
				if (!matrix.has(key)) {
					matrix.set(key, { cancelled: 0, noShow: 0 });
				}
				// biome-ignore lint/style/noNonNullAssertion: safe map access
				const cell = matrix.get(key)!;
				if (row.status === "cancelled") {
					cell.cancelled += cnt;
					totalCancelled += cnt;
				} else if (row.status === "no_show") {
					cell.noShow += cnt;
					totalNoShow += cnt;
				}
			}

			const heatmapCells: Array<{
				dayOfWeek: number;
				dayName: string;
				hour: number;
				cancelledCount: number;
				noShowCount: number;
				totalLost: number;
			}> = [];

			let peakLost = 0;
			let peakDayIdx: number | null = null;
			let peakHour: number | null = null;

			for (let dow = 1; dow <= 7; dow++) {
				for (let hr = 8; hr <= 21; hr++) {
					const key = `${dow}_${hr}`;
					const entry = matrix.get(key) || { cancelled: 0, noShow: 0 };
					const totalLost = entry.cancelled + entry.noShow;
					if (totalLost > peakLost) {
						peakLost = totalLost;
						peakDayIdx = dow - 1;
						peakHour = hr;
					}
					heatmapCells.push({
						dayOfWeek: dow,
						dayName: DAY_NAMES[dow - 1] ?? `День ${dow}`,
						hour: hr,
						cancelledCount: entry.cancelled,
						noShowCount: entry.noShow,
						totalLost,
					});
				}
			}

			const noShowHeatmap = {
				totalCancelled,
				totalNoShow,
				peakDay:
					peakDayIdx !== null ? (DAY_FULL_NAMES[peakDayIdx] ?? null) : null,
				peakHour,
				cells: heatmapCells,
			};

			const totalOccupiedMins = chairUtilRes.reduce(
				(sum, r) => sum + Number(r.occupiedMinutes || 0),
				0,
			);
			const totalAvailMins = availableMinutesPerChair * Math.max(1, chairUtilRes.length);
			const chairOccupancyRate =
				totalAvailMins > 0
					? Math.min(100, Math.round((totalOccupiedMins / totalAvailMins) * 1000) / 10)
					: 0;

			const totalPayingPatients = Number(payingPatientRow?.count ?? 0);
			const primaryCount = Number(patientCountRow?.count ?? 0);
			const repeatCount = Math.max(0, totalPayingPatients - primaryCount);
			const avgChk =
				totalPayingPatients > 0
					? Math.round(Number(revenueRow?.total ?? 0) / totalPayingPatients)
					: 0;

			const data = {
				kpis: {
					totalPatients: primaryCount,
					totalRevenue: Number(revenueRow?.total ?? 0),
					cashRevenue: Number(revenueRow?.cash ?? 0),
					cardRevenue: Number(revenueRow?.card ?? 0),
					cashlessRevenue: Number(revenueRow?.cashless ?? 0),
					advanceRevenue: Number(revenueRow?.advance ?? 0),
					sbpRevenue: Number(revenueRow?.sbp ?? 0),
					bankTransferRevenue: Number(revenueRow?.bankTransfer ?? 0),
					insuranceRevenue: Number(revenueRow?.insurance ?? 0),
					bonusRevenue: 0,
					totalAppointments: Number(apptCountRow?.count ?? 0),
					avgRevenuePerPatient: avgChk,
					averageCheck: avgChk,
					primaryPatientsCount: primaryCount,
					repeatPatientsCount: repeatCount,
					chairOccupancyRatePercent: chairOccupancyRate,
				},
				// БЫЛО: при пустом результате подставлялись выдуманные данные —
				// "Иванов И.И. — 240 000 ₽", "Кресло 1 — 42%" и т.п. Новая клиника
				// видела чужие показатели как свои и принимала по ним решения.
				// Пустой массив честнее: интерфейс покажет "нет данных за период".
				cohortLtvJson,
				planFunnelJson,
				chairUtilizationJson,
				doctorProfitabilityJson,
				tierAcceptance,
				noShowHeatmap,
				// Явный признак пустого периода, чтобы интерфейс отличал "нет данных"
				// от "все показатели равны нулю".
				isEmpty:
					!cohortLtvJson.length &&
					!planFunnelJson.length &&
					!chairUtilizationJson.length &&
					!doctorProfitabilityJson.length &&
					totalPlansCount === 0 &&
					totalCancelled === 0 &&
					totalNoShow === 0 &&
					Number(revenueRow?.total ?? 0) === 0 &&
					Number(apptCountRow?.count ?? 0) === 0,
			};

			return { success: true, data };
		} catch (e) {
			request.log.error({ err: e }, "Не удалось построить аналитику");
			return reply.code(503).send({
				success: false,
				error: "AnalyticsUnavailable",
				message:
					"Не удалось построить аналитику. Данные не потеряны, повторите позже.",
			});
		}
	});

	/*
	 * ====================================================================
	 *  ФИЧА #27 — ВЫДЕЛЕННАЯ РОЛЬ «КУРАТОР ПАЦИЕНТОВ» И АНАЛИТИКА ВОРОНКИ
	 * ====================================================================
	 */
	app.get("/api/analytics/curators", async (request, reply) => {
		const readAllowed = await requireClinicalReadAccess(
			request,
			reply,
			"curator analytics",
		);
		if (!readAllowed) return;

		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"curator analytics",
		);
		if (!orgId) return;

		try {
			// 1. Сотрудники клиники с ролью куратора или смежными
			const staffList = await db
				.select({
					id: users.id,
					fullName: users.fullName,
					role: users.role,
				})
				.from(users)
				.where(eq(users.organizationId, orgId));

			const curatorUsers = staffList.filter(
				(u) =>
					u.role === "curator" ||
					u.role === "administrator" ||
					u.role === "manager" ||
					u.role === "admin" ||
					u.role === "owner",
			);

			// 2. Планы лечения и карточки пациентов
			const plans = await db
				.select({
					id: treatmentPlans.id,
					name: treatmentPlans.name,
					status: treatmentPlans.status,
					totalPriceRub: treatmentPlans.totalPriceRub,
					totalPrice: treatmentPlans.totalPrice,
					createdAt: treatmentPlans.createdAt,
					patientId: treatmentPlans.patientId,
					doctorId: treatmentPlans.doctorId,
					patientFullName: patients.fullName,
					patientPhone: patients.phone,
					patientEmail: patients.email,
					patientAdminProfile: patients.administrativeProfile,
				})
				.from(treatmentPlans)
				.innerJoin(patients, eq(treatmentPlans.patientId, patients.id))
				.where(eq(treatmentPlans.organizationId, orgId));

			// 3. Оплаты пациентов
			const patientPayments = await db
				.select({
					patientId: payments.patientId,
					totalPaid: sql<number>`coalesce(sum(${payments.amountRub}), 0)`,
				})
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, orgId),
						eq(payments.status, "paid"),
					),
				)
				.groupBy(payments.patientId);

			const paymentMap = new Map(
				patientPayments.map((p) => [p.patientId, Number(p.totalPaid)]),
			);

			const doctorMap = new Map(staffList.map((u) => [u.id, u.fullName]));

			const defaultCurator = curatorUsers[0] || {
				id: "00000000-0000-0000-0000-000000000001",
				fullName: "Куратор клиники",
			};

			const queueItems: CuratorPatientQueueItem[] = plans.map((plan) => {
				const adminProf = plan.patientAdminProfile as Record<string, unknown> | null;
				const curatorId =
					typeof adminProf?.curatorId === "string"
						? adminProf.curatorId
						: defaultCurator.id;
				const curatorName =
					typeof adminProf?.curatorFullName === "string"
						? adminProf.curatorFullName
						: doctorMap.get(curatorId) || defaultCurator.fullName;

				const planPrice = Number(plan.totalPriceRub || plan.totalPrice || 0);
				const paid = paymentMap.get(plan.patientId) || 0;
				const planPaid = Math.min(planPrice, paid);
				const remaining = Math.max(0, planPrice - planPaid);

				let stage: CuratorFunnelStage = "consultation";
				if (
					adminProf?.curatorFunnelStage === "consultation" ||
					adminProf?.curatorFunnelStage === "plan_negotiation" ||
					adminProf?.curatorFunnelStage === "prepayment" ||
					adminProf?.curatorFunnelStage === "treatment_start" ||
					adminProf?.curatorFunnelStage === "completed"
				) {
					stage = adminProf.curatorFunnelStage;
				} else {
					if (plan.status === "Completed") {
						stage = "completed";
					} else if (plan.status === "Active") {
						stage = "treatment_start";
					} else if (planPaid > 0) {
						stage = "prepayment";
					} else if (plan.status === "Approved") {
						stage = "plan_negotiation";
					} else {
						stage = "consultation";
					}
				}

				const daysInStage = Math.max(
					0,
					Math.floor(
						(Date.now() - new Date(plan.createdAt).getTime()) /
							(1000 * 60 * 60 * 24),
					),
				);

				const tier =
					planPrice >= 150_000
						? "premium"
						: planPrice < 50_000
							? "basic"
							: "optimum";

				const urgency = evaluatePatientUrgency(
					daysInStage,
					stage,
					planPrice,
					planPaid,
					adminProf?.loyaltyTier === "gold" ||
						adminProf?.loyaltyTier === "platinum",
				);

				const assignedAtStr =
					typeof adminProf?.curatorAssignedAt === "string"
						? adminProf.curatorAssignedAt
						: plan.createdAt.toISOString();

				const notesStr =
					typeof adminProf?.curatorNotes === "string"
						? adminProf.curatorNotes
						: null;

				return {
					patientId: plan.patientId,
					patientFullName: plan.patientFullName,
					patientPhone: plan.patientPhone,
					patientEmail: plan.patientEmail,
					treatmentPlanId: plan.id,
					treatmentPlanTitle: plan.name,
					planTier: tier,
					planTotalPriceRub: planPrice,
					planTotalPriceKopecks: Math.round(planPrice * 100),
					paidAmountRub: planPaid,
					paidAmountKopecks: Math.round(planPaid * 100),
					remainingAmountRub: remaining,
					remainingAmountKopecks: Math.round(remaining * 100),
					funnelStage: stage,
					curatorId,
					curatorFullName: curatorName,
					assignedAt: assignedAtStr,
					stageUpdatedAt: plan.createdAt.toISOString(),
					daysInStage,
					doctorId: plan.doctorId,
					doctorFullName: plan.doctorId ? doctorMap.get(plan.doctorId) : null,
					priorityScore: urgency.priorityScore,
					attentionFlags: urgency.attentionFlags,
					notes: notesStr,
				};
			});

			const overallMetrics = calculateCuratorMetrics(
				queueItems,
				"all",
				"Все кураторы",
			);

			const perCuratorMetrics = curatorUsers.map((cur) =>
				calculateCuratorMetrics(queueItems, cur.id, cur.fullName),
			);

			return {
				success: true,
				data: {
					curators: curatorUsers,
					overallMetrics,
					perCuratorMetrics,
					queue: queueItems,
				},
			};
		} catch (e) {
			request.log.error({ err: e }, "Не удалось загрузить аналитику кураторов");
			return reply.code(503).send({
				success: false,
				error: "CuratorAnalyticsUnavailable",
				message: "Не удалось загрузить аналитику кураторов. Повторите позже.",
			});
		}
	});

	/*
	 * ====================================================================
	 *  ФИЧА #29 — РАБОЧИЙ СТОЛ ГЕНЕРАЛЬНОГО ДИРЕКТОРА КЛИНИКИ
	 * ====================================================================
	 */
	app.get("/api/analytics/executive", async (request, reply) => {
		const readAllowed = await requireClinicalReadAccess(
			request,
			reply,
			"executive analytics",
		);
		if (!readAllowed) return;

		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"executive analytics",
		);
		if (!orgId) return;

		try {
			const { period = "month" } = request.query as { period?: string };
			const validPeriods: ExecutivePeriod[] = ["day", "month", "quarter", "year"];
			const execPeriod: ExecutivePeriod = validPeriods.includes(period as ExecutivePeriod)
				? (period as ExecutivePeriod)
				: "month";

			const now = new Date();
			let startDate: Date;
			const endDate: Date = now;

			if (execPeriod === "day") {
				startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
			} else if (execPeriod === "quarter") {
				const currentQuarterMonth = Math.floor(now.getMonth() / 3) * 3;
				startDate = new Date(now.getFullYear(), currentQuarterMonth, 1, 0, 0, 0, 0);
			} else if (execPeriod === "year") {
				startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
			} else {
				// Month
				startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
			}

			// 1. Потери расписания, явки и загрузка кресел
			const [apptSummary] = await db
				.select({
					totalAppointments: sql<number>`count(*)::int`,
					attendedCount: sql<number>`coalesce(sum(case when ${appointments.status} in ('completed', 'arrived', 'in_treatment') then 1 else 0 end), 0)::int`,
					completedCount: sql<number>`coalesce(sum(case when ${appointments.status} = 'completed' then 1 else 0 end), 0)::int`,
					cancelledCount: sql<number>`coalesce(sum(case when ${appointments.status} = 'cancelled' then 1 else 0 end), 0)::int`,
					noShowCount: sql<number>`coalesce(sum(case when ${appointments.status} = 'no_show' then 1 else 0 end), 0)::int`,
					occupiedMinutes: sql<number>`coalesce(sum(case when ${appointments.status} not in ('cancelled', 'no_show') then extract(epoch from (${appointments.endsAt} - ${appointments.startsAt})) / 60 else 0 end), 0)::int`,
				})
				.from(appointments)
				.where(
					and(
						eq(appointments.organizationId, orgId),
						gte(appointments.startsAt, startDate),
					),
				);

			const [chairCountRow] = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(chairs)
				.where(eq(chairs.organizationId, orgId));

			const totalChairs = Math.max(1, Number(chairCountRow?.count || 1));
			const daysCount = Math.max(
				1,
				Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
			);
			const totalAvailableMinutes = totalChairs * daysCount * 12 * 60; // 12-часовая смена на кресло

			// 2. Лиды и входящие обращения
			const [leadsRow] = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(crmLeads)
				.where(
					and(
						eq(crmLeads.organizationId, orgId),
						gte(crmLeads.createdAt, startDate),
					),
				);

			const [newPatientsRow] = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, orgId),
						gte(patients.createdAt, startDate),
					),
				);

			const leadsFromCrm = Number(leadsRow?.count || 0);
			const newPatients = Number(newPatientsRow?.count || 0);
			const totalLeads = leadsFromCrm + newPatients;

			// 3. Диагностика и ИИ-осмотры (Diagnocat)
			const [aiReportsRow] = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(diagnocatReports)
				.where(
					and(
						eq(diagnocatReports.organizationId, orgId),
						gte(diagnocatReports.createdAt, startDate),
					),
				);

			const [aiFindingsRow] = await db
				.select({ count: sql<number>`count(distinct ${diagnocatAiFindings.id})::int` })
				.from(diagnocatAiFindings)
				.where(
					and(
						eq(diagnocatAiFindings.organizationId, orgId),
						gte(diagnocatAiFindings.createdAt, startDate),
					),
				);

			// 3. Честный подсчет диагностических ИИ-осмотров Diagnocat AI
			// Запрещена подмена на visitsWithDiaryRow: если клиника не пользуется ИИ, честно возвращаем 0
			const aiExaminedCount = Math.max(
				Number(aiReportsRow?.count || 0),
				Number(aiFindingsRow?.count || 0),
			);

			// 4. Планы лечения и санация
			const planStats = await db
				.select({
					status: treatmentPlans.status,
					count: sql<number>`count(*)::int`,
					totalRub: sql<number>`coalesce(sum(${treatmentPlans.totalPriceRub}), 0)`,
				})
				.from(treatmentPlans)
				.where(
					and(
						eq(treatmentPlans.organizationId, orgId),
						gte(treatmentPlans.createdAt, startDate),
					),
				)
				.groupBy(treatmentPlans.status);

			let plansPresentedCount = 0;
			let plansPresentedVolumeKopecks = 0;
			let plansApprovedCount = 0;
			let plansApprovedVolumeKopecks = 0;
			let sanitationCompletedCount = 0;

			for (const row of planStats) {
				const count = Number(row.count || 0);
				const volKop = Math.round(Number(row.totalRub || 0) * 100);
				plansPresentedCount += count;
				plansPresentedVolumeKopecks += volKop;

				if (row.status === "Approved" || row.status === "Active" || row.status === "Completed") {
					plansApprovedCount += count;
					plansApprovedVolumeKopecks += volKop;
				}
				if (row.status === "Completed") {
					sanitationCompletedCount += count;
				}
			}

			// 5. Выручка и платежи (только paid)
			const [paymentsSummary] = await db
				.select({
					totalRevenueRub: sql<number>`coalesce(sum(${payments.amountRub}), 0)`,
					payingPatientsCount: sql<number>`count(distinct ${payments.patientId})::int`,
				})
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, orgId),
						gte(payments.createdAt, startDate),
						eq(payments.status, "paid"),
					),
				);

			const totalRevenueKopecks = Math.round(Number(paymentsSummary?.totalRevenueRub || 0) * 100);
			const payingPatients = Number(paymentsSummary?.payingPatientsCount || 0);

			// 6. Маркетинговые расходы (CAC & Unit Economics) из реальных cash_operations (Мандат 8s, 8k: Zero Mocks)
			const [marketingExpensesRow] = await db
				.select({
					totalSpendRub: sql<number>`coalesce(sum(${cashOperations.amountRub}), 0)`,
				})
				.from(cashOperations)
				.where(
					and(
						eq(cashOperations.organizationId, orgId),
						eq(cashOperations.operationType, "expense"),
						gte(cashOperations.createdAt, startDate),
						sql`(${cashOperations.reasonCode} = 6 or (${cashOperations.metadata}->>'category') = 'marketing')`,
					),
				);

			const totalMarketingSpendKopecks = Math.round(Number(marketingExpensesRow?.totalSpendRub || 0) * 100);

			// 7. Сборка сырых этапов 8-этапной воронки первичных пациентов
			const attendedCount = Number(apptSummary?.attendedCount || 0);
			const bookingsCount = Number(apptSummary?.totalAppointments || 0);

			const rawFunnelStages = [
				{ stage: "lead" as ExecutiveFunnelStage, count: totalLeads },
				{ stage: "consultation_booking" as ExecutiveFunnelStage, count: bookingsCount },
				{ stage: "attended" as ExecutiveFunnelStage, count: attendedCount },
				{ stage: "ai_examination" as ExecutiveFunnelStage, count: aiExaminedCount, isAiAssisted: true },
				{ stage: "plan_presentation" as ExecutiveFunnelStage, count: plansPresentedCount, totalVolumeKopecks: plansPresentedVolumeKopecks },
				{ stage: "plan_approved" as ExecutiveFunnelStage, count: plansApprovedCount, totalVolumeKopecks: plansApprovedVolumeKopecks },
				{ stage: "treatment_started" as ExecutiveFunnelStage, count: payingPatients, totalVolumeKopecks: totalRevenueKopecks },
				{ stage: "sanitation_completed" as ExecutiveFunnelStage, count: sanitationCompletedCount },
			];

			const calculatedFunnelStages = calculateExecutiveFunnel(
				rawFunnelStages,
				totalMarketingSpendKopecks,
			);

			// 8. План/факт выручки по 5 отделениям из реальных данных treatmentItems / serviceCatalogItems
			// Для соло-врача и небольшой клиники (Мандат 8n) план отражает честный факт выручки по 54-ФЗ без симуляций невыполнения
			const targetPlanRevenueKopecks = totalRevenueKopecks;

			const departmentRows = await db
				.select({
					category: serviceCatalogItems.category,
					specialty: serviceCatalogItems.specialty,
					revenueRub: sql<number>`coalesce(sum(${treatmentItems.priceRub}), 0)`,
					visitsCount: sql<number>`count(distinct ${treatmentItems.visitId})::int`,
					patientsCount: sql<number>`count(distinct ${treatmentItems.patientId})::int`,
				})
				.from(treatmentItems)
				.leftJoin(serviceCatalogItems, eq(treatmentItems.serviceId, serviceCatalogItems.id))
				.leftJoin(visits, eq(treatmentItems.visitId, visits.id))
				.where(
					and(
						eq(treatmentItems.organizationId, orgId),
						ne(treatmentItems.status, "cancelled"),
						gte(visits.createdAt, startDate),
					),
				)
				.groupBy(serviceCatalogItems.category, serviceCatalogItems.specialty);

			const deptMap: Record<ExecutiveDepartmentKey, { factRevenueKop: number; visits: number; patients: number }> = {
				therapy: { factRevenueKop: 0, visits: 0, patients: 0 },
				orthopedics: { factRevenueKop: 0, visits: 0, patients: 0 },
				surgery_implantation: { factRevenueKop: 0, visits: 0, patients: 0 },
				orthodontics: { factRevenueKop: 0, visits: 0, patients: 0 },
				pediatric: { factRevenueKop: 0, visits: 0, patients: 0 },
			};

			for (const row of departmentRows) {
				const cat = row.category;
				const spec = row.specialty;
				let key: ExecutiveDepartmentKey = "therapy";
				if (spec === "pediatric") {
					key = "pediatric";
				} else if (cat === "orthodontics" || spec === "orthodontist") {
					key = "orthodontics";
				} else if (cat === "surgery" || spec === "surgeon" || spec === "implantologist") {
					key = "surgery_implantation";
				} else if (cat === "prosthetics" || spec === "orthopedist") {
					key = "orthopedics";
				} else {
					key = "therapy";
				}

				deptMap[key].factRevenueKop += Math.round(Number(row.revenueRub || 0) * 100);
				deptMap[key].visits += Number(row.visitsCount || 0);
				deptMap[key].patients += Number(row.patientsCount || 0);
			}

			const rawDepartments = [
				{
					departmentKey: "therapy" as ExecutiveDepartmentKey,
					planRevenueKopecks: deptMap.therapy.factRevenueKop,
					factRevenueKopecks: deptMap.therapy.factRevenueKop,
					completedVisitsCount: deptMap.therapy.visits,
					uniquePatientsCount: deptMap.therapy.patients,
				},
				{
					departmentKey: "orthopedics" as ExecutiveDepartmentKey,
					planRevenueKopecks: deptMap.orthopedics.factRevenueKop,
					factRevenueKopecks: deptMap.orthopedics.factRevenueKop,
					completedVisitsCount: deptMap.orthopedics.visits,
					uniquePatientsCount: deptMap.orthopedics.patients,
				},
				{
					departmentKey: "surgery_implantation" as ExecutiveDepartmentKey,
					planRevenueKopecks: deptMap.surgery_implantation.factRevenueKop,
					factRevenueKopecks: deptMap.surgery_implantation.factRevenueKop,
					completedVisitsCount: deptMap.surgery_implantation.visits,
					uniquePatientsCount: deptMap.surgery_implantation.patients,
				},
				{
					departmentKey: "orthodontics" as ExecutiveDepartmentKey,
					planRevenueKopecks: deptMap.orthodontics.factRevenueKop,
					factRevenueKopecks: deptMap.orthodontics.factRevenueKop,
					completedVisitsCount: deptMap.orthodontics.visits,
					uniquePatientsCount: deptMap.orthodontics.patients,
				},
				{
					departmentKey: "pediatric" as ExecutiveDepartmentKey,
					planRevenueKopecks: deptMap.pediatric.factRevenueKop,
					factRevenueKopecks: deptMap.pediatric.factRevenueKop,
					completedVisitsCount: deptMap.pediatric.visits,
					uniquePatientsCount: deptMap.pediatric.patients,
				},
			];

			const calculatedDepartments = calculateDepartmentBreakdown(rawDepartments);

			// 9. Активные врачи
			const [activeDocsRow] = await db
				.select({ count: sql<number>`count(distinct ${appointments.doctorUserId})::int` })
				.from(appointments)
				.where(
					and(
						eq(appointments.organizationId, orgId),
						gte(appointments.startsAt, startDate),
					),
				);

			// 10. Исторический когортный LTV по всем оплатившим пациентам
			const [historicalLtvRow] = await db
				.select({
					totalRevenueRub: sql<number>`coalesce(sum(${payments.amountRub}), 0)`,
					payingPatientsCount: sql<number>`count(distinct ${payments.patientId})::int`,
				})
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, orgId),
						eq(payments.status, "paid"),
					),
				);

			const histPayingPatients = Number(historicalLtvRow?.payingPatientsCount || 0);
			const histTotalRevenueKop = Math.round(Number(historicalLtvRow?.totalRevenueRub || 0) * 100);
			const historicalCohortLtvKopecks =
				histPayingPatients > 0 ? Math.round(histTotalRevenueKop / histPayingPatients) : 0;

			// 11. Фактическое разделение первичной и повторной выручки
			const patientRevenueRows = await db
				.select({
					isPrimary: sql<boolean>`case when ${patients.createdAt} >= ${startDate} then true else false end`,
					totalRevenueRub: sql<number>`coalesce(sum(${payments.amountRub}), 0)`,
					patientsCount: sql<number>`count(distinct ${payments.patientId})::int`,
				})
				.from(payments)
				.innerJoin(patients, eq(payments.patientId, patients.id))
				.where(
					and(
						eq(payments.organizationId, orgId),
						gte(payments.createdAt, startDate),
						eq(payments.status, "paid"),
					),
				)
				.groupBy(sql`case when ${patients.createdAt} >= ${startDate} then true else false end`);

			let primaryRevenueKopecks = 0;
			let repeatRevenueKopecks = 0;
			let primaryPatientsCount = 0;
			let repeatPatientsCount = 0;

			for (const row of patientRevenueRows) {
				const revKop = Math.round(Number(row.totalRevenueRub || 0) * 100);
				const count = Number(row.patientsCount || 0);
				if (row.isPrimary) {
					primaryRevenueKopecks += revKop;
					primaryPatientsCount += count;
				} else {
					repeatRevenueKopecks += revKop;
					repeatPatientsCount += count;
				}
			}

			// 12. Расчет сводных KPI
			const kpis = calculateExecutiveKpisSummary({
				period: execPeriod,
				totalRevenueKopecks,
				totalRevenuePlanKopecks: targetPlanRevenueKopecks,
				primaryRevenueKopecks,
				repeatRevenueKopecks,
				primaryPatientsCount,
				repeatPatientsCount,
				totalMarketingSpendKopecks,
				historicalCohortLtvKopecks,
				totalOccupiedMinutes: Number(apptSummary?.occupiedMinutes || 0),
				totalAvailableMinutes,
				totalChairsCount: totalChairs,
				totalLeadsCount: totalLeads,
				aiExaminedLeadsCount: aiExaminedCount,
				totalSanitationCount: sanitationCompletedCount,
				totalCompletedVisits: Number(apptSummary?.completedCount || 0),
				activeDoctorsCount: Number(activeDocsRow?.count || 0),
				cancelledVisitsCount: Number(apptSummary?.cancelledCount || 0),
				noShowVisitsCount: Number(apptSummary?.noShowCount || 0),
			});

			const payload: ExecutiveDashboardPayload = {
				kpis,
				funnelStages: calculatedFunnelStages,
				departments: calculatedDepartments,
				period: execPeriod,
				dateRangeStartIso: startDate.toISOString(),
				dateRangeEndIso: endDate.toISOString(),
				updatedAtIso: now.toISOString(),
				isEmpty: totalRevenueKopecks === 0 && Number(apptSummary?.totalAppointments || 0) === 0 && plansPresentedCount === 0,
			};

			return {
				success: true,
				data: payload,
			};
		} catch (e) {
			request.log.error({ err: e }, "Не удалось сформировать дашборд генерального директора");
			return reply.code(503).send({
				success: false,
				error: "ExecutiveDashboardUnavailable",
				message: "Не удалось сформировать дашборд генерального директора. Повторите позже.",
			});
		}
	});

	/**
	 * ====================================================================
	 *  ФИЧА #54 / #61 — АЛГОРИТМ 15-МИНУТНОГО ОКНА КОНВЕРСИИ ПОВТОРНОЙ ЗАПИСИ
	 *  (Врач vs Администратор, Мандаты 8e, 8n & 8j)
	 * ====================================================================
	 */
	app.get("/api/analytics/rebooking-conversion", async (request, reply) => {
		const readAllowed = await requireClinicalReadAccess(
			request,
			reply,
			"rebooking conversion analytics",
		);
		if (!readAllowed) return;

		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"rebooking conversion analytics",
		);
		if (!orgId) return;

		try {
			const {
				range = "month",
				startDate: qStartDate,
				endDate: qEndDate,
				period_start: qPeriodStart,
				period_end: qPeriodEnd,
				doctorId: qDoctorId,
				doctor_id: qDoctorIdSnake,
				specialty: qSpecialty,
				isSoloDoctor: qIsSoloDoctor,
			} = request.query as {
				range?: string;
				startDate?: string;
				endDate?: string;
				period_start?: string;
				period_end?: string;
				doctorId?: string;
				doctor_id?: string;
				specialty?: string;
				isSoloDoctor?: string | boolean;
			};

			const targetDoctorId = qDoctorId || qDoctorIdSnake || undefined;
			const targetSpecialty = qSpecialty?.trim() || undefined;

			// Определение соло-режима (Мандат 8n: Solo Doctor & Small Clinic):
			// 1) Явный флаг из query (?isSoloDoctor=true)
			// 2) Режим клиники (solo_doctor | one_chair) из таблицы organizations
			// 3) Количество кабинетов/кресел <= 1 в таблице chairs
			let isSoloDoctor =
				qIsSoloDoctor === true ||
				qIsSoloDoctor === "true" ||
				qIsSoloDoctor === "1";

			if (!isSoloDoctor) {
				const [orgRecord] = await db
					.select({ clinicMode: organizations.clinicMode })
					.from(organizations)
					.where(eq(organizations.id, orgId))
					.limit(1);

				if (
					orgRecord?.clinicMode === "solo_doctor" ||
					orgRecord?.clinicMode === "one_chair"
				) {
					isSoloDoctor = true;
				} else {
					const chairsList = await db
						.select({ id: chairs.id })
						.from(chairs)
						.where(eq(chairs.organizationId, orgId))
						.limit(2);

					if (chairsList.length <= 1) {
						isSoloDoctor = true;
					}
				}
			}

			const now = new Date();
			let startDate: Date | undefined;
			let endDate: Date | undefined;

			if (qStartDate || qPeriodStart) {
				startDate = new Date((qStartDate || qPeriodStart)!);
			}
			if (qEndDate || qPeriodEnd) {
				endDate = new Date((qEndDate || qPeriodEnd)!);
			}

			if (!startDate) {
				if (range === "today") {
					startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
					endDate = endDate || new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
				} else if (range === "week") {
					const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
					startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
				} else if (range === "month" || range === "last_month") {
					startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
				} else if (range === "quarter" || range === "last_3_months") {
					const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
					startDate = new Date(now.getFullYear(), quarterMonth, 1, 0, 0, 0, 0);
				} else if (range === "year" || range === "this_year") {
					startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
				}
			}
			if (!endDate) {
				endDate = now;
			}

			// 1. Загружаем уже зафиксированные правила из таблицы rebooking_conversion_rules
			const storedRules = await db
				.select()
				.from(rebookingConversionRules)
				.where(
					and(
						eq(rebookingConversionRules.organizationId, orgId),
						startDate ? gte(rebookingConversionRules.createdAt, startDate) : undefined,
						endDate ? lte(rebookingConversionRules.createdAt, endDate) : undefined,
					),
				);

			// 2. Загружаем завершённые визиты клиники за указанный период
			const completedVisits = await db
				.select({
					visitId: visits.id,
					patientId: visits.patientId,
					patientName: patients.fullName,
					appointmentId: visits.appointmentId,
					signedAt: visits.signedAt,
					updatedAt: visits.updatedAt,
					createdAt: visits.createdAt,
					doctorUserId: appointments.doctorUserId,
					doctorName: users.fullName,
					doctorRole: users.role,
					doctorSpecialties: users.specialties,
					appointmentStartsAt: appointments.startsAt,
					appointmentEndsAt: appointments.endsAt,
				})
				.from(visits)
				.innerJoin(patients, eq(visits.patientId, patients.id))
				.leftJoin(appointments, eq(visits.appointmentId, appointments.id))
				.leftJoin(users, eq(appointments.doctorUserId, users.id))
				.where(
					and(
						eq(visits.organizationId, orgId),
						or(
							eq(visits.status, "signed"),
							sql`${visits.signedAt} is not null`,
						),
						startDate
							? gte(sql`coalesce(${visits.signedAt}, ${visits.updatedAt}, ${visits.createdAt})`, startDate)
							: undefined,
						endDate
							? lte(sql`coalesce(${visits.signedAt}, ${visits.updatedAt}, ${visits.createdAt})`, endDate)
							: undefined,
						targetDoctorId ? eq(appointments.doctorUserId, targetDoctorId) : undefined,
					),
				);

			// 3. Загружаем все последующие приёмы пациентов для расчёта дельты \Delta t
			const patientIds = Array.from(
				new Set(completedVisits.map((v) => v.patientId).filter(Boolean)),
			);

			const appointmentsPool =
				patientIds.length > 0
					? await db
							.select({
								id: appointments.id,
								patientId: appointments.patientId,
								doctorUserId: appointments.doctorUserId,
								startsAt: appointments.startsAt,
								endsAt: appointments.endsAt,
								status: appointments.status,
								doctorName: users.fullName,
								doctorSpecialties: users.specialties,
							})
							.from(appointments)
							.leftJoin(users, eq(appointments.doctorUserId, users.id))
							.where(
								and(
									eq(appointments.organizationId, orgId),
									inArray(appointments.patientId, patientIds),
									ne(appointments.status, "cancelled"),
								),
							)
					: [];

			// 4. Анализируем завершённые визиты и вычисляем конверсию по окну 15 минут
			interface RebookingEvent {
				id: string;
				patientName: string;
				rebookedBy: string;
				timeDeltaMinutes: number;
				creditedRole: "doctor" | "administrator";
				appointmentDate: string;
				createdAt: Date;
				attributionReason: string;
				doctorId?: string | null | undefined;
				doctorName?: string | null | undefined;
				specialty?: string | undefined;
			}

			const computedEvents: RebookingEvent[] = [];
			const processedApptIds = new Set<string>();

			for (const visit of completedVisits) {
				const completedAt =
					visit.signedAt ?? visit.updatedAt ?? visit.appointmentEndsAt ?? visit.createdAt;

				// Ищем приёмы того же пациента, созданные/начинающиеся после или во время визита
				const patientAppts = appointmentsPool.filter(
					(a) =>
						a.patientId === visit.patientId &&
						a.id !== visit.appointmentId &&
						!processedApptIds.has(a.id),
				);

				// Находим ближайший последующий приём
				let candidateAppt: (typeof appointmentsPool)[0] | null = null;
				let minDeltaMs = Number.POSITIVE_INFINITY;

				for (const appt of patientAppts) {
					const apptCreatedAt =
						extractCreatedAtFromUuidV7(appt.id) ?? appt.startsAt;
					const deltaMs = apptCreatedAt.getTime() - completedAt.getTime();

					// Запись у кресла может быть сделана прямо во время приёма (deltaMs <= 0)
					// либо в течение последующего времени
					if (deltaMs >= -1800000 && deltaMs < minDeltaMs) {
						minDeltaMs = deltaMs;
						candidateAppt = appt;
					}
				}

				if (candidateAppt) {
					processedApptIds.add(candidateAppt.id);
					const apptCreatedAt =
						extractCreatedAtFromUuidV7(candidateAppt.id) ?? candidateAppt.startsAt;
					const { deltaMinutes, creditedRole, attributionReason } =
						calculateRebookingDeltaMinutes(apptCreatedAt, completedAt, isSoloDoctor);

					const doctorName = visit.doctorName || candidateAppt.doctorName || "Врач у кресла";
					const rebookedBy =
						creditedRole === "doctor" ? doctorName : "Администратор / Ресепшен";

					computedEvents.push({
						id: candidateAppt.id,
						patientName: visit.patientName || "Пациент",
						rebookedBy,
						timeDeltaMinutes: deltaMinutes,
						creditedRole,
						appointmentDate: candidateAppt.startsAt.toISOString().slice(0, 10),
						createdAt: apptCreatedAt,
						attributionReason,
						doctorId: visit.doctorUserId ?? candidateAppt.doctorUserId ?? null,
						doctorName,
						specialty: formatDoctorSpecialty(visit.doctorSpecialties ?? candidateAppt.doctorSpecialties),
					});
				}
			}

			// 5. Синхронизируем вычисленные события в таблицу rebooking_conversion_rules (наполнение реальными данными)
			const existingKeys = new Set(
				storedRules.map(
					(r) => `${r.patientName}__${r.appointmentDate}__${r.creditedRole}`,
				),
			);
			const rulesToInsert: Array<typeof rebookingConversionRules.$inferInsert> = [];

			for (const ev of computedEvents) {
				const key = `${ev.patientName}__${ev.appointmentDate}__${ev.creditedRole}`;
				if (!existingKeys.has(key)) {
					existingKeys.add(key);
					rulesToInsert.push({
						organizationId: orgId,
						patientName: ev.patientName,
						rebookedBy: ev.rebookedBy,
						timeDeltaMinutes: ev.timeDeltaMinutes,
						creditedRole: ev.creditedRole,
						appointmentDate: ev.appointmentDate,
						createdAt: ev.createdAt,
					});
				}
			}

			if (rulesToInsert.length > 0) {
				try {
					await db.insert(rebookingConversionRules).values(rulesToInsert);
				} catch (err) {
					request.log.warn({ err }, "Не удалось зафиксировать кэш rebooking_conversion_rules");
				}
			}

			// 6. Объединяем сохранённые и вычисленные записи
			const allRecordsMap = new Map<string, RebookingEvent>();

			for (const rule of storedRules) {
				const key = `${rule.patientName}__${rule.appointmentDate}__${rule.creditedRole}`;
				allRecordsMap.set(key, {
					id: rule.id,
					patientName: rule.patientName,
					rebookedBy: rule.rebookedBy,
					timeDeltaMinutes: rule.timeDeltaMinutes,
					creditedRole: rule.creditedRole === "doctor" ? "doctor" : "administrator",
					appointmentDate: rule.appointmentDate,
					createdAt: rule.createdAt,
					attributionReason:
						rule.creditedRole === "doctor"
							? "chairside_rebooking_under_15m"
							: "frontdesk_rebooking_over_15m",
					doctorName: rule.creditedRole === "doctor" ? rule.rebookedBy : null,
				});
			}

			for (const ev of computedEvents) {
				const key = `${ev.patientName}__${ev.appointmentDate}__${ev.creditedRole}`;
				if (!allRecordsMap.has(key)) {
					allRecordsMap.set(key, ev);
				}
			}

			const allRecords = Array.from(allRecordsMap.values());

			// 7. Агрегируем метрики по сотрудникам (Врачи vs Администраторы)
			const totalCompletedVisits = completedVisits.length;
			let doctorRebookingsCount = 0;
			let adminRebookingsCount = 0;

			// Статистика по врачам
			const doctorsMap = new Map<
				string,
				{
					staffId: string | null;
					staffName: string;
					role: string;
					specialty: string;
					completedVisitsCount: number;
					doctorRebookingsCount: number;
					adminRebookingsCount: number;
				}
			>();

			// Инициализируем врачей из завершённых визитов
			for (const visit of completedVisits) {
				const docId = visit.doctorUserId || "unassigned";
				const docName = visit.doctorName || "Врач без назначения";
				const specialty = formatDoctorSpecialty(visit.doctorSpecialties);

				if (!doctorsMap.has(docId)) {
					doctorsMap.set(docId, {
						staffId: visit.doctorUserId,
						staffName: docName,
						role: "doctor",
						specialty,
						completedVisitsCount: 0,
						doctorRebookingsCount: 0,
						adminRebookingsCount: 0,
					});
				}
				const docStat = doctorsMap.get(docId)!;
				docStat.completedVisitsCount++;
			}

			// Распределяем повторные записи
			for (const rec of allRecords) {
				if (rec.creditedRole === "doctor") {
					doctorRebookingsCount++;
					const docId = rec.doctorId || "unassigned";
					if (doctorsMap.has(docId)) {
						doctorsMap.get(docId)!.doctorRebookingsCount++;
					} else {
						doctorsMap.set(docId, {
							staffId: rec.doctorId ?? null,
							staffName: rec.rebookedBy || rec.doctorName || "Врач у кресла",
							role: "doctor",
							specialty: rec.specialty || "Стоматолог общей практики",
							completedVisitsCount: 0,
							doctorRebookingsCount: 1,
							adminRebookingsCount: 0,
						});
					}
				} else {
					adminRebookingsCount++;
					const docId = rec.doctorId || "unassigned";
					if (doctorsMap.has(docId)) {
						doctorsMap.get(docId)!.adminRebookingsCount++;
					}
				}
			}

			const totalRebookings = doctorRebookingsCount + adminRebookingsCount;

			const doctorConversionRate =
				totalCompletedVisits > 0
					? Math.round((doctorRebookingsCount / totalCompletedVisits) * 1000) / 10
					: 0;

			const adminConversionRate =
				totalCompletedVisits > 0
					? Math.round((adminRebookingsCount / totalCompletedVisits) * 1000) / 10
					: 0;

			const overallConversionRate =
				totalCompletedVisits > 0
					? Math.round((totalRebookings / totalCompletedVisits) * 1000) / 10
					: 0;

			// Формируем список по сотрудникам
			const byStaff = Array.from(doctorsMap.values())
				.filter((d) => !targetSpecialty || d.specialty.toLowerCase().includes(targetSpecialty.toLowerCase()))
				.map((d) => {
					const convRate =
						d.completedVisitsCount > 0
							? Math.round((d.doctorRebookingsCount / d.completedVisitsCount) * 1000) / 10
							: 0;
					return {
						staffId: d.staffId,
						staffName: d.staffName,
						role: "doctor" as "doctor" | "administrator",
						specialty: d.specialty,
						completedVisitsCount: d.completedVisitsCount,
						doctorRebookingsCount: d.doctorRebookingsCount,
						adminRebookingsCount: d.adminRebookingsCount,
						rebookingCount: d.doctorRebookingsCount + d.adminRebookingsCount,
						conversionRate: convRate,
						chairsideRetentionRate: convRate,
						retentionKpiStatus: convRate >= 70 ? ("target_met" as const) : ("needs_improvement" as const),
						targetKpiPercent: 70,
					};
				});

			// Добавляем администраторов отдельной строкой
			byStaff.push({
				staffId: null,
				staffName: "Администратор / Ресепшен",
				role: "administrator" as const,
				specialty: "Регистратура / Колл-центр",
				completedVisitsCount: 0,
				doctorRebookingsCount: 0,
				adminRebookingsCount: adminRebookingsCount,
				rebookingCount: adminRebookingsCount,
				conversionRate: adminConversionRate,
				chairsideRetentionRate: 0,
				retentionKpiStatus: "target_met" as const,
				targetKpiPercent: 70,
			});

			return {
				success: true,
				data: {
					summary: {
						totalCompletedVisits,
						totalVisits: totalCompletedVisits,
						totalRebookings,
						rebookingRate: overallConversionRate,
						doctorRebookingsCount,
						chairsideRebookingsCount: doctorRebookingsCount,
						adminRebookingsCount,
						frontdeskRebookingsCount: adminRebookingsCount,
						doctorConversionRate,
						adminConversionRate,
						overallConversionRate,
						chairsideRetentionRate: doctorConversionRate,
						thresholdMinutes: 15,
						isSoloDoctor,
						isEmpty: totalCompletedVisits === 0 && totalRebookings === 0,
					},
					byStaff,
					byDoctors: byStaff.filter((s) => s.role === "doctor"),
					events: computedEvents.map((e) => ({
						id: e.id,
						patientName: e.patientName,
						rebookedBy: e.rebookedBy,
						timeDeltaMinutes: e.timeDeltaMinutes,
						creditedRole: e.creditedRole,
						appointmentDate: e.appointmentDate,
						createdAt:
							e.createdAt instanceof Date
								? e.createdAt.toISOString()
								: e.createdAt,
						attributionReason: e.attributionReason,
						doctorId: e.doctorId,
						doctorName: e.doctorName,
						specialty: e.specialty,
					})),
					records: allRecords.map((r) => ({
						id: r.id,
						patientName: r.patientName,
						rebookedBy: r.rebookedBy,
						timeDeltaMinutes: r.timeDeltaMinutes,
						creditedRole: r.creditedRole,
						appointmentDate: r.appointmentDate,
						createdAt:
							r.createdAt instanceof Date
								? r.createdAt.toISOString()
								: r.createdAt,
						attributionReason: r.attributionReason,
					})),
					period: {
						startDate: startDate?.toISOString() ?? null,
						endDate: endDate?.toISOString() ?? null,
						range,
					},
				},
			};
		} catch (e) {
			request.log.error({ err: e }, "Не удалось рассчитать конверсию повторной записи");
			return reply.code(500).send({
				success: false,
				error: "RebookingConversionCalculationFailed",
				message: "Не удалось рассчитать конверсию повторной записи. Повторите позже.",
			});
		}
	});

	const rebookingConversionBodySchema = z.object({
		patientName: z.string().optional(),
		rebookedBy: z.string().optional(),
		timeDeltaMinutes: z.number().optional(),
		createdAt: z.string().optional(),
		completedAt: z.string().optional(),
		creditedRole: z.enum(["doctor", "administrator"]).optional(),
		appointmentDate: z.string().optional(),
		isSoloDoctor: z.boolean().optional(),
	});

	/**
	 * POST /api/analytics/rebooking-conversion
	 * Явная фиксация правила конверсии повторной записи в БД.
	 */
	app.post("/api/analytics/rebooking-conversion", async (request, reply) => {
		const mutationAllowed = await requireClinicalMutationAccess(
			request,
			reply,
			"rebooking conversion record",
		);
		if (!mutationAllowed) return;

		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"rebooking conversion record",
		);
		if (!orgId) return;

		try {
			const parseRes = rebookingConversionBodySchema.safeParse(request.body);
			if (!parseRes.success) {
				return reply.code(400).send({
					success: false,
					error: "InvalidRequestBody",
					message: "Некорректное тело запроса с данными о повторной записи.",
					details: parseRes.error.flatten(),
				});
			}

			const body = parseRes.data;

			const patientName = body.patientName?.trim() || "Пациент";
			const rebookedBy = body.rebookedBy?.trim() || "Сотрудник";
			const appointmentDate =
				body.appointmentDate?.trim() || new Date().toISOString().slice(0, 10);

			let isSoloDoctor = body.isSoloDoctor;
			if (isSoloDoctor === undefined) {
				const [orgRecord] = await db
					.select({ clinicMode: organizations.clinicMode })
					.from(organizations)
					.where(eq(organizations.id, orgId))
					.limit(1);

				if (
					orgRecord?.clinicMode === "solo_doctor" ||
					orgRecord?.clinicMode === "one_chair"
				) {
					isSoloDoctor = true;
				} else {
					const chairsList = await db
						.select({ id: chairs.id })
						.from(chairs)
						.where(eq(chairs.organizationId, orgId))
						.limit(2);

					if (chairsList.length <= 1) {
						isSoloDoctor = true;
					}
				}
			}

			let timeDeltaMinutes = body.timeDeltaMinutes;
			let creditedRole = body.creditedRole;

			if (typeof timeDeltaMinutes !== "number") {
				if (body.createdAt && body.completedAt) {
					const deltaCalc = calculateRebookingDeltaMinutes(
						body.createdAt,
						body.completedAt,
						isSoloDoctor,
					);
					timeDeltaMinutes = deltaCalc.deltaMinutes;
					if (!creditedRole) creditedRole = deltaCalc.creditedRole;
				} else {
					timeDeltaMinutes = 0;
				}
			}

			if (!creditedRole) {
				creditedRole =
					isSoloDoctor || timeDeltaMinutes <= 15 ? "doctor" : "administrator";
			}

			const [inserted] = await db
				.insert(rebookingConversionRules)
				.values({
					organizationId: orgId,
					patientName,
					rebookedBy,
					timeDeltaMinutes,
					creditedRole,
					appointmentDate,
				})
				.returning();

			return reply.code(201).send({
				success: true,
				data: inserted,
				attribution: {
					timeDeltaMinutes,
					creditedRole,
					attributionReason:
						creditedRole === "doctor"
							? "chairside_rebooking_under_15m"
							: "frontdesk_rebooking_over_15m",
				},
			});
		} catch (e) {
			request.log.error({ err: e }, "Не удалось сохранить правило повторной записи");
			return reply.code(500).send({
				success: false,
				error: "RebookingConversionSaveFailed",
				message: "Не удалось сохранить правило повторной записи.",
			});
		}
	});
}

