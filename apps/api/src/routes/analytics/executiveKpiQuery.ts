import {
	type ExecutiveFunnelStage,
	type ExecutiveFunnelStageItem,
	type ExecutiveKpis,
	type ExecutiveKpisSummary,
	type ExecutivePeriod,
	calculateExecutiveFunnel,
	calculateExecutiveKpisSummary,
} from "@dental/shared";
import { and, eq, gte, inArray, lt, lte, ne, sql } from "drizzle-orm";
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
	organizations,
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

export interface ClinicWorkingHoursSpec {
	workdayStartMinutes: number; // e.g. 9 * 60 = 540
	workdayEndMinutes: number; // e.g. 17 * 60 = 1020 (8h)
	workingDays: Set<number>; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
}

/**
 * [ANL-04] Разбор реального расписания клиники из organizations.clinicSchedule.
 * По умолчанию: 40 часов в неделю (5 рабочих дней Mon-Fri по 8 часов), а не фиктивные 84 ч/нед.
 */
export function resolveClinicScheduleWorkHours(scheduleRaw: unknown): ClinicWorkingHoursSpec {
	const defaultSpec: ClinicWorkingHoursSpec = {
		workdayStartMinutes: 9 * 60,
		workdayEndMinutes: 17 * 60,
		workingDays: new Set([1, 2, 3, 4, 5]),
	};

	if (!scheduleRaw || typeof scheduleRaw !== "object") {
		return defaultSpec;
	}

	const raw = scheduleRaw as Record<string, unknown>;
	let startMins = defaultSpec.workdayStartMinutes;
	let endMins = defaultSpec.workdayEndMinutes;
	let days = defaultSpec.workingDays;

	if (typeof raw.workdayStart === "string") {
		const parts = raw.workdayStart.split(":");
		const h = Number(parts[0]);
		const m = Number(parts[1]);
		if (Number.isFinite(h) && Number.isFinite(m)) {
			startMins = h * 60 + m;
		}
	}
	if (typeof raw.workdayEnd === "string") {
		const parts = raw.workdayEnd.split(":");
		const h = Number(parts[0]);
		const m = Number(parts[1]);
		if (Number.isFinite(h) && Number.isFinite(m)) {
			endMins = h * 60 + m;
		}
	}
	if (endMins <= startMins) {
		endMins = startMins + 8 * 60;
	}

	if (Array.isArray(raw.workingDays) && raw.workingDays.length > 0) {
		const validDays = raw.workingDays
			.map(Number)
			.filter((d) => !isNaN(d) && d >= 0 && d <= 6);
		if (validDays.length > 0) {
			days = new Set(validDays);
		}
	}

	return {
		workdayStartMinutes: startMins,
		workdayEndMinutes: endMins,
		workingDays: days,
	};
}

/**
 * [ANL-04] Честный расчет доступных рабочих минут клиники в периоде
 * на основе реального графика (organizations.clinicSchedule) или 40 часов/нед по умолчанию.
 */
export function calculateWorkingMinutesInPeriod(
	startDate: Date,
	endDate: Date = new Date(),
	scheduleSpec?: ClinicWorkingHoursSpec | number,
): { workingDays: number; availableMinutesPerChair: number } {
	const cur = new Date(startDate);
	cur.setHours(0, 0, 0, 0);
	const end = new Date(endDate);
	end.setHours(23, 59, 59, 999);

	let spec: ClinicWorkingHoursSpec;
	if (typeof scheduleSpec === "object" && scheduleSpec !== null) {
		spec = scheduleSpec;
	} else if (typeof scheduleSpec === "number") {
		spec = {
			workdayStartMinutes: 9 * 60,
			workdayEndMinutes: 9 * 60 + scheduleSpec * 60,
			workingDays: new Set([1, 2, 3, 4, 5, 6]),
		};
	} else {
		// Стандартные 40 часов в неделю: 5 дней по 8 часов (480 минут в день)
		spec = {
			workdayStartMinutes: 9 * 60,
			workdayEndMinutes: 17 * 60,
			workingDays: new Set([1, 2, 3, 4, 5]),
		};
	}

	const dailyMinutes = Math.max(60, spec.workdayEndMinutes - spec.workdayStartMinutes);
	let workingDays = 0;
	const temp = new Date(cur);
	while (temp <= end) {
		const dayOfWeek = temp.getDay(); // 0 = Sunday
		if (spec.workingDays.has(dayOfWeek)) {
			workingDays++;
		}
		temp.setDate(temp.getDate() + 1);
	}
	if (workingDays === 0) {
		workingDays = 1;
	}
	const availableMinutesPerChair = workingDays * dailyMinutes;
	return { workingDays, availableMinutesPerChair };
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
				lte(appointments.startsAt, range.endDate),
			),
		);

	const [chairCountRow] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(chairs)
		.where(eq(chairs.organizationId, orgId));

	const [orgRow] = await db
		.select()
		.from(organizations)
		.where(eq(organizations.id, orgId));
	const clinicScheduleSpec = resolveClinicScheduleWorkHours((orgRow as any)?.clinicSchedule);

	const totalChairs = Math.max(1, Number(chairCountRow?.count || 1));
	// [ANL-04] Честный расчет доступных минут кресел по реальному графику клиники (40 ч/нед по умолчанию) вместо 84 ч/нед
	const { availableMinutesPerChair } = calculateWorkingMinutesInPeriod(startDate, range.endDate, clinicScheduleSpec);
	const totalAvailableMinutes = totalChairs * availableMinutesPerChair;

	// 2. Лиды и входящие обращения
	const [leadsRow] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(crmLeads)
		.where(
			and(
				eq(crmLeads.organizationId, orgId),
				gte(crmLeads.createdAt, startDate),
				lte(crmLeads.createdAt, range.endDate),
			),
		);

	const [newPatientsRow] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(patients)
		.where(
			and(
				eq(patients.organizationId, orgId),
				gte(patients.createdAt, startDate),
				lte(patients.createdAt, range.endDate),
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
				lte(diagnocatReports.createdAt, range.endDate),
			),
		);

	const [aiFindingsRow] = await db
		.select({ count: sql<number>`count(distinct ${diagnocatAiFindings.id})::int` })
		.from(diagnocatAiFindings)
		.where(
			and(
				eq(diagnocatAiFindings.organizationId, orgId),
				gte(diagnocatAiFindings.createdAt, startDate),
				lte(diagnocatAiFindings.createdAt, range.endDate),
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
				lte(treatmentPlans.createdAt, range.endDate),
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

	// 5. Выручка и платежи (честный приход paid минус возвраты refunded строго по времени проведения платежа, исключая аннулированные счета)
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
				gte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, startDate),
				lte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, range.endDate),
				inArray(payments.status, ["paid", "refunded"]),
				sql`(${payments.documentId} is null or not exists (select 1 from patient_invoices pi where pi.id = ${payments.documentId} and pi.status in ('voided', 'cancelled')))`,
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
				gte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, startDate),
				lte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, range.endDate),
				inArray(payments.status, ["paid", "refunded"]),
				sql`(${payments.documentId} is null or not exists (select 1 from patient_invoices pi where pi.id = ${payments.documentId} and pi.status in ('voided', 'cancelled')))`,
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
				lte(cashOperations.createdAt, range.endDate),
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
				lte(labOrders.createdAt, range.endDate),
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
				lte(inventoryTransactions.createdAt, range.endDate),
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

	// 8. Исторический когортный LTV и первичная/повторная выручка (исключая аннулированные счета)
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
				gte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, startDate),
				lte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, range.endDate),
				gte(patients.createdAt, startDate),
				lte(patients.createdAt, range.endDate),
				inArray(payments.status, ["paid", "refunded"]),
				sql`(${payments.documentId} is null or not exists (select 1 from patient_invoices pi where pi.id = ${payments.documentId} and pi.status in ('voided', 'cancelled')))`,
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
				gte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, startDate),
				lte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, range.endDate),
				lt(patients.createdAt, startDate),
				inArray(payments.status, ["paid", "refunded"]),
				sql`(${payments.documentId} is null or not exists (select 1 from patient_invoices pi where pi.id = ${payments.documentId} and pi.status in ('voided', 'cancelled')))`,
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
