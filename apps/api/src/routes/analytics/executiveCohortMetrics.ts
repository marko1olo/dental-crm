import { rublesToKopecks } from "@dental/shared";
import { and, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	clinicalAiFindings,
	clinicalAiReports,
	crmLeads,
	patients,
	payments,
	treatmentPlans,
} from "../../db/schema.js";

export interface CohortMetricsResult {
	readonly totalLeads: number;
	readonly aiExaminedCount: number;
	readonly plansPresentedCount: number;
	readonly plansPresentedVolumeKopecks: number;
	readonly plansApprovedCount: number;
	readonly plansApprovedVolumeKopecks: number;
	readonly sanitationCompletedCount: number;
	readonly historicalCohortLtvKopecks: number;
	readonly primaryRevenueKopecks: number;
	readonly repeatRevenueKopecks: number;
	readonly primaryPatientsCount: number;
	readonly repeatPatientsCount: number;
}

/**
 * Расчет когортных показателей, лидов, планов лечения и диагностических ИИ-осмотров.
 * Прямой поиск по indexed payments.paidAt (без костылей coalesce).
 */
export async function queryCohortMetrics(
	orgId: string,
	startDate: Date,
	endDate: Date,
): Promise<CohortMetricsResult> {
	// 1. Лиды и входящие обращения
	const [leadsRow] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(crmLeads)
		.where(
			and(
				eq(crmLeads.organizationId, orgId),
				gte(crmLeads.createdAt, startDate),
				lte(crmLeads.createdAt, endDate),
			),
		);

	const [newPatientsRow] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(patients)
		.where(
			and(
				eq(patients.organizationId, orgId),
				gte(patients.createdAt, startDate),
				lte(patients.createdAt, endDate),
			),
		);

	const totalLeads = Number(leadsRow?.count || 0) + Number(newPatientsRow?.count || 0);

	// 2. Диагностические ИИ-осмотры снимков
	const [aiReportsRow] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(clinicalAiReports)
		.where(
			and(
				eq(clinicalAiReports.organizationId, orgId),
				gte(clinicalAiReports.createdAt, startDate),
				lte(clinicalAiReports.createdAt, endDate),
			),
		);

	const [aiFindingsRow] = await db
		.select({ count: sql<number>`count(distinct ${clinicalAiFindings.id})::int` })
		.from(clinicalAiFindings)
		.where(
			and(
				eq(clinicalAiFindings.organizationId, orgId),
				gte(clinicalAiFindings.createdAt, startDate),
				lte(clinicalAiFindings.createdAt, endDate),
			),
		);

	const aiExaminedCount = Math.max(
		Number(aiReportsRow?.count || 0),
		Number(aiFindingsRow?.count || 0),
	);

	// 3. Планы лечения и санация
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
				lte(treatmentPlans.createdAt, endDate),
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
		const volKop = rublesToKopecks(Number(row.totalRub || 0));
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

	// 4. Исторический когортный LTV (исключая аннулированные счета)
	const [historicalLtvRow] = await db
		.select({
			totalRevenueRub: sql<number>`coalesce(sum(case when ${payments.status} = 'paid' then ${payments.amountRub} when ${payments.status} = 'refunded' then -${payments.amountRub} else 0 end), 0)`,
			payingPatientsCount: sql<number>`count(distinct case when ${payments.status} = 'paid' then ${payments.patientId} end)::int`,
		})
		.from(payments)
		.where(
			and(
				eq(payments.organizationId, orgId),
				inArray(payments.status, ["paid", "refunded"]),
				sql`(${payments.documentId} is null or not exists (select 1 from patient_invoices pi where pi.id = ${payments.documentId} and pi.status in ('voided', 'cancelled')))`,
			),
		);

	const histPayingPatients = Number(historicalLtvRow?.payingPatientsCount || 0);
	const histTotalRevenueKop = rublesToKopecks(Number(historicalLtvRow?.totalRevenueRub || 0));
	const historicalCohortLtvKopecks =
		histPayingPatients > 0 ? Math.round(histTotalRevenueKop / histPayingPatients) : 0;

	// 5. Первичная выручка (пациенты созданы в выбранном периоде)
	const [primaryRevenueRow] = await db
		.select({
			totalRevenueRub: sql<number>`coalesce(sum(case when ${payments.status} = 'paid' then ${payments.amountRub} when ${payments.status} = 'refunded' then -${payments.amountRub} else 0 end), 0)`,
			patientsCount: sql<number>`count(distinct case when ${payments.status} = 'paid' then ${payments.patientId} end)::int`,
		})
		.from(payments)
		.innerJoin(patients, eq(payments.patientId, patients.id))
		.where(
			and(
				eq(payments.organizationId, orgId),
				gte(payments.paidAt, startDate),
				lte(payments.paidAt, endDate),
				gte(patients.createdAt, startDate),
				lte(patients.createdAt, endDate),
				inArray(payments.status, ["paid", "refunded"]),
				sql`(${payments.documentId} is null or not exists (select 1 from patient_invoices pi where pi.id = ${payments.documentId} and pi.status in ('voided', 'cancelled')))`,
			),
		);

	// 6. Повторная выручка (пациенты созданы до начала периода)
	const [repeatRevenueRow] = await db
		.select({
			totalRevenueRub: sql<number>`coalesce(sum(case when ${payments.status} = 'paid' then ${payments.amountRub} when ${payments.status} = 'refunded' then -${payments.amountRub} else 0 end), 0)`,
			patientsCount: sql<number>`count(distinct case when ${payments.status} = 'paid' then ${payments.patientId} end)::int`,
		})
		.from(payments)
		.innerJoin(patients, eq(payments.patientId, patients.id))
		.where(
			and(
				eq(payments.organizationId, orgId),
				gte(payments.paidAt, startDate),
				lte(payments.paidAt, endDate),
				lt(patients.createdAt, startDate),
				inArray(payments.status, ["paid", "refunded"]),
				sql`(${payments.documentId} is null or not exists (select 1 from patient_invoices pi where pi.id = ${payments.documentId} and pi.status in ('voided', 'cancelled')))`,
			),
		);

	return {
		totalLeads,
		aiExaminedCount,
		plansPresentedCount,
		plansPresentedVolumeKopecks,
		plansApprovedCount,
		plansApprovedVolumeKopecks,
		sanitationCompletedCount,
		historicalCohortLtvKopecks,
		primaryRevenueKopecks: rublesToKopecks(Number(primaryRevenueRow?.totalRevenueRub || 0)),
		repeatRevenueKopecks: rublesToKopecks(Number(repeatRevenueRow?.totalRevenueRub || 0)),
		primaryPatientsCount: Number(primaryRevenueRow?.patientsCount || 0),
		repeatPatientsCount: Number(repeatRevenueRow?.patientsCount || 0),
	};
}
