import { and, eq, gte, inArray, lte, sql, type Column } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { kopecksToRubles, rublesToKopecks } from "@dental/shared";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { withTenantReadCtx } from "../../db/rls.js";
import {
	isIncomePaymentRowSql,
	paymentAbsKopecksSql,
	paymentFlowSignSql,
	paymentSignedFlowKopecksSql,
} from "../../db/paymentRefundSql.js";
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
import { calculateCohortLtv } from "./cohortLtvCalculator.js";
import { requireExecutiveAccess } from "./executiveAccessGuard.js";
import type { TierKey } from "./types.js";
import {
	calculateChairUtilization,
	calculateDoctorProfitability,
	calculateNoShowHeatmap,
} from "./utilizationRoutes.js";

const dashboardQuerySchema = z
	.object({
		range: z.string().trim().min(1).max(32).optional(),
		branchId: z.string().uuid().optional(),
	})
	.strict();

export async function registerDashboardRoutes(app: FastifyInstance) {
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/analytics/dashboard",
		permission: "public",
		handler: async ({ request, reply }) => {
			// БЫЛО: `const orgId = await requireClinicalReadAccess(...)` — этот guard
			// возвращает Promise<boolean> (проверка секрета), а не идентификатор
			// организации. При успешной проверке orgId === true, поэтому условие
			// `typeof orgId !== "string"` срабатывало ВСЕГДА и обработчик выходил до
			// первого запроса к базе: весь дашборд молча отдавал пустой ответ.
			// Типизация это не ловит — сравнение typeof у boolean легально.
			// Теперь два шага явно разделены: гейт по секрету и получение арендатора
			// из подписанного токена.
			const orgId = await requireExecutiveAccess(request, reply);
			if (!orgId) return;

			const queryParse = dashboardQuerySchema.safeParse(request.query ?? {});
			if (!queryParse.success) {
				return reply.code(400).send({
					success: false,
					error: "ValidationError",
					message:
						queryParse.error.issues.map((i) => i.message).join(", ") ||
						"Некорректные параметры запроса дашборда аналитики",
				});
			}

			try {
				const { range, branchId } = queryParse.data;
				const now = new Date();
				let mappedPeriod: "day" | "week" | "month" | "quarter" | "year" | undefined;
				if (range === "today") mappedPeriod = "day";
				else if (range === "week") mappedPeriod = "week";
				else if (range === "month") mappedPeriod = "month";
				else if (range === "quarter" || range === "last_3_months") mappedPeriod = "quarter";
				else if (range === "year" || range === "this_year") mappedPeriod = "year";

				const data = await withTenantReadCtx(orgId, async (tx) => {
				const timeZone = await clinicTimeZone(orgId, tx);
				let startDate: Date | undefined;

				if (mappedPeriod) {
					const periodRes = resolvePeriod({ period: mappedPeriod }, timeZone);
					if (periodRes.ok) {
						startDate = periodRes.from;
					}
				} else if (range === "last_month") {
					const tz = timeZone ?? "Europe/Samara";
					const parts = new Map(
						new Intl.DateTimeFormat("en-CA", {
							timeZone: tz,
							year: "numeric",
							month: "2-digit",
						})
							.formatToParts(now)
							.map((p) => [p.type, p.value] as const),
					);
					const y = Number(parts.get("year") ?? now.getUTCFullYear());
					const m = Number(parts.get("month") ?? now.getUTCMonth() + 1);
					const prevMonthAnchor = new Date(Date.UTC(y, m - 2, 15, 12, 0, 0));
					const prevMonth = currentMonthPeriod(prevMonthAnchor, timeZone);
					startDate = prevMonth.from;
				}

				const withDate = (orgCol: Column, dateCol?: Column) =>
					startDate && dateCol
						? and(eq(orgCol, orgId), gte(dateCol, startDate))
						: eq(orgCol, orgId);

				// 4. Cohort LTV — payments grouped by patient creation month (строгий учет таймзоны клиники)
				const { cohortLtvJson, cohortZone } = await calculateCohortLtv(
					orgId,
					now,
					tx,
				);

				const planCounts = await tx
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
				tx,
			);

			// 3. Chair Utilization (% времени в кресле от доступного рабочего времени смены)
			const { chairUtilizationJson, chairOccupancyRate } =
				await calculateChairUtilization(orgId, startDate, now, branchId, tx);

			const [patientCountRow] = await tx
				.select({ count: sql<number>`count(*)` })
				.from(patients)
				.where(withDate(patients.organizationId, patients.createdAt));

			// [ANL-02] Честный расчет выручки и способов оплат:
			// 1) Исключение двойного учета 'online' одновременно в cashless и sbp
			// 2) Распаковка комбинированных сплит-чеков ('split') по тендерам (касса, карты, СБП, аванс, ДМС)
			// 3) Строгая сходимость сумм всех тендеров с totalKopecks
			// 4) Прямое чтение целочисленных копеек coalesce(amountKopecks, round(amountRub * 100))
			const absPaymentKopExpr = paymentAbsKopecksSql();
			const signExpr = paymentFlowSignSql();
			const signedFlowKopExpr = paymentSignedFlowKopecksSql();
			const incomePaymentPred = isIncomePaymentRowSql();
			const methodText = sql`${payments.method}::text`;
			const splitCashKopExpr = sql`abs(coalesce((${payments.fiscalReceipt}->>'cashKopecks')::bigint, 0))`;
			const splitSbpKopExpr = sql`abs(coalesce((${payments.fiscalReceipt}->>'sbpKopecks')::bigint, 0))`;
			const splitAdvanceKopExpr = sql`abs(coalesce(coalesce((${payments.fiscalReceipt}->>'advanceOffsetKopecks')::bigint, (${payments.fiscalReceipt}->>'depositKopecks')::bigint), 0))`;
			const splitDmsKopExpr = sql`abs(coalesce((${payments.fiscalReceipt}->>'dmsKopecks')::bigint, 0))`;
			const splitCardKopExpr = sql`coalesce(abs(coalesce((${payments.fiscalReceipt}->>'cardKopecks')::bigint, (${payments.fiscalReceipt}->>'electronicKopecks')::bigint)), greatest(0, ${absPaymentKopExpr} - ${splitCashKopExpr} - ${splitSbpKopExpr} - ${splitAdvanceKopExpr} - ${splitDmsKopExpr}), 0)`;
			const [revenueRow] = await tx
				.select({
					totalKopecks: sql<number>`coalesce(sum(${signedFlowKopExpr})::bigint, 0)`,
					cashKopecks: sql<number>`coalesce(sum(${signExpr} * (case when ${methodText} = 'cash' then ${absPaymentKopExpr} when ${methodText} = 'split' then ${splitCashKopExpr} else 0 end)), 0)::bigint`,
					cardKopecks: sql<number>`coalesce(sum(${signExpr} * (case when ${methodText} = 'card' then ${absPaymentKopExpr} when ${methodText} = 'split' then ${splitCardKopExpr} else 0 end)), 0)::bigint`,
					advanceKopecks: sql<number>`coalesce(sum(${signExpr} * (case when ${methodText} in ('deposit', 'family_wallet', 'advance', 'other') then ${absPaymentKopExpr} when ${methodText} = 'split' then ${splitAdvanceKopExpr} else 0 end)), 0)::bigint`,
					sbpKopecks: sql<number>`coalesce(sum(${signExpr} * (case when ${methodText} in ('sbp', 'online') then ${absPaymentKopExpr} when ${methodText} = 'split' then ${splitSbpKopExpr} else 0 end)), 0)::bigint`,
					bankTransferKopecks: sql<number>`coalesce(sum(${signExpr} * (case when ${methodText} = 'bank_transfer' then ${absPaymentKopExpr} else 0 end)), 0)::bigint`,
					insuranceKopecks: sql<number>`coalesce(sum(${signExpr} * (case when ${methodText} = 'insurance' then ${absPaymentKopExpr} when ${methodText} = 'split' then ${splitDmsKopExpr} else 0 end)), 0)::bigint`,
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
			const [payingPatientRow] = await tx
				.select({ count: sql<number>`count(distinct ${payments.patientId})` })
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, orgId),
						startDate ? gte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, startDate) : sql`true`,
						lte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, now),
						incomePaymentPred,
						sql`(${payments.documentId} is null or not exists (select 1 from patient_invoices pi where pi.id = ${payments.documentId} and pi.organization_id = ${orgId} and pi.status in ('voided', 'cancelled')))`,
					),
				);

			// [DEF-ANL-02] Честный подсчет повторных плативших пациентов: платившие пациенты, у которых patients.createdAt < startDate либо первый визит был до startDate
			const [repeatPayingPatientRow] = await tx
				.select({ count: sql<number>`count(distinct ${payments.patientId})` })
				.from(payments)
				.innerJoin(patients, and(eq(payments.patientId, patients.id), eq(patients.organizationId, orgId)))
				.where(
					and(
						eq(payments.organizationId, orgId),
						startDate ? gte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, startDate) : sql`true`,
						lte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, now),
						incomePaymentPred,
						sql`(${payments.documentId} is null or not exists (select 1 from patient_invoices pi where pi.id = ${payments.documentId} and pi.organization_id = ${orgId} and pi.status in ('voided', 'cancelled')))`,
						startDate
							? sql`(${patients.createdAt} < ${startDate} or exists (select 1 from appointments a where a.patient_id = ${payments.patientId} and a.organization_id = ${orgId} and a.starts_at < ${startDate}))`
							: sql`false`,
					),
				);

			const [apptCountRow] = await tx
				.select({ count: sql<number>`count(*)` })
				.from(appointments)
				.where(withDate(appointments.organizationId, appointments.startsAt));

			// 5. 3-Tier Treatment Plan Acceptance Rate & Primary Consultation Conversion (SQL GROUP BY без выгрузки всех строк в ОЗУ)
			const planTierAggRows = await tx
				.select({
					alternativeTier: treatmentPlans.alternativeTier,
					status: treatmentPlans.status,
					count: sql<number>`count(*)::int`,
					totalKopecks: sql<string>`coalesce(sum(case when ${treatmentPlans.totalPriceKopecks} is not null then ${treatmentPlans.totalPriceKopecks}::bigint else round(coalesce(${treatmentPlans.totalPriceRub}, ${treatmentPlans.totalPrice}, 0)::numeric * 100)::bigint end), 0)::bigint`,
				})
				.from(treatmentPlans)
				.where(
					withDate(treatmentPlans.organizationId, treatmentPlans.createdAt),
				)
				.groupBy(treatmentPlans.alternativeTier, treatmentPlans.status);

			// [ANL-05] Первичный приём: по явному маркеру консультации/первички в причине,
			// либо по отсутствию у пациента завершенных приемов в прошлом (без ложного "or reason is null").
			const [consultationApptRow] = await tx
				.select({
					count: sql<number>`count(*)::int`,
				})
				.from(appointments)
				.where(
					and(
						withDate(appointments.organizationId, appointments.startsAt),
						sql`(${appointments.reason} ilike '%конс%' or ${appointments.reason} ilike '%первич%' or not exists (select 1 from appointments a2 where a2.patient_id = ${appointments.patientId} and a2.organization_id = ${orgId} and a2.status = 'completed' and a2.starts_at < ${appointments.startsAt}))`,
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
			let totalPlansCount = 0;
			for (const aggRow of planTierAggRows) {
				const rowCount = Number(aggRow.count ?? 0);
				const priceKopecks = Number(aggRow.totalKopecks ?? 0);
				const rawTier = (aggRow.alternativeTier || "").toLowerCase().trim();
				let tier: TierKey = "optimum";
				if (rawTier === "premium" || rawTier === "vip") {
					tier = "premium";
				} else if (
					rawTier === "basic" ||
					rawTier === "economy" ||
					rawTier === "compromise"
				) {
					tier = "basic";
				} else {
					tier = "optimum";
				}

				totalPlansCount += rowCount;
				tierGroups[tier].totalPlans += rowCount;
				const isAccepted =
					aggRow.status === "Approved" ||
					aggRow.status === "Active" ||
					aggRow.status === "Completed";
				if (isAccepted) {
					tierGroups[tier].acceptedPlans += rowCount;
					tierGroups[tier].totalKopecks += priceKopecks;
					tierGroups[tier].totalRub = kopecksToRubles(tierGroups[tier].totalKopecks);
				}
			}

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
				tx,
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
		},
	});
}
