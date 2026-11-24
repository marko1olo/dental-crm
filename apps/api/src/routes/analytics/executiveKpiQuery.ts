import {
	type ExecutiveFunnelStage,
	type ExecutiveFunnelStageItem,
	type ExecutiveKpis,
	type ExecutiveKpisSummary,
	type ExecutivePeriod,
	calculateExecutiveFunnel,
	calculateExecutiveKpisSummary,
	kopecksToRubles,
	rublesToKopecks,
} from "@dental/shared";
import { and, eq, gte, inArray, lt, lte, ne, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	appointments,
	cashOperations,
	chairs,
	crmLeads,
	doctorPayrollStatements,
	inventoryTransactions,
	labOrders,
	organizations,
	patients,
	payments,
	radiologyAiFindings,
	radiologyAiReports,
	treatmentPlans,
} from "../../db/schema.js";

/**
 * Канонические типизированные коды регламентированных статей расходов РКО (Мандат 8ap & 8bm).
 */
export const CASH_EXPENSE_REASON_CODES = {
	SALARIES_PAYROLL: 1,
	TAXES_AND_FEES: 2,
	SUPPLIES_MATERIALS: 4,
	EQUIPMENT_LEASE: 5,
	MARKETING_ADVERTISING: 6,
	COMMUNICATIONS: 7,
	PETTY_CASH_OTHER: 8,
	UTILITIES: 10,
	DENTAL_LAB_COSTS: 11,
	CLINIC_RENT: 100,
} as const;

export type CashExpenseReasonCode =
	(typeof CASH_EXPENSE_REASON_CODES)[keyof typeof CASH_EXPENSE_REASON_CODES];

export interface ExecutivePeriodRange {
	readonly execPeriod: ExecutivePeriod;
	readonly startDate: Date;
	readonly endDate: Date;
	readonly daysCount: number;
}

export function isExecutivePeriod(val: unknown): val is ExecutivePeriod {
	return (
		typeof val === "string" &&
		["day", "yesterday", "week", "month", "quarter", "year", "custom"].includes(val)
	);
}

export function resolveExecutiveDateRange(
	period?: string,
	fromDateIso?: string,
	toDateIso?: string,
): ExecutivePeriodRange {
	const execPeriod: ExecutivePeriod = isExecutivePeriod(period) ? period : "month";

	const now = new Date();
	const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
	let startDate: Date;
	let endDate: Date = endOfToday;

	if (execPeriod === "yesterday") {
		startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
		endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
	} else if (execPeriod === "day") {
		startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
		endDate = endOfToday;
	} else if (execPeriod === "week") {
		const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0 = Monday
		startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
		endDate = endOfToday;
	} else if (execPeriod === "quarter") {
		const currentQuarterMonth = Math.floor(now.getMonth() / 3) * 3;
		startDate = new Date(now.getFullYear(), currentQuarterMonth, 1, 0, 0, 0, 0);
		endDate = endOfToday;
	} else if (execPeriod === "year") {
		startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
		endDate = endOfToday;
	} else if (execPeriod === "custom" && fromDateIso) {
		const parsedFrom = new Date(fromDateIso);
		startDate = Number.isNaN(parsedFrom.getTime())
			? new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
			: parsedFrom;
		if (toDateIso) {
			const parsedTo = new Date(toDateIso);
			endDate = Number.isNaN(parsedTo.getTime())
				? endOfToday
				: new Date(parsedTo.getFullYear(), parsedTo.getMonth(), parsedTo.getDate(), 23, 59, 59, 999);
		} else {
			endDate = endOfToday;
		}
	} else {
		startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
		endDate = endOfToday;
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
		const hStr = parts[0];
		const mStr = parts[1];
		if (hStr !== undefined && mStr !== undefined) {
			const h = Number(hStr);
			const m = Number(mStr);
			if (Number.isFinite(h) && Number.isFinite(m)) {
				startMins = h * 60 + m;
			}
		}
	}
	if (typeof raw.workdayEnd === "string") {
		const parts = raw.workdayEnd.split(":");
		const hStr = parts[0];
		const mStr = parts[1];
		if (hStr !== undefined && mStr !== undefined) {
			const h = Number(hStr);
			const m = Number(mStr);
			if (Number.isFinite(h) && Number.isFinite(m)) {
				endMins = h * 60 + m;
			}
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

/**
 * [ANL-01 / Мандат 8bm] Честный расчет плановой выручки клиники за период.
 * 1. Если в organizations.clinicSchedule задан явный месячный план (revenuePlanKopecks или revenuePlanRub),
 *    он масштабируется пропорционально длительности периода (daysCount / 30).
 * 2. Иначе эталонный план вычисляется динамически исходя из производственной мощности:
 *    доступные часы кресел (totalAvailableMinutes / 60) × целевая выработка кресло-часа
 *    (по умолчанию 3 500 ₽/час = 350 000 коп./час при нормативной загрузке 65-70%).
 */
export function resolveExecutiveRevenuePlanKopecks(params: {
	readonly clinicScheduleRaw: unknown;
	readonly totalAvailableMinutes: number;
	readonly daysCount: number;
	readonly execPeriod: ExecutivePeriod;
}): number {
	const raw =
		params.clinicScheduleRaw && typeof params.clinicScheduleRaw === "object"
			? (params.clinicScheduleRaw as Record<string, unknown>)
			: null;

	const explicitPlanKopecks =
		typeof raw?.revenuePlanKopecks === "number" && raw.revenuePlanKopecks > 0
			? raw.revenuePlanKopecks
			: typeof raw?.revenuePlanRub === "number" && raw.revenuePlanRub > 0
				? rublesToKopecks(raw.revenuePlanRub)
				: null;

	if (explicitPlanKopecks !== null) {
		switch (params.execPeriod) {
			case "month":
				return Math.round(explicitPlanKopecks);
			case "quarter":
				return Math.round(explicitPlanKopecks * 3);
			case "year":
				return Math.round(explicitPlanKopecks * 12);
			case "week":
				return Math.round((explicitPlanKopecks * 7) / 30);
			case "day":
			case "yesterday":
				return Math.round(explicitPlanKopecks / 30);
			case "custom":
			default:
				return Math.round((explicitPlanKopecks * Math.max(1, params.daysCount)) / 30);
		}
	}

	const hourlyTargetKopecks =
		typeof raw?.targetHourlyRevenueKopecks === "number" && raw.targetHourlyRevenueKopecks > 0
			? raw.targetHourlyRevenueKopecks
			: typeof raw?.targetHourlyRevenueRub === "number" && raw.targetHourlyRevenueRub > 0
				? rublesToKopecks(raw.targetHourlyRevenueRub)
				: 350_000; // 3 500 ₽/час доступного фонда кресла

	const availableHours = Math.max(1, params.totalAvailableMinutes / 60);
	return Math.round(availableHours * hourlyTargetKopecks);
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
	const clinicScheduleSpec = resolveClinicScheduleWorkHours(orgRow?.clinicSchedule);

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
		.from(radiologyAiReports)
		.where(
			and(
				eq(radiologyAiReports.organizationId, orgId),
				gte(radiologyAiReports.createdAt, startDate),
				lte(radiologyAiReports.createdAt, range.endDate),
			),
		);

	const [aiFindingsRow] = await db
		.select({ count: sql<number>`count(distinct ${radiologyAiFindings.id})::int` })
		.from(radiologyAiFindings)
		.where(
			and(
				eq(radiologyAiFindings.organizationId, orgId),
				gte(radiologyAiFindings.createdAt, startDate),
				lte(radiologyAiFindings.createdAt, range.endDate),
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
			totalPriceKopecks: sql<number>`coalesce(sum(coalesce(${treatmentPlans.totalPriceKopecks}, 0)), 0)::bigint`,
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
		const volKop = Number(row.totalPriceKopecks || rublesToKopecks(Number(row.totalRub || 0)));
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
	// (Мандат 8bm: прямое суммирование копеек без float-дрейфа)
	const paymentKopExpr = sql`coalesce(${payments.amountKopecks}, 0)::bigint`;
	const [paymentsSummary] = await db
		.select({
			paidRevenueKopecks: sql<number>`coalesce(sum(case when ${payments.status} = 'paid' then ${paymentKopExpr} else 0 end), 0)::bigint`,
			refundedRevenueKopecks: sql<number>`coalesce(sum(case when ${payments.status} = 'refunded' then abs(${paymentKopExpr}) else 0 end), 0)::bigint`,
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

	const paidKopecks = Number(paymentsSummary?.paidRevenueKopecks || 0);
	const refundedKopecks = Number(paymentsSummary?.refundedRevenueKopecks || 0);
	const totalRevenueKopecks = paidKopecks - refundedKopecks;
	const payingPatients = Number(paymentsSummary?.payingPatientsCount || 0);

	// 5b. Честное распределение по способам оплат (Касса наличные / Карты и ДМС / СБП QR / Депозиты)
	// [SEV-2.2] Распаковка комбинированных сплит-чеков ('split') по тендерам нал/СБП/депозит/карты
	const signExpr = sql`(case when ${payments.status} = 'paid' then 1 else -1 end)`;
	const absPaymentKopExpr = sql`abs(${paymentKopExpr})`;
	const methodText = sql`${payments.method}::text`;
	const [paymentMethodsRow] = await db
		.select({
			cashKopecks: sql<number>`coalesce(sum(${signExpr} * (case when ${methodText} = 'cash' then ${absPaymentKopExpr} when ${methodText} = 'split' then coalesce((${payments.fiscalReceipt}->>'cashKopecks')::bigint, 0) else 0 end)), 0)::bigint`,
			cardDmsKopecks: sql<number>`coalesce(sum(${signExpr} * (case when ${methodText} in ('card', 'insurance', 'bank_transfer') then ${absPaymentKopExpr} when ${methodText} = 'split' then coalesce(coalesce((${payments.fiscalReceipt}->>'cardKopecks')::bigint, (${payments.fiscalReceipt}->>'electronicKopecks')::bigint, greatest(0, ${absPaymentKopExpr} - coalesce((${payments.fiscalReceipt}->>'cashKopecks')::bigint, 0) - coalesce((${payments.fiscalReceipt}->>'sbpKopecks')::bigint, 0) - coalesce((${payments.fiscalReceipt}->>'advanceOffsetKopecks')::bigint, 0) - coalesce((${payments.fiscalReceipt}->>'depositKopecks')::bigint, 0) - coalesce((${payments.fiscalReceipt}->>'dmsKopecks')::bigint, 0))), 0) + coalesce((${payments.fiscalReceipt}->>'dmsKopecks')::bigint, 0) else 0 end)), 0)::bigint`,
			sbpKopecks: sql<number>`coalesce(sum(${signExpr} * (case when ${methodText} in ('sbp', 'online') then ${absPaymentKopExpr} when ${methodText} = 'split' then coalesce((${payments.fiscalReceipt}->>'sbpKopecks')::bigint, 0) else 0 end)), 0)::bigint`,
			depositKopecks: sql<number>`coalesce(sum(${signExpr} * (case when ${methodText} in ('deposit', 'family_wallet', 'advance', 'other', 'certificate') then ${absPaymentKopExpr} when ${methodText} = 'split' then coalesce(coalesce((${payments.fiscalReceipt}->>'advanceOffsetKopecks')::bigint, (${payments.fiscalReceipt}->>'depositKopecks')::bigint), 0) else 0 end)), 0)::bigint`,
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

	const cashKopecks = Math.max(0, Number(paymentMethodsRow?.cashKopecks || 0));
	const cardDmsKopecks = Math.max(0, Number(paymentMethodsRow?.cardDmsKopecks || 0));
	const sbpKopecks = Math.max(0, Number(paymentMethodsRow?.sbpKopecks || 0));
	const depositKopecks = Math.max(0, Number(paymentMethodsRow?.depositKopecks || 0));

	const totalMethodsKopecks = cashKopecks + cardDmsKopecks + sbpKopecks + depositKopecks;
	const paymentBreakdown = {
		cashRub: kopecksToRubles(cashKopecks),
		cashPercent: totalMethodsKopecks > 0 ? Math.round((cashKopecks / totalMethodsKopecks) * 1000) / 10 : 0,
		cardDmsRub: kopecksToRubles(cardDmsKopecks),
		cardDmsPercent: totalMethodsKopecks > 0 ? Math.round((cardDmsKopecks / totalMethodsKopecks) * 1000) / 10 : 0,
		sbpRub: kopecksToRubles(sbpKopecks),
		sbpPercent: totalMethodsKopecks > 0 ? Math.round((sbpKopecks / totalMethodsKopecks) * 1000) / 10 : 0,
		depositRub: kopecksToRubles(depositKopecks),
		depositPercent: totalMethodsKopecks > 0 ? Math.round((depositKopecks / totalMethodsKopecks) * 1000) / 10 : 0,
		totalRub: kopecksToRubles(totalMethodsKopecks),
		cashKopecks,
		cardDmsKopecks,
		sbpKopecks,
		depositKopecks,
		totalKopecks: totalMethodsKopecks,
	};

	// 6. Расходы клиники и управленческий P&L (COGS, OPEX, Чистая прибыль)
	const cashOperationKopExpr = sql`coalesce(${cashOperations.amountKopecks}, 0)::bigint`;
	const cashExpenseRows = await db
		.select({
			reasonCode: cashOperations.reasonCode,
			totalKopecks: sql<number>`coalesce(sum(${cashOperationKopExpr}), 0)::bigint`,
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

	let cashLabExpensesKopecks = 0;
	let cashMaterialsExpensesKopecks = 0;
	let cashPayrollExpensesKopecks = 0;
	let cashMarketingExpensesKopecks = 0;
	let cashRentExpensesKopecks = 0;
	let cashOtherOpexExpensesKopecks = 0;

	for (const exp of cashExpenseRows) {
		const code = exp.reasonCode ?? CASH_EXPENSE_REASON_CODES.UTILITIES;
		const amtKop = Number(exp.totalKopecks || 0);
		if (code === CASH_EXPENSE_REASON_CODES.DENTAL_LAB_COSTS) {
			cashLabExpensesKopecks += amtKop;
		} else if (
			code === CASH_EXPENSE_REASON_CODES.SUPPLIES_MATERIALS ||
			code === CASH_EXPENSE_REASON_CODES.EQUIPMENT_LEASE
		) {
			cashMaterialsExpensesKopecks += amtKop;
		} else if (code === CASH_EXPENSE_REASON_CODES.SALARIES_PAYROLL) {
			cashPayrollExpensesKopecks += amtKop;
		} else if (code === CASH_EXPENSE_REASON_CODES.MARKETING_ADVERTISING) {
			cashMarketingExpensesKopecks += amtKop;
		} else if (code === CASH_EXPENSE_REASON_CODES.CLINIC_RENT) {
			cashRentExpensesKopecks += amtKop;
		} else {
			cashOtherOpexExpensesKopecks += amtKop;
		}
	}

	const [labOrdersRow] = await db
		.select({
			totalCostKopecks: sql<number>`coalesce(sum(coalesce(${labOrders.labCostKopecks}, 0)), 0)::bigint`,
			totalRub: sql<number>`coalesce(sum(coalesce(${labOrders.labCostRub}, 0)), 0)`,
		})
		.from(labOrders)
		.where(
			and(
				eq(labOrders.organizationId, orgId),
				ne(labOrders.status, "cancelled"),
				eq(labOrders.isWarranty, false),
				gte(labOrders.createdAt, startDate),
				lte(labOrders.createdAt, range.endDate),
			),
		);

	// [P&L / Метод начисления]: прямые затраты на лабораторию и материалы формируются
	// строго по факту нарядов ЗТЛ и списаний со склада за период (Мандаты 8ap & 8bm),
	// исключая смешивание с кассовым ДДС (cashLabExpensesKopecks / cashMaterialsExpensesKopecks).
	const directLabCostKopecks = Number(labOrdersRow?.totalCostKopecks || rublesToKopecks(Number(labOrdersRow?.totalRub || 0)));

	const [materialsUsageRow] = await db
		.select({
			totalCostKopecks: sql<number>`coalesce(sum(abs(coalesce(${inventoryTransactions.qty}, ${inventoryTransactions.quantityChanged}, 0)) * coalesce(coalesce(${inventoryTransactions.unitCostKopecks}, round(${inventoryTransactions.unitCostRub} * 100)::bigint), 0)), 0)::bigint`,
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

	const directMaterialsCostKopecks = Number(materialsUsageRow?.totalCostKopecks || rublesToKopecks(Number(materialsUsageRow?.totalCostRub || 0)));

	// Начисленная зарплата врачей по ведомостям doctorPayrollStatements (метод начисления P&L)
	// с фолбэком на кассовые операции по статье заработной платы при отсутствии начисленных ведомостей (Мандат 8ap)
	const [accruedPayrollRow] = await db
		.select({
			totalPayrollKopecks: sql<number>`coalesce(sum(coalesce(nullif(${doctorPayrollStatements.totalAccruedKopecks}, 0), ${doctorPayrollStatements.netPayoutKopecks})), 0)::bigint`,
		})
		.from(doctorPayrollStatements)
		.where(
			and(
				eq(doctorPayrollStatements.organizationId, orgId),
				gte(
					doctorPayrollStatements.period,
					sql`to_char(${startDate}::date, 'YYYY-MM')`,
				),
				lte(
					doctorPayrollStatements.period,
					sql`to_char(${range.endDate}::date, 'YYYY-MM')`,
				),
			),
		);

	const accruedPayrollKopecks = Number(accruedPayrollRow?.totalPayrollKopecks || 0);
	const effectiveDoctorPayrollKopecks =
		accruedPayrollKopecks > 0 ? accruedPayrollKopecks : cashPayrollExpensesKopecks;

	const totalCogsKopecks =
		directLabCostKopecks +
		directMaterialsCostKopecks +
		effectiveDoctorPayrollKopecks;

	const totalMarketingSpendKopecks = cashMarketingExpensesKopecks;
	const totalOpexKopecks =
		totalMarketingSpendKopecks +
		cashRentExpensesKopecks +
		cashOtherOpexExpensesKopecks;

	const netProfitKopecks = Math.round(totalRevenueKopecks - totalCogsKopecks - totalOpexKopecks);
	const netMarginPercent =
		totalRevenueKopecks > 0
			? Number(((netProfitKopecks / totalRevenueKopecks) * 100).toFixed(1))
			: 0.0;

	// 7. Воронка первичных пациентов
	const attendedCount = Number(apptSummary?.attendedCount || 0);
	const bookingsCount = Number(apptSummary?.totalAppointments || 0);

	const rawFunnelInput: Array<{
		stage: ExecutiveFunnelStage;
		count: number;
		isAiAssisted?: boolean;
		totalVolumeKopecks?: number;
	}> = [
		{ stage: "lead", count: totalLeads },
		{ stage: "consultation_booking", count: bookingsCount },
		{ stage: "attended", count: attendedCount },
		{ stage: "ai_examination", count: aiExaminedCount, isAiAssisted: true },
		{ stage: "plan_presentation", count: plansPresentedCount, totalVolumeKopecks: plansPresentedVolumeKopecks },
		{ stage: "plan_approved", count: plansApprovedCount, totalVolumeKopecks: plansApprovedVolumeKopecks },
		{ stage: "treatment_started", count: payingPatients, totalVolumeKopecks: totalRevenueKopecks },
		{ stage: "sanitation_completed", count: sanitationCompletedCount },
	];

	const funnelStages = calculateExecutiveFunnel(
		rawFunnelInput,
		totalMarketingSpendKopecks,
	);

	// 8. Исторический когортный LTV и первичная/повторная выручка (исключая аннулированные счета)
	const [historicalLtvRow] = await db
		.select({
			totalRevenueKopecks: sql<number>`coalesce(sum(case when ${payments.status} = 'paid' then ${paymentKopExpr} when ${payments.status} = 'refunded' then -abs(${paymentKopExpr}) else 0 end), 0)::bigint`,
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
	const histTotalRevenueKop = Number(historicalLtvRow?.totalRevenueKopecks || 0);
	const historicalCohortLtvKopecks =
		histPayingPatients > 0 ? Math.round(histTotalRevenueKop / histPayingPatients) : 0;

	const [primaryRevenueRow] = await db
		.select({
			totalRevenueKopecks: sql<number>`coalesce(sum(case when ${payments.status} = 'paid' then ${paymentKopExpr} when ${payments.status} = 'refunded' then -abs(${paymentKopExpr}) else 0 end), 0)::bigint`,
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
			totalRevenueKopecks: sql<number>`coalesce(sum(case when ${payments.status} = 'paid' then ${paymentKopExpr} when ${payments.status} = 'refunded' then -abs(${paymentKopExpr}) else 0 end), 0)::bigint`,
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

	const totalRevenuePlanKopecks = resolveExecutiveRevenuePlanKopecks({
		clinicScheduleRaw: orgRow?.clinicSchedule,
		totalAvailableMinutes,
		daysCount,
		execPeriod,
	});

	const kpis = calculateExecutiveKpisSummary({
		period: execPeriod,
		totalRevenueKopecks,
		totalRevenuePlanKopecks,
		primaryRevenueKopecks: Number(primaryRevenueRow?.totalRevenueKopecks || 0),
		repeatRevenueKopecks: Number(repeatRevenueRow?.totalRevenueKopecks || 0),
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
		doctorPayrollKopecks: cashPayrollExpensesKopecks,
		materialsCostKopecks: directMaterialsCostKopecks,
		labCostKopecks: directLabCostKopecks,
	});

	return {
		kpis,
		funnelStages,
		totalRevenueKopecks,
		totalAppointments: bookingsCount,
		plansPresentedCount,
	};
}
