import { and, eq, gte, inArray, lte, sql, type Column } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { kopecksToRubles, rublesToKopecks } from "@dental/shared";
import {
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	appointments,
	patients,
	payments,
	treatmentPlans,
} from "../../db/schema.js";
// Ветви воронки планов лечения выводятся из перечисления базы ОДНИМ местом на
// проект — той же функцией, что пишет колонку `bi_analytics_snapshots.plan_funnel_json`
// (`services/biAnalyticsWorker.ts` и `scripts/cronAnalyticsWorker.ts`). Своя карта
// состояний здесь стала бы ТРЕТЬИМ списком, а второй уже разошёлся с `pg_enum` и по
// регистру, и по составу: воронка показывала нули при любом числе планов (d1ff7ab21).
import { buildPlanFunnel } from "../../services/biAnalyticsWorker.js";
import {
	clinicTimeZone,
	currentMonthPeriod,
} from "../../services/reports/managerReports.js";
import { resolvePeriod } from "../reports/reportsShared.js";
import { calculateCohortLtv } from "./cohortRoutes.js";
import type { TierKey } from "./types.js";
import {
	calculateChairUtilization,
	calculateDoctorProfitability,
	calculateNoShowHeatmap,
} from "./utilizationRoutes.js";

export async function registerDashboardRoutes(app: FastifyInstance) {
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
			const { range, branchId } = request.query as { range?: string; branchId?: string };
			const timeZone = await clinicTimeZone(orgId);
			let startDate: Date | undefined;

			const now = new Date();
			let mappedPeriod: "day" | "week" | "month" | "quarter" | "year" | undefined;
			if (range === "today") mappedPeriod = "day";
			else if (range === "week") mappedPeriod = "week";
			else if (range === "month") mappedPeriod = "month";
			else if (range === "quarter" || range === "last_3_months") mappedPeriod = "quarter";
			else if (range === "year" || range === "this_year") mappedPeriod = "year";

			if (mappedPeriod) {
				const periodRes = resolvePeriod({ period: mappedPeriod }, timeZone);
				if (periodRes.ok) {
					startDate = periodRes.from;
				}
			} else if (range === "last_month") {
				const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 15);
				const prevMonth = currentMonthPeriod(prevMonthDate, timeZone);
				startDate = prevMonth.from;
			}

			const withDate = (orgCol: Column, dateCol?: Column) =>
				startDate && dateCol
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
			const data = await withTenantCtx(orgId, async () => {
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
			const doctorProfitabilityJson = await calculateDoctorProfitability(
				orgId,
				startDate,
			);

			// 3. Chair Utilization (% времени в кресле от доступного рабочего времени смены)
			const { chairUtilizationJson, chairOccupancyRate } =
				await calculateChairUtilization(orgId, startDate, now, branchId);

			// 4. Cohort LTV — payments grouped by patient creation month (строгий учет таймзоны клиники)
			const { cohortLtvJson, cohortZone } = await calculateCohortLtv(
				orgId,
				now,
			);

			const [patientCountRow] = await db
				.select({ count: sql<number>`count(*)` })
				.from(patients)
				.where(withDate(patients.organizationId, patients.createdAt));

			// [ANL-02] Честный расчет выручки и способов оплат:
			// 1) Исключение двойного учета 'online' одновременно в cashless и sbp
			// 2) Распаковка комбинированных сплит-чеков ('split') по тендерам (касса, карты, СБП, аванс, ДМС)
			// 3) Строгая сходимость сумм всех тендеров с totalKopecks
			// 4) Прямое чтение целочисленных копеек coalesce(amountKopecks, round(amountRub * 100))
			const paymentKopExpr = sql`coalesce(${payments.amountKopecks}, 0)::bigint`;
			const absPaymentKopExpr = sql`abs(${paymentKopExpr})`;
			const signExpr = sql`(case when ${payments.status} = 'paid' then 1 else -1 end)`;
			const methodText = sql`${payments.method}::text`;
			const [revenueRow] = await db
				.select({
					totalKopecks: sql<number>`coalesce(sum(case when ${payments.status} = 'paid' then ${paymentKopExpr} when ${payments.status} = 'refunded' then -${absPaymentKopExpr} else 0 end)::bigint, 0)`,
					cashKopecks: sql<number>`coalesce(sum(${signExpr} * (case when ${methodText} = 'cash' then ${absPaymentKopExpr} when ${methodText} = 'split' then coalesce((${payments.fiscalReceipt}->>'cashKopecks')::bigint, 0) else 0 end)), 0)::bigint`,
					cardKopecks: sql<number>`coalesce(sum(${signExpr} * (case when ${methodText} = 'card' then ${absPaymentKopExpr} when ${methodText} = 'split' then coalesce(coalesce((${payments.fiscalReceipt}->>'cardKopecks')::bigint, (${payments.fiscalReceipt}->>'electronicKopecks')::bigint, greatest(0, ${absPaymentKopExpr} - coalesce((${payments.fiscalReceipt}->>'cashKopecks')::bigint, 0) - coalesce((${payments.fiscalReceipt}->>'sbpKopecks')::bigint, 0) - coalesce((${payments.fiscalReceipt}->>'advanceOffsetKopecks')::bigint, 0) - coalesce((${payments.fiscalReceipt}->>'depositKopecks')::bigint, 0) - coalesce((${payments.fiscalReceipt}->>'dmsKopecks')::bigint, 0))), 0) else 0 end)), 0)::bigint`,
					advanceKopecks: sql<number>`coalesce(sum(${signExpr} * (case when ${methodText} in ('deposit', 'family_wallet', 'advance', 'other') then ${absPaymentKopExpr} when ${methodText} = 'split' then coalesce(coalesce((${payments.fiscalReceipt}->>'advanceOffsetKopecks')::bigint, (${payments.fiscalReceipt}->>'depositKopecks')::bigint), 0) else 0 end)), 0)::bigint`,
					sbpKopecks: sql<number>`coalesce(sum(${signExpr} * (case when ${methodText} in ('sbp', 'online') then ${absPaymentKopExpr} when ${methodText} = 'split' then coalesce((${payments.fiscalReceipt}->>'sbpKopecks')::bigint, 0) else 0 end)), 0)::bigint`,
					bankTransferKopecks: sql<number>`coalesce(sum(${signExpr} * (case when ${methodText} = 'bank_transfer' then ${absPaymentKopExpr} else 0 end)), 0)::bigint`,
					insuranceKopecks: sql<number>`coalesce(sum(${signExpr} * (case when ${methodText} = 'insurance' then ${absPaymentKopExpr} when ${methodText} = 'split' then coalesce((${payments.fiscalReceipt}->>'dmsKopecks')::bigint, 0) else 0 end)), 0)::bigint`,
				})
				.from(payments)
				// [ANL-02] Только фактически полученные деньги: чистый приход минус возвраты по фактическому времени проведения платежа, исключая аннулированные счета
				.where(
					and(
						eq(payments.organizationId, orgId),
						startDate ? gte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, startDate) : sql`true`,
						lte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, now),
						inArray(payments.status, ["paid", "refunded"]),
						sql`(${payments.documentId} is null or not exists (select 1 from patient_invoices pi where pi.id = ${payments.documentId} and pi.organization_id = ${orgId} and pi.status in ('voided', 'cancelled')))`,
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
						eq(payments.organizationId, orgId),
						startDate ? gte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, startDate) : sql`true`,
						lte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, now),
						eq(payments.status, "paid"),
						sql`(${payments.documentId} is null or not exists (select 1 from patient_invoices pi where pi.id = ${payments.documentId} and pi.organization_id = ${orgId} and pi.status in ('voided', 'cancelled')))`,
					),
				);

			// [DEF-ANL-02] Честный подсчет повторных плативших пациентов: платившие пациенты, у которых patients.createdAt < startDate либо первый визит был до startDate
			const [repeatPayingPatientRow] = await db
				.select({ count: sql<number>`count(distinct ${payments.patientId})` })
				.from(payments)
				.innerJoin(patients, and(eq(payments.patientId, patients.id), eq(patients.organizationId, orgId)))
				.where(
					and(
						eq(payments.organizationId, orgId),
						startDate ? gte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, startDate) : sql`true`,
						lte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, now),
						eq(payments.status, "paid"),
						sql`(${payments.documentId} is null or not exists (select 1 from patient_invoices pi where pi.id = ${payments.documentId} and pi.organization_id = ${orgId} and pi.status in ('voided', 'cancelled')))`,
						startDate
							? sql`(${patients.createdAt} < ${startDate} or exists (select 1 from appointments a where a.patient_id = ${payments.patientId} and a.organization_id = ${orgId} and a.starts_at < ${startDate}))`
							: sql`false`,
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
					totalPriceKopecks: treatmentPlans.totalPriceKopecks,
					totalPriceRub: treatmentPlans.totalPriceRub,
					totalPrice: treatmentPlans.totalPrice,
					alternativeTier: treatmentPlans.alternativeTier,
				})
				.from(treatmentPlans)
				.where(
					withDate(treatmentPlans.organizationId, treatmentPlans.createdAt),
				);

			// [ANL-05] Первичный приём: по явному маркеру консультации/первички в причине,
			// либо по отсутствию у пациента завершенных приемов в прошлом (без ложного "or reason is null").
			const [consultationApptRow] = await db
				.select({
					count: sql<number>`count(*)::int`,
				})
				.from(appointments)
				.where(
					and(
						withDate(appointments.organizationId, appointments.startsAt),
						sql`(${appointments.reason} ilike '%конс%' or ${appointments.reason} ilike '%первич%' or not exists (select 1 from appointments a2 where a2.patient_id = ${appointments.patientId} and a2.status = 'completed' and a2.starts_at < ${appointments.startsAt}))`,
					),
				);

			const totalConsultations = Number(consultationApptRow?.count ?? 0);

			const tierGroups: Record<
				TierKey,
				{
					label: string;
					totalPlans: number;
					acceptedPlans: number;
					totalKopecks: number;
					totalRub: number;
				}
			> = {
				basic: {
					label: "Базовый (эконом)",
					totalPlans: 0,
					acceptedPlans: 0,
					totalKopecks: 0,
					totalRub: 0,
				},
				optimum: {
					label: "Оптимальный (стандарт)",
					totalPlans: 0,
					acceptedPlans: 0,
					totalKopecks: 0,
					totalRub: 0,
				},
				premium: {
					label: "Премиум (комплексный)",
					totalPlans: 0,
					acceptedPlans: 0,
					totalKopecks: 0,
					totalRub: 0,
				},
			};

			// [ANL-05] Реляционная классификация по alternativeTier вместо строкового поиска подстрок в имени и цен
			for (const plan of allPlans) {
				const priceKopecks =
					plan.totalPriceKopecks != null
						? Number(plan.totalPriceKopecks)
						: rublesToKopecks(Number(plan.totalPriceRub || plan.totalPrice || 0));
				const rawTier = (plan.alternativeTier || "").toLowerCase().trim();
				let tier: TierKey = "optimum";
				if (rawTier === "premium" || rawTier === "vip") {
					tier = "premium";
				} else if (
					rawTier === "basic" ||
					rawTier === "economy" ||
					rawTier === "compromise"
				) {
					tier = "basic";
				} else if (rawTier === "optimum" || rawTier === "standard") {
					tier = "optimum";
				} else {
					tier = "optimum";
				}

				tierGroups[tier].totalPlans += 1;
				const isAccepted =
					plan.status === "Approved" ||
					plan.status === "Active" ||
					plan.status === "Completed";
				if (isAccepted) {
					tierGroups[tier].acceptedPlans += 1;
					tierGroups[tier].totalKopecks += priceKopecks;
					tierGroups[tier].totalRub = kopecksToRubles(tierGroups[tier].totalKopecks);
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
						totalKopecks: group.totalKopecks,
						totalRub: group.totalRub,
					};
				}),
			};

			// 6. No-Show & Cancellation Heatmap
			const noShowHeatmap = await calculateNoShowHeatmap(
				orgId,
				startDate,
				cohortZone,
			);

			const totalPayingPatients = Number(payingPatientRow?.count ?? 0);
			const repeatCount = Number(repeatPayingPatientRow?.count ?? 0);
			const primaryCount = Math.max(0, totalPayingPatients - repeatCount);
			const totalRegisteredPatients = Number(patientCountRow?.count ?? 0);
			const totalRevenueKopecks = Number(revenueRow?.totalKopecks ?? 0);
			const cashKopecks = Number(revenueRow?.cashKopecks ?? 0);
			const cardKopecks = Number(revenueRow?.cardKopecks ?? 0);
			const advanceKopecks = Number(revenueRow?.advanceKopecks ?? 0);
			const sbpKopecks = Number(revenueRow?.sbpKopecks ?? 0);
			const bankTransferKopecks = Number(revenueRow?.bankTransferKopecks ?? 0);
			const cashlessKopecks = bankTransferKopecks;
			const insuranceKopecks = Number(revenueRow?.insuranceKopecks ?? 0);

			const avgCheckKopecks =
				totalPayingPatients > 0
					? Math.round(totalRevenueKopecks / totalPayingPatients)
					: 0;
			const avgChk = kopecksToRubles(avgCheckKopecks);

				return {
					kpis: {
						totalPatients: totalRegisteredPatients,
						totalRevenue: kopecksToRubles(totalRevenueKopecks),
						totalRevenueKopecks,
						cashRevenue: kopecksToRubles(cashKopecks),
						cashKopecks,
						cardRevenue: kopecksToRubles(cardKopecks),
						cardKopecks,
						cashlessRevenue: kopecksToRubles(cashlessKopecks),
						cashlessKopecks,
						advanceRevenue: kopecksToRubles(advanceKopecks),
						advanceKopecks,
						sbpRevenue: kopecksToRubles(sbpKopecks),
						sbpKopecks,
						bankTransferRevenue: kopecksToRubles(bankTransferKopecks),
						bankTransferKopecks,
						insuranceRevenue: kopecksToRubles(insuranceKopecks),
						insuranceKopecks,
						bonusRevenue: 0,
						totalAppointments: Number(apptCountRow?.count ?? 0),
						avgRevenuePerPatient: avgChk,
						averageCheck: avgChk,
						averageCheckKopecks: avgCheckKopecks,
						primaryPatientsCount: primaryCount,
						repeatPatientsCount: repeatCount,
						chairOccupancyRatePercent: chairOccupancyRate,
					},
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
						noShowHeatmap.totalCancelled === 0 &&
						noShowHeatmap.totalNoShow === 0 &&
						Number(revenueRow?.totalKopecks ?? 0) === 0 &&
						Number(apptCountRow?.count ?? 0) === 0,
				};
			});

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
}
