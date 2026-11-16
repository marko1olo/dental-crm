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
	inventoryItems,
	inventoryTransactions,
	invoices,
	patientInvoices,
	patients,
	payments,
	serviceCatalogItems,
	treatmentItems,
	users,
	visits,
} from "../../../db/schema.js";
import { labOrders } from "../../../db/schema/clinical/clinicalRulesModules/clinicalProtocolsTables.js";
import {
	assistantPayrollReport,
	type AssistantPayrollRow,
} from "./assistantPayrollReports.js";
import {
	DEFAULT_CATEGORY_COMMISSION_PERCENT,
	calculateDoctorPeriodPayroll,
	type DoctorCompletedServiceItem,
} from "@dental/shared";
import {
	fetchActiveDoctorProfiles,
	fetchDoctorPayrollDataset,
	normalizeClinicalCategory,
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
): Promise<FinancialExecutiveSummaryReport> {
	// 1. [ANL-02] Честные платежи за период (чистый приход минус возвраты строго по времени оплаты)
	const paymentTimestamp = sql`coalesce(${payments.paidAt}, ${payments.createdAt})`;
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
				gte(paymentTimestamp, scope.from),
				lte(paymentTimestamp, scope.to),
				sql`(${payments.documentId} is null or not exists (select 1 from patient_invoices pi where pi.id = ${payments.documentId} and pi.status in ('voided', 'cancelled')))`,
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

	// 2. Оформленные наряды за период (invoices / patient_invoices)
	const [invoicesSummary] = await db
		.select({
			invoicesCount: sql<number>`count(*)::int`,
			totalInvoicedRub: sql<number>`coalesce(sum(case when ${invoices.status} != 'voided' and ${invoices.status} != 'cancelled' then coalesce(${invoices.totalAmountRub}, ${invoices.totalRub}) else 0 end), 0)::numeric(12,2)`,
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

	// [FIN-01] Ликвидация двойного учёта выручки:
	// (а) Реальный денежный приток в кассу и банк (ДДС): физические поступления средств за период (нал + карты + СБП).
	const cashInflowRub = cashRub + cardRub + sbpRub;
	const cashInflowKopecks = Math.round(cashInflowRub * 100);

	// (б) Реализация услуг через погашение авансов / депозитов.
	const depositRealizedRub = depositRub;
	const depositRealizedKopecks = Math.round(depositRealizedRub * 100);

	// (в) Итоговая выручка от реализации услуг за период:
	// Выручка = фактически принятые кассовые оплаты (cashInflowRub) + реализованные депозиты (depositRealizedRub).
	// Недопустимо перетирать реальные кассовые поступления единичным инвойсом.
	const totalRevenueRub = cashInflowRub + depositRealizedRub;
	const totalRevenueKopecks = cashInflowKopecks + depositRealizedKopecks;

	// Общий объем платежных проводок за период (для долевого распределения в breakdown)
	const paymentTurnoverRub = cashInflowRub + depositRealizedRub;
	const cashPercent =
		paymentTurnoverRub > 0 ? Number(((cashRub / paymentTurnoverRub) * 100).toFixed(1)) : 0;
	const cardPercent =
		paymentTurnoverRub > 0 ? Number(((cardRub / paymentTurnoverRub) * 100).toFixed(1)) : 0;
	const sbpPercent =
		paymentTurnoverRub > 0 ? Number(((sbpRub / paymentTurnoverRub) * 100).toFixed(1)) : 0;
	const depositPercent =
		paymentTurnoverRub > 0
			? Number(((depositRub / paymentTurnoverRub) * 100).toFixed(1))
			: 0;

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
		cashInflowRub: Math.round(cashInflowRub),
		cashInflowKopecks,
		depositRealizedRub: Math.round(depositRealizedRub),
		depositRealizedKopecks,
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
		isEmpty: totalRevenueRub === 0 && invoicesCount === 0 && cashInflowRub === 0,
	};
}

/**
 * Прозрачная ведомость начисления зарплаты врачам (Net Revenue).
 * Полная синхронизация с каноническим калькулятором пакета @dental/shared и /api/v1/payroll/calculations (DEF-PAYROLL-07).
 * DEF-PAYROLL-02: Поддержка filterDoctorId для врачей со скоупом payroll.read.own.
 */
export async function doctorPayrollReport(
	scope: ReportScope,
	filterDoctorId?: string | undefined,
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
			const { shiftsCount, orders, completedServices } = await fetchDoctorPayrollDataset({
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
				chairRentalKop: isRental ? Math.round(shiftsCount * doc.defaultShiftRateKop) : 0,
				advancePayoutKop: 0,
				taxRegime: doc.taxRegime,
			});

			const servicesRenderedKopecks = payrollResult.totalGrossRevenueKop;
			const servicesRenderedRub = Math.round(servicesRenderedKopecks / 100);
			const materialsCostKopecks = payrollResult.totalMaterialDeductionsKop;
			const materialsCostRub = Math.round(materialsCostKopecks / 100);
			const labCostKopecks = payrollResult.totalLabDeductionsKop;
			const labCostRub = Math.round(labCostKopecks / 100);
			const netRevenueKopecks = payrollResult.totalNetBaseKop;
			const netRevenueRub = Math.round(netRevenueKopecks / 100);
			const payoutKopecks = payrollResult.mainPayoutKop ?? payrollResult.netPayoutToDoctorKop;
			const payoutRub = Math.round(payoutKopecks / 100);

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
			: await assistantPayrollReport(scope);

		return {
			period: {
				from: scope.from.toISOString(),
				to: scope.to.toISOString(),
			},
			rows,
			assistantRows: assistantReport.rows,
			totals: {
				totalServicesRenderedRub: Math.round(totalServicesRenderedKopecks / 100),
				totalServicesRenderedKopecks,
				totalMaterialsCostRub: Math.round(totalMaterialsCostKopecks / 100),
				totalMaterialsCostKopecks,
				totalLabCostRub: Math.round(totalLabCostKopecks / 100),
				totalLabCostKopecks,
				totalNetRevenueRub: Math.round(totalNetRevenueKopecks / 100),
				totalNetRevenueKopecks,
				totalPayoutRub: Math.round(totalPayoutKopecks / 100),
				totalPayoutKopecks,
				totalAppointmentsCompleted,
				totalAssistantPayoutRub: assistantReport.totals.totalPayoutRub,
				totalAssistantPayoutKopecks: assistantReport.totals.totalPayoutKopecks,
				totalClinicPayrollRub: Math.round(
					(totalPayoutKopecks + assistantReport.totals.totalPayoutKopecks) / 100,
				),
				totalClinicPayrollKopecks:
					totalPayoutKopecks + assistantReport.totals.totalPayoutKopecks,
			},
			isEmpty:
				(rows.length === 0 || totalServicesRenderedKopecks === 0) &&
				assistantReport.isEmpty,
		};
	} catch (err) {
		console.error("DOCTOR_PAYROLL_REPORT_ERROR:", err);
		throw err;
	}
}
