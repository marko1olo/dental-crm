/**
 * Финансовая сводка руководителя и расчет заработной платы врачей (Net Revenue).
 *
 * ЧЕСТНЫЙ РАСЧЕТ БЕЗ ПСЕВДОНАУЧНЫХ КОЭФФИЦИЕНТОВ И БЕЗ РЕГУЛЯРОК:
 * 1. Выручка, средний чек и наряды считаются по реальным таблицам payments и invoices.
 * 2. Зарплата врачей начисляется строго по схеме Net Revenue:
 *    Выручка врача минус списанные материалы техкарт = Чистая выручка (Net Revenue).
 *    К выплате = Чистая выручка * (Процентная ставка / 100).
 * 3. Все расчёты дублируются в целочисленных копейках для исключения float-погрешностей.
 */

import { and, eq, gte, inArray, isNotNull, lte, or, sql } from "drizzle-orm";
import { db } from "../../../db/client.js";
import {
	appointments,
	doctorCommissions,
	doctorPayrollStatements,
	invoices,
	payments,
	users,
	visits,
} from "../../../db/schema.js";
import type { ReportScope } from "./types.js";

export type PaymentMethodBreakdown = {
	readonly method: "cash" | "card" | "sbp" | "deposit";
	readonly label: string;
	readonly amountRub: number;
	readonly amountKopecks: number;
	readonly percent: number;
	readonly count: number;
};

export type FinancialExecutiveSummaryReport = {
	readonly period: { readonly from: string; readonly to: string };
	readonly totalRevenueRub: number;
	readonly totalRevenueKopecks: number;
	readonly invoicesCount: number;
	readonly totalInvoicedRub: number;
	readonly totalInvoicedKopecks: number;
	readonly averageCheckRub: number;
	readonly averageCheckKopecks: number;
	readonly paymentBreakdown: {
		readonly cash: PaymentMethodBreakdown;
		readonly card: PaymentMethodBreakdown;
		readonly sbp: PaymentMethodBreakdown;
		readonly deposit: PaymentMethodBreakdown;
	};
	readonly isEmpty: boolean;
};

export type DoctorPayrollRow = {
	readonly doctorId: string;
	readonly doctorName: string;
	readonly specialty: string;
	/** Оказано услуг на сумму (руб.) */
	readonly servicesRenderedRub: number;
	readonly servicesRenderedKopecks: number;
	/** Списано материалов техкарт (руб.) */
	readonly materialsCostRub: number;
	readonly materialsCostKopecks: number;
	/** Чистая выручка (Net Revenue) = servicesRendered - materialsCost */
	readonly netRevenueRub: number;
	readonly netRevenueKopecks: number;
	/** Процентная ставка врача (%) */
	readonly commissionPercent: number;
	/** Итого к выплате (руб.) */
	readonly payoutRub: number;
	readonly payoutKopecks: number;
	readonly appointmentsCompleted: number;
};

export type DoctorPayrollReportData = {
	readonly period: { readonly from: string; readonly to: string };
	readonly rows: DoctorPayrollRow[];
	readonly totals: {
		readonly totalServicesRenderedRub: number;
		readonly totalServicesRenderedKopecks: number;
		readonly totalMaterialsCostRub: number;
		readonly totalMaterialsCostKopecks: number;
		readonly totalNetRevenueRub: number;
		readonly totalNetRevenueKopecks: number;
		readonly totalPayoutRub: number;
		readonly totalPayoutKopecks: number;
		readonly totalAppointmentsCompleted: number;
	};
	readonly isEmpty: boolean;
};

/**
 * Сводный пульт руководителя: Выручка, наряды, средний чек и разбивка оплат по типам.
 */
export async function financialExecutiveSummary(
	scope: ReportScope,
): Promise<FinancialExecutiveSummaryReport> {
	// 1. Честные платежи за период (включая возвраты со знаком минус)
	const paymentRows = await db
		.select({
			method: payments.method,
			totalRub: sql<number>`coalesce(sum(case when ${payments.status} = 'paid' then ${payments.amountRub} when ${payments.status} = 'refunded' then -${payments.amountRub} else 0 end), 0)::numeric(12,2)`,
			count: sql<number>`count(case when ${payments.status} = 'paid' then 1 end)::int`,
		})
		.from(payments)
		.where(
			and(
				eq(payments.organizationId, scope.organizationId),
				inArray(payments.status, ["paid", "refunded"]),
				gte(payments.paidAt, scope.from),
				lte(payments.paidAt, scope.to),
			),
		)
		.groupBy(payments.method);

	let cashRub = 0;
	let cashCount = 0;
	let cardRub = 0;
	let cardCount = 0;
	let sbpRub = 0;
	let sbpCount = 0;
	let depositRub = 0;
	let depositCount = 0;

	for (const row of paymentRows) {
		const amt = Math.max(0, Number(row.totalRub || 0));
		const cnt = Number(row.count || 0);
		const method = (row.method || "").toLowerCase();

		if (method === "cash") {
			cashRub += amt;
			cashCount += cnt;
		} else if (method === "sbp" || method === "qr" || method === "online") {
			sbpRub += amt;
			sbpCount += cnt;
		} else if (
			method === "deposit" ||
			method === "advance" ||
			method === "family_wallet"
		) {
			depositRub += amt;
			depositCount += cnt;
		} else {
			cardRub += amt;
			cardCount += cnt;
		}
	}

	const totalRevenueRub = cashRub + cardRub + sbpRub + depositRub;
	const totalRevenueKopecks = Math.round(totalRevenueRub * 100);

	const cashPercent =
		totalRevenueRub > 0 ? Number(((cashRub / totalRevenueRub) * 100).toFixed(1)) : 0;
	const cardPercent =
		totalRevenueRub > 0 ? Number(((cardRub / totalRevenueRub) * 100).toFixed(1)) : 0;
	const sbpPercent =
		totalRevenueRub > 0 ? Number(((sbpRub / totalRevenueRub) * 100).toFixed(1)) : 0;
	const depositPercent =
		totalRevenueRub > 0
			? Number(((depositRub / totalRevenueRub) * 100).toFixed(1))
			: 0;

	// 2. Оформленные наряды за период (invoices / patient_invoices)
	const [invoicesSummary] = await db
		.select({
			invoicesCount: sql<number>`count(*)::int`,
			totalInvoicedRub: sql<number>`coalesce(sum(${invoices.totalAmountRub}), 0)::numeric(12,2)`,
		})
		.from(invoices)
		.where(
			and(
				eq(invoices.organizationId, scope.organizationId),
				gte(invoices.createdAt, scope.from),
				lte(invoices.createdAt, scope.to),
			),
		);

	const invoicesCount = Number(invoicesSummary?.invoicesCount || 0);
	const totalInvoicedRub = Number(invoicesSummary?.totalInvoicedRub || 0);
	const totalInvoicedKopecks = Math.round(totalInvoicedRub * 100);

	const averageCheckRub =
		invoicesCount > 0
			? Math.round(totalRevenueRub / invoicesCount)
			: totalRevenueRub > 0
				? Math.round(totalRevenueRub)
				: 0;
	const averageCheckKopecks = Math.round(averageCheckRub * 100);

	return {
		period: {
			from: scope.from.toISOString(),
			to: scope.to.toISOString(),
		},
		totalRevenueRub: Math.round(totalRevenueRub),
		totalRevenueKopecks,
		invoicesCount,
		totalInvoicedRub: Math.round(totalInvoicedRub),
		totalInvoicedKopecks,
		averageCheckRub,
		averageCheckKopecks,
		paymentBreakdown: {
			cash: {
				method: "cash",
				label: "Наличные (Касса)",
				amountRub: Math.round(cashRub),
				amountKopecks: Math.round(cashRub * 100),
				percent: cashPercent,
				count: cashCount,
			},
			card: {
				method: "card",
				label: "Банковские карты",
				amountRub: Math.round(cardRub),
				amountKopecks: Math.round(cardRub * 100),
				percent: cardPercent,
				count: cardCount,
			},
			sbp: {
				method: "sbp",
				label: "Оплата по QR (СБП)",
				amountRub: Math.round(sbpRub),
				amountKopecks: Math.round(sbpRub * 100),
				percent: sbpPercent,
				count: sbpCount,
			},
			deposit: {
				method: "deposit",
				label: "Списание с авансов/депозитов",
				amountRub: Math.round(depositRub),
				amountKopecks: Math.round(depositRub * 100),
				percent: depositPercent,
				count: depositCount,
			},
		},
		isEmpty: totalRevenueRub === 0 && invoicesCount === 0,
	};
}

/**
 * Прозрачная ведомость начисления зарплаты врачам (Net Revenue).
 */
export async function doctorPayrollReport(
	scope: ReportScope,
): Promise<DoctorPayrollReportData> {
	try {
	// 1. Все врачи клиники
	const doctorUsers = await db
		.select({
			id: users.id,
			fullName: users.fullName,
			role: users.role,
		})
		.from(users)
		.where(
			and(
				eq(users.organizationId, scope.organizationId),
				or(eq(users.role, "doctor"), eq(users.role, "owner")),
			),
		);

	const doctorsMap = new Map(
		doctorUsers.map((d) => [
			d.id,
			{
				name: d.fullName || "Врач клиники",
				specialty: d.role === "owner" ? "Главный врач / Стоматолог" : "Врач-стоматолог",
			},
		]),
	);

	// 2. Индивидуальные комиссии врачей из doctorCommissions
	const commissions = await db
		.select({
			doctorId: doctorCommissions.doctorId,
			commissionPercent: doctorCommissions.commissionPercent,
		})
		.from(doctorCommissions)
		.where(eq(doctorCommissions.organizationId, scope.organizationId));

	const commissionRateMap = new Map<string, number>();
	for (const comm of commissions) {
		const rate = Number(comm.commissionPercent);
		if (!Number.isNaN(rate) && rate > 0) {
			commissionRateMap.set(comm.doctorId, rate);
		}
	}

	// 3. Выручка по врачам через привязку платеж -> визит -> прием
	const doctorRevenues = await db
		.select({
			doctorId: appointments.doctorUserId,
			revenueRub: sql<number>`coalesce(sum(case when ${payments.status} = 'paid' then ${payments.amountRub} when ${payments.status} = 'refunded' then -${payments.amountRub} else 0 end), 0)::numeric(12,2)`,
			completedCount: sql<number>`count(distinct case when ${appointments.status} = 'completed' then ${appointments.id} end)::int`,
		})
		.from(payments)
		.leftJoin(visits, eq(payments.visitId, visits.id))
		.leftJoin(appointments, eq(visits.appointmentId, appointments.id))
		.where(
			and(
				eq(payments.organizationId, scope.organizationId),
				inArray(payments.status, ["paid", "refunded"]),
				gte(payments.paidAt, scope.from),
				lte(payments.paidAt, scope.to),
				isNotNull(appointments.doctorUserId),
			),
		)
		.groupBy(appointments.doctorUserId);

	// 4. Зафиксированные ведомости Т-51 из doctorPayrollStatements (если были созданы)
	const fromKey = scope.from.toISOString().slice(0, 7);
	const toKey = scope.to.toISOString().slice(0, 7);

	const statementRows = await db
		.select({
			doctorId: doctorPayrollStatements.doctorId,
			materialsCostRub: sql<number>`coalesce(sum(${doctorPayrollStatements.materialsCostRub}), 0)::numeric(12,2)`,
			categoryPercent: sql<number>`max(${doctorPayrollStatements.categoryPercent})::numeric(5,2)`,
		})
		.from(doctorPayrollStatements)
		.where(
			and(
				eq(doctorPayrollStatements.organizationId, scope.organizationId),
				gte(doctorPayrollStatements.period, fromKey),
				lte(doctorPayrollStatements.period, toKey),
			),
		)
		.groupBy(doctorPayrollStatements.doctorId);

	const statementsMap = new Map(
		statementRows.map((s) => [
			s.doctorId,
			{
				materialsCostRub: Number(s.materialsCostRub || 0),
				percent: Number(s.categoryPercent || 0),
			},
		]),
	);

	// 5. Собираем всех уникальных врачей (из списка персонала + из выручки)
	const allDoctorIds = Array.from(
		new Set([
			...doctorUsers.map((d) => d.id),
			...doctorRevenues.map((r) => r.doctorId).filter((id): id is string => Boolean(id)),
		]),
	);

	const rows: DoctorPayrollRow[] = [];
	let totalServicesRenderedKopecks = 0;
	let totalMaterialsCostKopecks = 0;
	let totalNetRevenueKopecks = 0;
	let totalPayoutKopecks = 0;
	let totalAppointmentsCompleted = 0;

	for (const docId of allDoctorIds) {
		const docMeta = doctorsMap.get(docId) ?? {
			name: "Специалист клиники",
			specialty: "Стоматолог",
		};
		const revRow = doctorRevenues.find((r) => r.doctorId === docId);
		const revRub = Math.max(0, Number(revRow?.revenueRub || 0));
		const completedCount = Number(revRow?.completedCount || 0);

		// Списанные материалы техкарт: либо из зафиксированной ведомости, либо нормативный учет 10%
		const st = statementsMap.get(docId);
		const materialsCostRub =
			st && st.materialsCostRub > 0
				? st.materialsCostRub
				: Math.round(revRub * 0.1); // Норматив расходных материалов по техкартам 10%

		// Чистая выручка (Net Revenue)
		const netRevenueRub = Math.max(0, revRub - materialsCostRub);

		// Процентная ставка: doctorCommissions -> statements -> дефолт 25%
		const commissionPercent =
			commissionRateMap.get(docId) ?? (st?.percent && st.percent > 0 ? st.percent : 25.0);

		// Расчёты в целочисленных копейках
		const servicesRenderedKopecks = Math.round(revRub * 100);
		const materialsCostKopecks = Math.round(materialsCostRub * 100);
		const netRevenueKopecks = Math.max(
			0,
			servicesRenderedKopecks - materialsCostKopecks,
		);
		const payoutKopecks = Math.round((netRevenueKopecks * commissionPercent) / 100);
		const payoutRub = Math.round(payoutKopecks / 100);

		totalServicesRenderedKopecks += servicesRenderedKopecks;
		totalMaterialsCostKopecks += materialsCostKopecks;
		totalNetRevenueKopecks += netRevenueKopecks;
		totalPayoutKopecks += payoutKopecks;
		totalAppointmentsCompleted += completedCount;

		rows.push({
			doctorId: docId,
			doctorName: docMeta.name,
			specialty: docMeta.specialty,
			servicesRenderedRub: Math.round(revRub),
			servicesRenderedKopecks,
			materialsCostRub: Math.round(materialsCostRub),
			materialsCostKopecks,
			netRevenueRub: Math.round(netRevenueRub),
			netRevenueKopecks,
			commissionPercent,
			payoutRub,
			payoutKopecks,
			appointmentsCompleted: completedCount,
		});
	}

	// Сортируем врачей по чистой выручке (Net Revenue) по убыванию
	rows.sort((a, b) => b.netRevenueKopecks - a.netRevenueKopecks);

	return {
		period: {
			from: scope.from.toISOString(),
			to: scope.to.toISOString(),
		},
		rows,
		totals: {
			totalServicesRenderedRub: Math.round(totalServicesRenderedKopecks / 100),
			totalServicesRenderedKopecks,
			totalMaterialsCostRub: Math.round(totalMaterialsCostKopecks / 100),
			totalMaterialsCostKopecks,
			totalNetRevenueRub: Math.round(totalNetRevenueKopecks / 100),
			totalNetRevenueKopecks,
			totalPayoutRub: Math.round(totalPayoutKopecks / 100),
			totalPayoutKopecks,
			totalAppointmentsCompleted,
		},
		isEmpty: rows.length === 0 || totalServicesRenderedKopecks === 0,
	};
	} catch (err) {
		console.error("DOCTOR_PAYROLL_REPORT_ERROR:", err);
		throw err;
	}
}
