import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	appointments,
	clinicChairs,
	patientInvoices,
	patients,
	treatmentPlans,
	users,
	visitDiaries,
} from "../db/schema.js";

const RU_MONTHS = [
	"Янв", "Фев", "Мар", "Апр",
	"Май", "Июн", "Июл", "Авг",
	"Сен", "Окт", "Ноя", "Дек",
];

export async function registerAnalyticsRoutes(app: FastifyInstance) {
	app.get("/api/analytics/dashboard", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"analytics dashboard",
		);
		if (!orgId) return;

		try {
			const { range } = request.query as { range?: string };
			let startDate: Date | undefined;

			if (range === "last_month") {
				startDate = new Date();
				startDate.setMonth(startDate.getMonth() - 1);
			} else if (range === "last_3_months") {
				startDate = new Date();
				startDate.setMonth(startDate.getMonth() - 3);
			} else if (range === "this_year") {
				startDate = new Date(new Date().getFullYear(), 0, 1);
			}

			// 1. Plan Funnel (Treatment Plans)
			const plansWhere = [eq(patients.organizationId, orgId)];
			if (startDate) {
				plansWhere.push(gte(treatmentPlans.createdAt, startDate));
			}

			const plansRes = await db
				.select({
					status: treatmentPlans.status,
					count: sql<number>`count(*)`,
				})
				.from(treatmentPlans)
				.innerJoin(patients, eq(treatmentPlans.patientId, patients.id))
				.where(and(...plansWhere))
				.groupBy(treatmentPlans.status);

			const planCounts = { draft: 0, active: 0, completed: 0, cancelled: 0 };
			for (const r of plansRes) {
				const st = r.status || "draft";
				const key = st.toLowerCase();
				if (key in planCounts) {
					planCounts[key as keyof typeof planCounts] += Number(r.count);
				} else {
					planCounts.draft += Number(r.count);
				}
			}

			const planFunnelJson = [
				{ name: "Черновики", value: planCounts.draft, fill: "#a1a1aa" },
				{ name: "Активные", value: planCounts.active, fill: "#3b82f6" },
				{ name: "Завершены", value: planCounts.completed, fill: "#10b981" },
				{ name: "Отменены", value: planCounts.cancelled, fill: "#ef4444" },
			].filter((x) => x.value > 0);

			// 2. Doctor Profitability — real revenue + real completion rate
			const docProfWhere = [eq(patients.organizationId, orgId)];
			if (startDate) {
				docProfWhere.push(gte(patientInvoices.createdAt, startDate));
			}

			const docProfRes = await db
				.select({
					doctorId: visitDiaries.doctorId,
					revenue: sql<number>`coalesce(sum(${patientInvoices.totalAmountRub}),0)`,
				})
				.from(patientInvoices)
				.innerJoin(visitDiaries, eq(patientInvoices.visitId, visitDiaries.visitId))
				.innerJoin(patients, eq(patientInvoices.patientId, patients.id))
				.where(and(...docProfWhere))
				.groupBy(visitDiaries.doctorId);

			// Completion rate = completed plans / (completed + cancelled) per doctor
			const completionByDoctor = await db
				.select({
					doctorId: visitDiaries.doctorId,
					completed: sql<number>`count(*) filter (where ${treatmentPlans.status} = 'completed')`,
					cancelled: sql<number>`count(*) filter (where ${treatmentPlans.status} = 'cancelled')`,
				})
				.from(visitDiaries)
				.innerJoin(treatmentPlans, eq(treatmentPlans.patientId, visitDiaries.patientId))
				.innerJoin(patients, eq(visitDiaries.patientId, patients.id))
				.where(eq(patients.organizationId, orgId))
				.groupBy(visitDiaries.doctorId);

			const completionMap = new Map(
				completionByDoctor.map((r) => {
					const done = Number(r.completed);
					const total = done + Number(r.cancelled);
					return [r.doctorId, total > 0 ? Math.round((done / total) * 100) : 100];
				}),
			);

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
							? (docMap.get(r.doctorId) || "Неизвестный врач")
							: "Без врача",
						revenue,
						margin: Math.round(revenue * 0.35),
						completionRate: completionMap.get(r.doctorId ?? "") ?? 0,
					};
				})
				.filter((x) => x.revenue > 0)
				.sort((a, b) => b.revenue - a.revenue);

			// 3. Chair Utilization
			const chairUtilWhere = [eq(appointments.organizationId, orgId)];
			if (startDate) {
				chairUtilWhere.push(gte(appointments.startsAt, startDate));
			}

			const chairUtilRes = await db
				.select({
					chairId: appointments.chairId,
					count: sql<number>`count(*)`,
				})
				.from(appointments)
				.where(and(...chairUtilWhere))
				.groupBy(appointments.chairId);

			const allChairs = await db
				.select({ id: clinicChairs.id, name: clinicChairs.name })
				.from(clinicChairs)
				.where(eq(clinicChairs.organizationId, orgId));
			const chairMap = new Map(allChairs.map((c) => [c.id, c.name]));

			const colors = ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];
			const chairUtilizationJson = chairUtilRes
				.map((r, i) => ({
					name: r.chairId ? (chairMap.get(r.chairId) || "Кресло") : "Без кресла",
					value: Number(r.count),
					fill: colors[i % colors.length],
				}))
				.filter((x) => x.value > 0);

			// 4. Cohort LTV — real revenue grouped by patient cohort month
			// For each calendar month: avg first-month revenue and avg 12-month cumulative revenue per patient cohort
			const now = new Date();
			const ltvStartDate = new Date(now);
			ltvStartDate.setMonth(ltvStartDate.getMonth() - 12);

			// Group invoices by patient cohort (month of their first invoice/visit) and compute avg revenue
			const cohortRaw = await db
				.select({
					cohortMonth: sql<string>`to_char(date_trunc('month', ${patients.createdAt}), 'YYYY-MM')`,
					patientId: patientInvoices.patientId,
					totalRevenue: sql<number>`coalesce(sum(${patientInvoices.totalAmountRub}), 0)`,
					firstInvoiceMonth: sql<string>`to_char(date_trunc('month', min(${patientInvoices.createdAt})), 'YYYY-MM')`,
				})
				.from(patientInvoices)
				.innerJoin(patients, eq(patientInvoices.patientId, patients.id))
				.where(
					and(
						eq(patients.organizationId, orgId),
						gte(patients.createdAt, ltvStartDate),
					),
				)
				.groupBy(
					sql`date_trunc('month', ${patients.createdAt})`,
					patientInvoices.patientId,
				)
				.orderBy(sql`date_trunc('month', ${patients.createdAt})`);

			// Aggregate by cohort month
			const cohortMap = new Map<
				string,
				{ m1: number[]; m12: number[] }
			>();
			for (const row of cohortRaw) {
				const cm = row.cohortMonth;
				if (!cm) continue;
				if (!cohortMap.has(cm)) {
					cohortMap.set(cm, { m1: [], m12: [] });
				}
				const bucket = cohortMap.get(cm)!;
				const rev = Number(row.totalRevenue);
				// "Month 1" proxy = revenue in first invoice month; "Month 12" = total
				bucket.m12.push(rev);
				// first month proxy: if patient's cohort month == first invoice month, count as M1
				if (row.firstInvoiceMonth === cm) {
					bucket.m1.push(rev);
				}
			}

			const cohortLtvJson = Array.from(cohortMap.entries())
				.slice(-6) // Last 6 months for readability
				.map(([key, { m1, m12 }]) => {
					const [, monthStr] = key.split("-");
					const monthIdx = monthStr ? parseInt(monthStr, 10) - 1 : 0;
					const label = RU_MONTHS[monthIdx] ?? key;
					const avg = (arr: number[]) =>
						arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
					return {
						cohort: label,
						"Month 1": avg(m1),
						"Month 12": avg(m12),
					};
				})
				.filter((x) => x["Month 12"] > 0);

			// 5. Summary KPIs for the header cards
			const totalPatientsWhere = [eq(patients.organizationId, orgId)];
			if (startDate) totalPatientsWhere.push(gte(patients.createdAt, startDate));
			const [patientCountRow] = await db
				.select({ count: sql<number>`count(*)` })
				.from(patients)
				.where(and(...totalPatientsWhere));

			const totalRevenueWhere = [eq(patients.organizationId, orgId)];
			if (startDate) totalRevenueWhere.push(gte(patientInvoices.createdAt, startDate));
			const [revenueRow] = await db
				.select({ total: sql<number>`coalesce(sum(${patientInvoices.totalAmountRub}), 0)` })
				.from(patientInvoices)
				.innerJoin(patients, eq(patientInvoices.patientId, patients.id))
				.where(and(...totalRevenueWhere));

			const totalApptsWhere = [eq(appointments.organizationId, orgId)];
			if (startDate) totalApptsWhere.push(gte(appointments.startsAt, startDate));
			const [apptCountRow] = await db
				.select({ count: sql<number>`count(*)` })
				.from(appointments)
				.where(and(...totalApptsWhere));

			const data = {
				kpis: {
					totalPatients: Number(patientCountRow?.count ?? 0),
					totalRevenue: Number(revenueRow?.total ?? 0),
					totalAppointments: Number(apptCountRow?.count ?? 0),
					avgRevenuePerPatient:
						Number(patientCountRow?.count ?? 0) > 0
							? Math.round(
									Number(revenueRow?.total ?? 0) /
										Number(patientCountRow?.count ?? 0),
								)
							: 0,
				},
				cohortLtvJson: cohortLtvJson.length ? cohortLtvJson : [],
				planFunnelJson: planFunnelJson.length
					? planFunnelJson
					: [{ name: "Нет данных", value: 0 }],
				chairUtilizationJson: chairUtilizationJson.length
					? chairUtilizationJson
					: [{ name: "Нет данных", value: 0, fill: "#3f3f46" }],
				doctorProfitabilityJson: doctorProfitabilityJson.length
					? doctorProfitabilityJson
					: [{ name: "Нет данных", revenue: 0, margin: 0, completionRate: 0 }],
			};

			return { success: true, data };
		} catch (e) {
			console.error("Failed to generate analytics", e);
			return {
				success: true,
				data: {
					kpis: {
						totalPatients: 0,
						totalRevenue: 0,
						totalAppointments: 0,
						avgRevenuePerPatient: 0,
					},
					cohortLtvJson: [],
					planFunnelJson: [],
					chairUtilizationJson: [],
					doctorProfitabilityJson: [],
				},
			};
		}
	});
}
