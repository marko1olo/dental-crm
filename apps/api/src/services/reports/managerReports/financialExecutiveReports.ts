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

import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import type { FastifyBaseLogger } from "fastify";
import { withTenantCtx, type TenantDb } from "../../../db/rls.js";
import {
	isIncomePaymentRowSql,
	paymentAbsKopecksSql,
	paymentFlowSignSql,
} from "../../../db/paymentRefundSql.js";
import {
	appointments,
	invoices,
	payments,
} from "../../../db/schema.js";
import {
	assistantPayrollReport,
	type AssistantPayrollRow,
} from "./assistantPayrollReports.js";
import {
	calculateDoctorPeriodPayroll,
	calculateKopecksSharePercent,
	kopecksToRubles,
} from "@dental/shared";
import {
	fetchActiveDoctorProfiles,
	fetchDoctorPayrollDataset,
} from "../../../routes/doctorPayrollDbQueries.js";
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
	/** Валовая выручка от реализации медицинских услуг за период (без задвоения авансов) */
	readonly totalRevenueRub: number;
	readonly totalRevenueKopecks: number;
	/** Реальный денежный приток в кассу и банк (ДДС: Наличные + Карты + СБП) */
	readonly cashInflowRub: number;
	readonly cashInflowKopecks: number;
	/** Реализация медицинских услуг через погашение авансов и депозитов */
	readonly depositRealizedRub: number;
	readonly depositRealizedKopecks: number;
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
	/** Себестоимость зуботехнической лаборатории (руб.) */
	readonly labCostRub?: number;
	readonly labCostKopecks?: number;
	/** Чистая выручка (Net Revenue) = servicesRendered - materialsCost - labCost */
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
	readonly assistantRows: AssistantPayrollRow[];
	readonly totals: {
		readonly totalServicesRenderedRub: number;
		readonly totalServicesRenderedKopecks: number;
		readonly totalMaterialsCostRub: number;
		readonly totalMaterialsCostKopecks: number;
		readonly totalLabCostRub?: number;
		readonly totalLabCostKopecks?: number;
		readonly totalNetRevenueRub: number;
		readonly totalNetRevenueKopecks: number;
		readonly totalPayoutRub: number;
		readonly totalPayoutKopecks: number;
		readonly totalAppointmentsCompleted: number;
		readonly totalAssistantPayoutRub: number;
		readonly totalAssistantPayoutKopecks: number;
		readonly totalClinicPayrollRub: number;
		readonly totalClinicPayrollKopecks: number;
	};
	readonly isEmpty: boolean;
};

/**
 * Сводный пульт руководителя: Выручка, наряды, средний чек и разбивка оплат по типам.
 */
export async function financialExecutiveSummary(
	scope: ReportScope,
	executor?: TenantDb,
): Promise<FinancialExecutiveSummaryReport> {
	const runQuery = async (tx: TenantDb): Promise<FinancialExecutiveSummaryReport> => {
		// 1. [ANL-02] Честные платежи за период (чистый приход минус возвраты строго по времени оплаты)
		// Распаковка комбинированных сплит-чеков ('split') по тендерам без искажения ДДС
		const paymentTimestamp = sql`coalesce(${payments.paidAt}, ${payments.createdAt})`;
		const absPaymentKopExpr = paymentAbsKopecksSql();
		const signExpr = paymentFlowSignSql();
		const incomePaymentPred = isIncomePaymentRowSql();
		const methodText = sql`${payments.method}::text`;
		const splitCashKopExpr = sql`abs(coalesce((${payments.fiscalReceipt}->>'cashKopecks')::bigint, 0))`;
		const splitSbpKopExpr = sql`abs(coalesce((${payments.fiscalReceipt}->>'sbpKopecks')::bigint, 0))`;
		const splitAdvanceKopExpr = sql`abs(coalesce(coalesce((${payments.fiscalReceipt}->>'advanceOffsetKopecks')::bigint, (${payments.fiscalReceipt}->>'depositKopecks')::bigint), 0))`;
		const splitDmsKopExpr = sql`abs(coalesce((${payments.fiscalReceipt}->>'dmsKopecks')::bigint, 0))`;
		const splitCardKopExpr = sql`coalesce(abs(coalesce((${payments.fiscalReceipt}->>'cardKopecks')::bigint, (${payments.fiscalReceipt}->>'electronicKopecks')::bigint)), greatest(0, ${absPaymentKopExpr} - ${splitCashKopExpr} - ${splitSbpKopExpr} - ${splitAdvanceKopExpr} - ${splitDmsKopExpr}), 0)`;

		const [paymentTotals] = await tx
			.select({
				cashKopecks: sql<number>`coalesce(sum(${signExpr} * (case 
					when ${methodText} = 'cash' then ${absPaymentKopExpr} 
					when ${methodText} = 'split' then ${splitCashKopExpr} 
					else 0 end)), 0)::bigint`,
				cashCount: sql<number>`count(case when ${incomePaymentPred} and (${methodText} = 'cash' or (${methodText} = 'split' and ${splitCashKopExpr} > 0)) then 1 end)::int`,
				cardKopecks: sql<number>`coalesce(sum(${signExpr} * (case 
					when ${methodText} = 'card' then ${absPaymentKopExpr} 
					when ${methodText} = 'split' then ${splitCardKopExpr}
					when ${methodText} not in ('cash', 'online', 'sbp', 'deposit', 'advance', 'family_wallet', 'other', 'certificate', 'insurance', 'bank_transfer', 'split') then ${absPaymentKopExpr}
					else 0 end)), 0)::bigint`,
				cardCount: sql<number>`count(case when ${incomePaymentPred} and ((${methodText} = 'card' or ${methodText} not in ('cash', 'online', 'sbp', 'deposit', 'advance', 'family_wallet', 'other', 'certificate', 'insurance', 'bank_transfer', 'split')) or (${methodText} = 'split' and ${splitCardKopExpr} > 0)) then 1 end)::int`,
				sbpKopecks: sql<number>`coalesce(sum(${signExpr} * (case 
					when ${methodText} in ('sbp', 'online') then ${absPaymentKopExpr} 
					when ${methodText} = 'split' then ${splitSbpKopExpr} 
					else 0 end)), 0)::bigint`,
				sbpCount: sql<number>`count(case when ${incomePaymentPred} and (${methodText} in ('sbp', 'online') or (${methodText} = 'split' and ${splitSbpKopExpr} > 0)) then 1 end)::int`,
				depositKopecks: sql<number>`coalesce(sum(${signExpr} * (case 
					when ${methodText} in ('deposit', 'advance', 'family_wallet', 'other', 'certificate') then ${absPaymentKopExpr} 
					when ${methodText} = 'split' then ${splitAdvanceKopExpr} 
					else 0 end)), 0)::bigint`,
				depositCount: sql<number>`count(case when ${incomePaymentPred} and (${methodText} in ('deposit', 'advance', 'family_wallet', 'other', 'certificate') or (${methodText} = 'split' and ${splitAdvanceKopExpr} > 0)) then 1 end)::int`,
			})
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, scope.organizationId),
					inArray(payments.status, ["paid", "refunded"]),
					gte(paymentTimestamp, scope.from),
					lte(paymentTimestamp, scope.to),
					sql`(${payments.documentId} is null or not exists (select 1 from patient_invoices pi where pi.id = ${payments.documentId} and pi.organization_id = ${scope.organizationId} and pi.status in ('voided', 'cancelled')))`,
				),
			);

		const cashKopecks = Math.max(0, Number(paymentTotals?.cashKopecks || 0));
		const cardKopecks = Math.max(0, Number(paymentTotals?.cardKopecks || 0));
		const sbpKopecks = Math.max(0, Number(paymentTotals?.sbpKopecks || 0));
		const depositKopecks = Math.max(0, Number(paymentTotals?.depositKopecks || 0));

		const cashCount = Number(paymentTotals?.cashCount || 0);
		const cardCount = Number(paymentTotals?.cardCount || 0);
		const sbpCount = Number(paymentTotals?.sbpCount || 0);
		const depositCount = Number(paymentTotals?.depositCount || 0);

		const cashRub = kopecksToRubles(cashKopecks);
		const cardRub = kopecksToRubles(cardKopecks);
		const sbpRub = kopecksToRubles(sbpKopecks);
		const depositRub = kopecksToRubles(depositKopecks);

		// 2. Оформленные наряды за период (invoices / patient_invoices)
		const [invoicesSummary] = await tx
			.select({
				invoicesCount: sql<number>`count(*)::int`,
				totalInvoicedKopecks: sql<number>`coalesce(sum(case when ${invoices.status} != 'voided' and ${invoices.status} != 'cancelled' then coalesce(${invoices.totalPriceKopecks}, 0)::bigint else 0 end), 0)::bigint`,
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
		const totalInvoicedKopecks = Number(invoicesSummary?.totalInvoicedKopecks || 0);
		const totalInvoicedRub = kopecksToRubles(totalInvoicedKopecks);

		const cashInflowKopecks = cashKopecks + cardKopecks + sbpKopecks;
		const cashInflowRub = kopecksToRubles(cashInflowKopecks);
		const depositRealizedKopecks = depositKopecks;
		const depositRealizedRub = kopecksToRubles(depositRealizedKopecks);
		const totalRevenueKopecks = cashInflowKopecks + depositRealizedKopecks;
		const totalRevenueRub = kopecksToRubles(totalRevenueKopecks);

		// 3. Число фактически завершенных приемов и плативших пациентов за период
		const [completedApptRow] = await tx
			.select({
				count: sql<number>`count(*)::int`,
			})
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, scope.organizationId),
					eq(appointments.status, "completed"),
					gte(appointments.startsAt, scope.from),
					lte(appointments.startsAt, scope.to),
				),
			);

		const [payingPatientRow] = await tx
			.select({
				count: sql<number>`count(distinct ${payments.patientId})::int`,
			})
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, scope.organizationId),
					incomePaymentPred,
					gte(paymentTimestamp, scope.from),
					lte(paymentTimestamp, scope.to),
					sql`(${payments.documentId} is null or not exists (select 1 from patient_invoices pi where pi.id = ${payments.documentId} and pi.organization_id = ${scope.organizationId} and pi.status in ('voided', 'cancelled')))`,
				),
			);

		const completedAppointmentsCount = Number(completedApptRow?.count || 0);
		const payingPatientsCount = Number(payingPatientRow?.count || 0);

		const paymentTurnoverKopecks = totalRevenueKopecks;
		const cashPercent = calculateKopecksSharePercent(cashKopecks, paymentTurnoverKopecks, 1);
		const cardPercent = calculateKopecksSharePercent(cardKopecks, paymentTurnoverKopecks, 1);
		const sbpPercent = calculateKopecksSharePercent(sbpKopecks, paymentTurnoverKopecks, 1);
		const depositPercent = calculateKopecksSharePercent(depositKopecks, paymentTurnoverKopecks, 1);

		const averageCheckDivisor =
			completedAppointmentsCount > 0
				? completedAppointmentsCount
				: payingPatientsCount > 0
					? payingPatientsCount
					: invoicesCount > 0
						? invoicesCount
						: 0;

		const averageCheckKopecks =
			averageCheckDivisor > 0
				? Math.round(totalRevenueKopecks / averageCheckDivisor)
				: 0;
		const averageCheckRub = kopecksToRubles(averageCheckKopecks);

		return {
			period: {
				from: scope.from.toISOString(),
				to: scope.to.toISOString(),
			},
			totalRevenueRub,
			totalRevenueKopecks,
			cashInflowRub,
			cashInflowKopecks,
			depositRealizedRub,
			depositRealizedKopecks,
			invoicesCount,
			totalInvoicedRub,
			totalInvoicedKopecks,
			averageCheckRub,
			averageCheckKopecks,
			paymentBreakdown: {
				cash: {
					method: "cash",
					label: "Наличные (Касса)",
					amountRub: cashRub,
					amountKopecks: cashKopecks,
					percent: cashPercent,
					count: cashCount,
				},
				card: {
					method: "card",
					label: "Банковские карты",
					amountRub: cardRub,
					amountKopecks: cardKopecks,
					percent: cardPercent,
					count: cardCount,
				},
				sbp: {
					method: "sbp",
					label: "Оплата по QR (СБП)",
					amountRub: sbpRub,
					amountKopecks: sbpKopecks,
					percent: sbpPercent,
					count: sbpCount,
				},
				deposit: {
					method: "deposit",
					label: "Списание с авансов/депозитов",
					amountRub: depositRub,
					amountKopecks: depositKopecks,
					percent: depositPercent,
					count: depositCount,
				},
			},
			isEmpty: totalRevenueKopecks === 0 && invoicesCount === 0 && cashInflowKopecks === 0,
		};
	};

	if (executor) return runQuery(executor);
	return withTenantCtx(scope.organizationId, runQuery);
}

/**
 * Прозрачная ведомость начисления зарплаты врачам (Net Revenue).
 * Полная синхронизация с каноническим калькулятором пакета @dental/shared и /api/v1/payroll/calculations (DEF-PAYROLL-07).
 * DEF-PAYROLL-02: Поддержка filterDoctorId для врачей со скоупом payroll.read.own.
 */
export async function doctorPayrollReport(
	scope: ReportScope,
	filterDoctorId?: string | undefined,
	logger?: FastifyBaseLogger | undefined,
	executor?: TenantDb,
): Promise<DoctorPayrollReportData> {
	try {
		let activeDoctors = await fetchActiveDoctorProfiles(scope.organizationId);
		if (filterDoctorId) {
			activeDoctors = activeDoctors.filter((doc) => doc.id === filterDoctorId);
		}
		const fromStr = scope.from.toISOString().slice(0, 10);
		const toStr = scope.to.toISOString().slice(0, 10);

		const rows: DoctorPayrollRow[] = [];
		let totalServicesRenderedKopecks = 0;
		let totalMaterialsCostKopecks = 0;
		let totalLabCostKopecks = 0;
		let totalNetRevenueKopecks = 0;
		let totalPayoutKopecks = 0;
		let totalAppointmentsCompleted = 0;

		for (const doc of activeDoctors) {
			const { shiftsCount, orders, completedServices, refundDeductions, unallocatedLabKop } = await fetchDoctorPayrollDataset({
				orgId: scope.organizationId,
				resolvedDocId: doc.id,
				fromStr,
				toStr,
				fromDate: scope.from,
				toDate: scope.to,
			});

			const docPayoutModel = doc.payoutModel as "percentage" | "chair_rental";
			const isRental = docPayoutModel === "chair_rental";

			const payrollResult = calculateDoctorPeriodPayroll({
				doctorId: doc.id,
				doctorName: doc.name,
				specialtyId: doc.specialtyId,
				periodStartIso: fromStr,
				periodEndIso: toStr,
				services: completedServices,
				customBasePercentage: doc.commissionPercent,
				payoutModel: docPayoutModel,
				chairRentalKop: isRental ? shiftsCount * doc.defaultShiftRateKop : 0,
				advancePayoutKop: 0,
				taxRegime: doc.taxRegime,
				refundDeductions,
				unallocatedLabKop,
			});

			const servicesRenderedKopecks = payrollResult.totalGrossRevenueKop;
			const servicesRenderedRub = kopecksToRubles(servicesRenderedKopecks);
			const materialsCostKopecks = payrollResult.totalMaterialDeductionsKop;
			const materialsCostRub = kopecksToRubles(materialsCostKopecks);
			const labCostKopecks = payrollResult.totalLabDeductionsKop;
			const labCostRub = kopecksToRubles(labCostKopecks);
			const netRevenueKopecks = payrollResult.totalNetBaseKop;
			const netRevenueRub = kopecksToRubles(netRevenueKopecks);
			const payoutKopecks = payrollResult.mainPayoutKop ?? payrollResult.netPayoutToDoctorKop;
			const payoutRub = kopecksToRubles(payoutKopecks);

			totalServicesRenderedKopecks += servicesRenderedKopecks;
			totalMaterialsCostKopecks += materialsCostKopecks;
			totalLabCostKopecks += labCostKopecks;
			totalNetRevenueKopecks += netRevenueKopecks;
			totalPayoutKopecks += payoutKopecks;
			totalAppointmentsCompleted += orders.length;

			rows.push({
				doctorId: doc.id,
				doctorName: doc.name,
				specialty: doc.specialtyTitleRu || "Врач-стоматолог",
				servicesRenderedRub,
				servicesRenderedKopecks,
				materialsCostRub,
				materialsCostKopecks,
				labCostRub,
				labCostKopecks,
				netRevenueRub,
				netRevenueKopecks,
				commissionPercent: doc.commissionPercent,
				payoutRub,
				payoutKopecks,
				appointmentsCompleted: orders.length,
			});
		}

		// Сортируем врачей по чистой выручке (Net Revenue) по убыванию
		rows.sort((a, b) => b.netRevenueKopecks - a.netRevenueKopecks);

		// 6. Расчет оплаты труда ассистентов клиники (скрывается при персональной выгрузке врача)
		const assistantReport = filterDoctorId
			? { rows: [], totals: { totalPayoutRub: 0, totalPayoutKopecks: 0 }, isEmpty: true }
			: await assistantPayrollReport(scope, executor);

		return {
			period: {
				from: scope.from.toISOString(),
				to: scope.to.toISOString(),
			},
			rows,
			assistantRows: assistantReport.rows,
			totals: {
				totalServicesRenderedRub: kopecksToRubles(totalServicesRenderedKopecks),
				totalServicesRenderedKopecks,
				totalMaterialsCostRub: kopecksToRubles(totalMaterialsCostKopecks),
				totalMaterialsCostKopecks,
				totalLabCostRub: kopecksToRubles(totalLabCostKopecks),
				totalLabCostKopecks,
				totalNetRevenueRub: kopecksToRubles(totalNetRevenueKopecks),
				totalNetRevenueKopecks,
				totalPayoutRub: kopecksToRubles(totalPayoutKopecks),
				totalPayoutKopecks,
				totalAppointmentsCompleted,
				totalAssistantPayoutRub: assistantReport.totals.totalPayoutRub,
				totalAssistantPayoutKopecks: assistantReport.totals.totalPayoutKopecks,
				totalClinicPayrollRub: kopecksToRubles(
					totalPayoutKopecks + assistantReport.totals.totalPayoutKopecks,
				),
				totalClinicPayrollKopecks:
					totalPayoutKopecks + assistantReport.totals.totalPayoutKopecks,
			},
			isEmpty:
				(rows.length === 0 || totalServicesRenderedKopecks === 0) &&
				assistantReport.isEmpty,
		};
	} catch (err) {
		logger?.error({ err }, "DOCTOR_PAYROLL_REPORT_ERROR");
		throw err;
	}
}
