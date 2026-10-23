import {
	type ExecutiveFunnelStage,
	type ExecutiveFunnelStageItem,
	type ExecutiveKpis,
	type ExecutiveKpisSummary,
	type ExecutivePeriod,
	calculateExecutiveFunnel,
	calculateExecutiveKpisSummary,
} from "@dental/shared";
import { and, eq, gte, inArray, lt, ne, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	appointments,
	cashOperations,
	chairs,
	crmLeads,
	diagnocatAiFindings,
	diagnocatReports,
	inventoryTransactions,
	labOrders,
	patients,
	payments,
	treatmentPlans,
} from "../../db/schema.js";

export interface ExecutivePeriodRange {
	readonly execPeriod: ExecutivePeriod;
	readonly startDate: Date;
	readonly endDate: Date;
	readonly daysCount: number;
}

export function resolveExecutiveDateRange(
	period?: string,
	fromDateIso?: string,
	toDateIso?: string,
): ExecutivePeriodRange {
	const validPeriods: ExecutivePeriod[] = [
		"day",
		"yesterday",
		"week",
		"month",
		"quarter",
		"year",
		"custom",
	];
	const execPeriod: ExecutivePeriod = validPeriods.includes(period as ExecutivePeriod)
		? (period as ExecutivePeriod)
		: "month";

	const now = new Date();
	let startDate: Date;
	let endDate: Date = now;

	if (execPeriod === "yesterday") {
		startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
		endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
	} else if (execPeriod === "day") {
		startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
	} else if (execPeriod === "week") {
		const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0 = Monday
		startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
	} else if (execPeriod === "quarter") {
		const currentQuarterMonth = Math.floor(now.getMonth() / 3) * 3;
		startDate = new Date(now.getFullYear(), currentQuarterMonth, 1, 0, 0, 0, 0);
	} else if (execPeriod === "year") {
		startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
	} else if (execPeriod === "custom" && fromDateIso) {
		const parsedFrom = new Date(fromDateIso);
		startDate = Number.isNaN(parsedFrom.getTime())
			? new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
			: parsedFrom;
		if (toDateIso) {
			const parsedTo = new Date(toDateIso);
			endDate = Number.isNaN(parsedTo.getTime()) ? now : parsedTo;
		}
	} else {
		startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
	}

	const daysCount = Math.max(
		1,
		Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
	);

	return { execPeriod, startDate, endDate, daysCount };
}

export interface ExecutiveKpiQueryResult {
	readonly kpis: ExecutiveKpisSummary;
	readonly funnelStages: ExecutiveFunnelStageItem[];
	readonly totalRevenueKopecks: number;
	readonly totalAppointments: number;
	readonly plansPresentedCount: number;
}

export async function queryExecutiveKpiAndFunnel(
	orgId: string,
	range: ExecutivePeriodRange,
	activeDoctorsCount: number,
): Promise<ExecutiveKpiQueryResult> {
	const { execPeriod, startDate, daysCount } = range;

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

	const totalLeads = Number(leadsRow?.count || 0) + Number(newPatientsRow?.count || 0);

	// 3. Честный подсчет диагностических ИИ-осмотров снимков (aiRadiologyFindings / aiDiagnosticReports)
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

	// 5. Выручка и платежи по 54-ФЗ (честный приход paid минус возвраты refunded)
	const [paymentsSummary] = await db
		.select({
			paidRevenueRub: sql<number>`coalesce(sum(case when ${payments.status} = 'paid' then ${payments.amountRub} else 0 end), 0)`,
			refundedRevenueRub: sql<number>`coalesce(sum(case when ${payments.status} = 'refunded' then ${payments.amountRub} else 0 end), 0)`,
			payingPatientsCount: sql<number>`count(distinct case when ${payments.status} = 'paid' then ${payments.patientId} end)::int`,
		})
		.from(payments)
		.where(
			and(
				eq(payments.organizationId, orgId),
				gte(payments.createdAt, startDate),
				inArray(payments.status, ["paid", "refunded"]),
			),
		);

	const paidKopecks = Math.round(Number(paymentsSummary?.paidRevenueRub || 0) * 100);
	const refundedKopecks = Math.round(Number(paymentsSummary?.refundedRevenueRub || 0) * 100);
	const totalRevenueKopecks = Math.max(0, paidKopecks - refundedKopecks);
	const payingPatients = Number(paymentsSummary?.payingPatientsCount || 0);

	// 5b. Честное распределение по способам оплат (Касса наличные / Карты и ДМС / СБП QR)
	const paymentMethodRows = await db
		.select({
			method: payments.method,
			revenueRub: sql<number>`coalesce(sum(case when ${payments.status} = 'paid' then ${payments.amountRub} when ${payments.status} = 'refunded' then -${payments.amountRub} else 0 end), 0)`,
		})
		.from(payments)
		.where(
			and(
				eq(payments.organizationId, orgId),
				gte(payments.createdAt, startDate),
				inArray(payments.status, ["paid", "refunded"]),
			),
		)
		.groupBy(payments.method);

	let cashRevenueRub = 0;
	let cardDmsRevenueRub = 0;
	let sbpRevenueRub = 0;
	let depositRevenueRub = 0;

	for (const pm of paymentMethodRows) {
		const amt = Math.max(0, Number(pm.revenueRub || 0));
		const m = (pm.method || "").toLowerCase();
		if (m === "cash") {
			cashRevenueRub += amt;
		} else if (m === "sbp" || m === "online") {
			sbpRevenueRub += amt;
		} else if (m === "deposit" || m === "family_wallet" || m === "advance") {
			depositRevenueRub += amt;
		} else {
			cardDmsRevenueRub += amt;
		}
	}

	const totalMethodsRub = cashRevenueRub + cardDmsRevenueRub + sbpRevenueRub + depositRevenueRub;
	const paymentBreakdown = {
		cashRub: Math.round(cashRevenueRub),
		cashPercent: totalMethodsRub > 0 ? Number(((cashRevenueRub / totalMethodsRub) * 100).toFixed(1)) : 0,
		cardDmsRub: Math.round(cardDmsRevenueRub),
		cardDmsPercent: totalMethodsRub > 0 ? Number(((cardDmsRevenueRub / totalMethodsRub) * 100).toFixed(1)) : 0,
		sbpRub: Math.round(sbpRevenueRub),
		sbpPercent: totalMethodsRub > 0 ? Number(((sbpRevenueRub / totalMethodsRub) * 100).toFixed(1)) : 0,
		depositRub: Math.round(depositRevenueRub),
		depositPercent: totalMethodsRub > 0 ? Number(((depositRevenueRub / totalMethodsRub) * 100).toFixed(1)) : 0,
		totalRub: Math.round(totalMethodsRub),
	};

	// 6. Расходы клиники и управленческий P&L (COGS, OPEX, Чистая прибыль)
	const cashExpenseRows = await db
		.select({
			reasonCode: cashOperations.reasonCode,
			totalRub: sql<number>`coalesce(sum(${cashOperations.amountRub}), 0)`,
		})
		.from(cashOperations)
		.where(
			and(
				eq(cashOperations.organizationId, orgId),
				eq(cashOperations.operationType, "expense"),
				gte(cashOperations.createdAt, startDate),
			),
		)
		.groupBy(cashOperations.reasonCode);

	let cashLabExpensesRub = 0;
	let cashMaterialsExpensesRub = 0;
	let cashPayrollExpensesRub = 0;
	let cashMarketingExpensesRub = 0;
	let cashRentExpensesRub = 0;
	let cashOtherOpexExpensesRub = 0;

	for (const exp of cashExpenseRows) {
		const code = exp.reasonCode || 10;
		const amt = Number(exp.totalRub || 0);
		if (code === 11) {
			cashLabExpensesRub += amt;
		} else if (code === 4 || code === 5) {
			cashMaterialsExpensesRub += amt;
		} else if (code === 1) {
			cashPayrollExpensesRub += amt;
		} else if (code === 6) {
			cashMarketingExpensesRub += amt;
		} else if (code === 100) {
			cashRentExpensesRub += amt;
		} else {
			cashOtherOpexExpensesRub += amt;
		}
	}

	const [labOrdersRow] = await db
		.select({
			totalRub: sql<number>`coalesce(sum(${labOrders.priceRub}), 0)`,
		})
		.from(labOrders)
		.where(
			and(
				eq(labOrders.organizationId, orgId),
				ne(labOrders.status, "cancelled"),
				gte(labOrders.createdAt, startDate),
			),
		);

	const directLabCostRub = Math.max(cashLabExpensesRub, Number(labOrdersRow?.totalRub || 0));

	const [materialsUsageRow] = await db
		.select({
			totalCostRub: sql<number>`coalesce(sum(abs(coalesce(${inventoryTransactions.qty}, ${inventoryTransactions.quantityChanged}, 0)) * coalesce(${inventoryTransactions.unitCostRub}, 0)), 0)`,
		})
		.from(inventoryTransactions)
		.where(
			and(
				eq(inventoryTransactions.organizationId, orgId),
				inArray(inventoryTransactions.transactionType, ["usage", "write_off"]),
				gte(inventoryTransactions.createdAt, startDate),
			),
		);

	const directMaterialsCostRub = Math.max(
		cashMaterialsExpensesRub,
		Number(materialsUsageRow?.totalCostRub || 0),
	);

	const totalCogsKopecks =
		Math.round(directLabCostRub * 100) +
		Math.round(directMaterialsCostRub * 100) +
		Math.round(cashPayrollExpensesRub * 100);

	const totalMarketingSpendKopecks = Math.round(cashMarketingExpensesRub * 100);
	const totalOpexKopecks =
		totalMarketingSpendKopecks +
		Math.round(cashRentExpensesRub * 100) +
		Math.round(cashOtherOpexExpensesRub * 100);

	const netProfitKopecks = Math.round(totalRevenueKopecks - totalCogsKopecks - totalOpexKopecks);
	const netMarginPercent =
		totalRevenueKopecks > 0
			? Number(((netProfitKopecks / totalRevenueKopecks) * 100).toFixed(1))
			: 0.0;

	// 7. Воронка первичных пациентов
	const attendedCount = Number(apptSummary?.attendedCount || 0);
	const bookingsCount = Number(apptSummary?.totalAppointments || 0);

	const funnelStages = calculateExecutiveFunnel(
		[
			{ stage: "lead" as ExecutiveFunnelStage, count: totalLeads },
			{ stage: "consultation_booking" as ExecutiveFunnelStage, count: bookingsCount },
			{ stage: "attended" as ExecutiveFunnelStage, count: attendedCount },
			{ stage: "ai_examination" as ExecutiveFunnelStage, count: aiExaminedCount, isAiAssisted: true },
			{ stage: "plan_presentation" as ExecutiveFunnelStage, count: plansPresentedCount, totalVolumeKopecks: plansPresentedVolumeKopecks },
			{ stage: "plan_approved" as ExecutiveFunnelStage, count: plansApprovedCount, totalVolumeKopecks: plansApprovedVolumeKopecks },
			{ stage: "treatment_started" as ExecutiveFunnelStage, count: payingPatients, totalVolumeKopecks: totalRevenueKopecks },
			{ stage: "sanitation_completed" as ExecutiveFunnelStage, count: sanitationCompletedCount },
		],
		totalMarketingSpendKopecks,
	);

	// 8. Исторический когортный LTV и первичная/повторная выручка
	const [historicalLtvRow] = await db
		.select({
			totalRevenueRub: sql<number>`coalesce(sum(${payments.amountRub}), 0)`,
			payingPatientsCount: sql<number>`count(distinct ${payments.patientId})::int`,
		})
		.from(payments)
		.where(and(eq(payments.organizationId, orgId), eq(payments.status, "paid")));

	const histPayingPatients = Number(historicalLtvRow?.payingPatientsCount || 0);
	const histTotalRevenueKop = Math.round(Number(historicalLtvRow?.totalRevenueRub || 0) * 100);
	const historicalCohortLtvKopecks =
		histPayingPatients > 0 ? Math.round(histTotalRevenueKop / histPayingPatients) : 0;

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
				gte(payments.createdAt, startDate),
				gte(patients.createdAt, startDate),
				inArray(payments.status, ["paid", "refunded"]),
			),
		);

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
				gte(payments.createdAt, startDate),
				lt(patients.createdAt, startDate),
				inArray(payments.status, ["paid", "refunded"]),
			),
		);

	const kpis = calculateExecutiveKpisSummary({
		period: execPeriod,
		totalRevenueKopecks,
		totalRevenuePlanKopecks: totalRevenueKopecks,
		primaryRevenueKopecks: Math.round(Number(primaryRevenueRow?.totalRevenueRub || 0) * 100),
		repeatRevenueKopecks: Math.round(Number(repeatRevenueRow?.totalRevenueRub || 0) * 100),
		primaryPatientsCount: Number(primaryRevenueRow?.patientsCount || 0),
		repeatPatientsCount: Number(repeatRevenueRow?.patientsCount || 0),
		totalMarketingSpendKopecks,
		historicalCohortLtvKopecks,
		totalOccupiedMinutes: Number(apptSummary?.occupiedMinutes || 0),
		totalAvailableMinutes,
		totalChairsCount: totalChairs,
		totalLeadsCount: totalLeads,
		aiExaminedLeadsCount: aiExaminedCount,
		totalSanitationCount: sanitationCompletedCount,
		totalCompletedVisits: Number(apptSummary?.completedCount || 0),
		activeDoctorsCount,
		cancelledVisitsCount: Number(apptSummary?.cancelledCount || 0),
		noShowVisitsCount: Number(apptSummary?.noShowCount || 0),
		netProfitKopecks,
		cogsKopecks: totalCogsKopecks,
		opexKopecks: totalOpexKopecks,
		netMarginPercent,
		paymentBreakdown,
		doctorPayrollKopecks: Math.round(cashPayrollExpensesRub * 100),
		materialsCostKopecks: Math.round(directMaterialsCostRub * 100),
		labCostKopecks: Math.round(directLabCostRub * 100),
	});

	return {
		kpis,
		funnelStages,
		totalRevenueKopecks,
		totalAppointments: bookingsCount,
		plansPresentedCount,
	};
}
