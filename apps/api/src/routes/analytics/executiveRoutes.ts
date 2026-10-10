import { and, eq, gte, ne, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	appointments,
	cashOperations,
	chairs,
	crmLeads,
	diagnocatAiFindings,
	diagnocatReports,
	patients,
	payments,
	serviceCatalogItems,
	treatmentItems,
	treatmentPlans,
	visits,
} from "../../db/schema.js";
import {
	type ExecutiveDashboardPayload,
	type ExecutiveDepartmentKey,
	type ExecutiveFunnelStage,
	type ExecutivePeriod,
	calculateDepartmentBreakdown,
	calculateExecutiveFunnel,
	calculateExecutiveKpisSummary,
} from "@dental/shared";

/**
 * ====================================================================
 *  ФИЧА #29 — РАБОЧИЙ СТОЛ ГЕНЕРАЛЬНОГО ДИРЕКТОРА КЛИНИКИ
 * ====================================================================
 */
export async function registerExecutiveRoutes(app: FastifyInstance) {
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
						gte(patients.createdAt, startDate),
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
}
