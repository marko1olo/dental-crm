import {
	type ExecutiveFunnelStage,
	type ExecutiveFunnelStageItem,
	type ExecutiveKpisSummary,
	calculateExecutiveFunnel,
	calculateExecutiveKpisSummary,
	calculateKopecksSharePercent,
	calculateMarginPercentFromKopecks,
	kopecksToRubles,
	rublesToKopecks,
} from "@dental/shared";
import { and, eq, gte, inArray, lt, lte, ne, sql } from "drizzle-orm";
import { withTenantCtx, type TenantDb } from "../../db/rls.js";
import {
	isIncomePaymentRowSql,
	isPaymentInPlaceRefundedSql,
	isPaymentRefundFlowSql,
	paymentAbsKopecksSql,
	paymentFlowSignSql,
	paymentSignedFlowKopecksSql,
} from "../../db/paymentRefundSql.js";
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
import {
	CASH_EXPENSE_REASON_CODES,
	type CashExpenseReasonCode,
	type ClinicWorkingHoursSpec,
	type ExecutivePeriodRange,
	calculateWorkingMinutesInPeriod,
	isExecutivePeriod,
	resolveClinicScheduleWorkHours,
	resolveExecutiveDateRange,
	resolveExecutiveRevenuePlanKopecks,
} from "./executiveKpiDateUtils.js";

export {
	CASH_EXPENSE_REASON_CODES,
	type CashExpenseReasonCode,
	type ClinicWorkingHoursSpec,
	type ExecutivePeriodRange,
	calculateWorkingMinutesInPeriod,
	isExecutivePeriod,
	resolveClinicScheduleWorkHours,
	resolveExecutiveDateRange,
	resolveExecutiveRevenuePlanKopecks,
};

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
	executor?: TenantDb,
): Promise<ExecutiveKpiQueryResult> {
	const runQuery = async (tx: TenantDb): Promise<ExecutiveKpiQueryResult> => {
		const { execPeriod, startDate, daysCount } = range;

		// 1. Потери расписания, явки и загрузка кресел
		const [apptSummary] = await tx
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

		const [chairCountRow] = await tx
			.select({ count: sql<number>`count(*)::int` })
			.from(chairs)
			.where(eq(chairs.organizationId, orgId));

		const [orgRow] = await tx
			.select()
			.from(organizations)
			.where(eq(organizations.id, orgId));
		const clinicScheduleSpec = resolveClinicScheduleWorkHours(orgRow?.clinicSchedule);

		const totalChairs = Math.max(1, Number(chairCountRow?.count || 1));
		// [ANL-04] Честный расчет доступных минут кресел по реальному графику клиники (40 ч/нед по умолчанию)
		const { availableMinutesPerChair } = calculateWorkingMinutesInPeriod(startDate, range.endDate, clinicScheduleSpec);
		const totalAvailableMinutes = totalChairs * availableMinutesPerChair;

		// 2. Лиды и входящие обращения
		const [leadsRow] = await tx
			.select({ count: sql<number>`count(*)::int` })
			.from(crmLeads)
			.where(
				and(
					eq(crmLeads.organizationId, orgId),
					gte(crmLeads.createdAt, startDate),
					lte(crmLeads.createdAt, range.endDate),
				),
			);

		const [newPatientsRow] = await tx
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
		const [aiReportsRow] = await tx
			.select({ count: sql<number>`count(*)::int` })
			.from(radiologyAiReports)
			.where(
				and(
					eq(radiologyAiReports.organizationId, orgId),
					gte(radiologyAiReports.createdAt, startDate),
					lte(radiologyAiReports.createdAt, range.endDate),
				),
			);

		const [aiFindingsRow] = await tx
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
		const planStats = await tx
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
		const absPaymentKopExpr = paymentAbsKopecksSql();
		const incomePaymentPred = isIncomePaymentRowSql();
		const refundFlowPred = isPaymentRefundFlowSql();
		const inPlaceRefundPred = isPaymentInPlaceRefundedSql();
		const signedFlowKopExpr = paymentSignedFlowKopecksSql();
		const [paymentsSummary] = await tx
			.select({
				paidRevenueKopecks: sql<number>`coalesce(sum(case when ${incomePaymentPred} then ${absPaymentKopExpr} else 0 end), 0)::bigint`,
				refundedRevenueKopecks: sql<number>`coalesce(sum(case when not (${inPlaceRefundPred}) and (${refundFlowPred}) then ${absPaymentKopExpr} else 0 end), 0)::bigint`,
				payingPatientsCount: sql<number>`count(distinct case when ${incomePaymentPred} then ${payments.patientId} end)::int`,
			})
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, orgId),
					gte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, startDate),
					lte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, range.endDate),
					inArray(payments.status, ["paid", "refunded"]),
					sql`(${payments.documentId} is null or not exists (select 1 from patient_invoices pi where pi.id = ${payments.documentId} and pi.organization_id = ${orgId} and pi.status in ('voided', 'cancelled')))`,
				),
			);

		const paidKopecks = Number(paymentsSummary?.paidRevenueKopecks || 0);
		const refundedKopecks = Number(paymentsSummary?.refundedRevenueKopecks || 0);
		const totalRevenueKopecks = paidKopecks - refundedKopecks;
		const payingPatients = Number(paymentsSummary?.payingPatientsCount || 0);

		// 5b. Честное распределение по способам оплат (Касса наличные / Карты и ДМС / СБП QR / Депозиты)
		const signExpr = paymentFlowSignSql();
		const methodText = sql`${payments.method}::text`;
		const splitCashKopExpr = sql`abs(coalesce((${payments.fiscalReceipt}->>'cashKopecks')::bigint, 0))`;
		const splitSbpKopExpr = sql`abs(coalesce((${payments.fiscalReceipt}->>'sbpKopecks')::bigint, 0))`;
		const splitAdvanceKopExpr = sql`abs(coalesce(coalesce((${payments.fiscalReceipt}->>'advanceOffsetKopecks')::bigint, (${payments.fiscalReceipt}->>'depositKopecks')::bigint), 0))`;
		const splitDmsKopExpr = sql`abs(coalesce((${payments.fiscalReceipt}->>'dmsKopecks')::bigint, 0))`;
		const splitCardKopExpr = sql`coalesce(abs(coalesce((${payments.fiscalReceipt}->>'cardKopecks')::bigint, (${payments.fiscalReceipt}->>'electronicKopecks')::bigint)), greatest(0, ${absPaymentKopExpr} - ${splitCashKopExpr} - ${splitSbpKopExpr} - ${splitAdvanceKopExpr} - ${splitDmsKopExpr}), 0)`;
		const [paymentMethodsRow] = await tx
			.select({
				cashKopecks: sql<number>`coalesce(sum(${signExpr} * (case when ${methodText} = 'cash' then ${absPaymentKopExpr} when ${methodText} = 'split' then ${splitCashKopExpr} else 0 end)), 0)::bigint`,
				cardDmsKopecks: sql<number>`coalesce(sum(${signExpr} * (case when ${methodText} in ('card', 'insurance', 'bank_transfer') then ${absPaymentKopExpr} when ${methodText} = 'split' then ${splitCardKopExpr} + ${splitDmsKopExpr} else 0 end)), 0)::bigint`,
				sbpKopecks: sql<number>`coalesce(sum(${signExpr} * (case when ${methodText} in ('sbp', 'online') then ${absPaymentKopExpr} when ${methodText} = 'split' then ${splitSbpKopExpr} else 0 end)), 0)::bigint`,
				depositKopecks: sql<number>`coalesce(sum(${signExpr} * (case when ${methodText} in ('deposit', 'family_wallet', 'advance', 'other', 'certificate') then ${absPaymentKopExpr} when ${methodText} = 'split' then ${splitAdvanceKopExpr} else 0 end)), 0)::bigint`,
			})
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, orgId),
					gte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, startDate),
					lte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, range.endDate),
					inArray(payments.status, ["paid", "refunded"]),
					sql`(${payments.documentId} is null or not exists (select 1 from patient_invoices pi where pi.id = ${payments.documentId} and pi.organization_id = ${orgId} and pi.status in ('voided', 'cancelled')))`,
				),
			);

		const cashKopecks = Math.max(0, Number(paymentMethodsRow?.cashKopecks || 0));
		const cardDmsKopecks = Math.max(0, Number(paymentMethodsRow?.cardDmsKopecks || 0));
		const sbpKopecks = Math.max(0, Number(paymentMethodsRow?.sbpKopecks || 0));
		const depositKopecks = Math.max(0, Number(paymentMethodsRow?.depositKopecks || 0));

		const totalMethodsKopecks = cashKopecks + cardDmsKopecks + sbpKopecks + depositKopecks;
		const paymentBreakdown = {
			cashRub: kopecksToRubles(cashKopecks),
			cashPercent: calculateKopecksSharePercent(cashKopecks, totalMethodsKopecks, 1),
			cardDmsRub: kopecksToRubles(cardDmsKopecks),
			cardDmsPercent: calculateKopecksSharePercent(cardDmsKopecks, totalMethodsKopecks, 1),
			sbpRub: kopecksToRubles(sbpKopecks),
			sbpPercent: calculateKopecksSharePercent(sbpKopecks, totalMethodsKopecks, 1),
			depositRub: kopecksToRubles(depositKopecks),
			depositPercent: calculateKopecksSharePercent(depositKopecks, totalMethodsKopecks, 1),
			totalRub: kopecksToRubles(totalMethodsKopecks),
			cashKopecks,
			cardDmsKopecks,
			sbpKopecks,
			depositKopecks,
			totalKopecks: totalMethodsKopecks,
		};

		// 6. Расходы клиники и управленческий P&L (COGS, OPEX, Чистая прибыль) без SQL float * 100
		const cashExpenseRows = await tx
			.select({
				reasonCode: cashOperations.reasonCode,
				exactKopecks: sql<number>`coalesce(sum(case when ${cashOperations.amountKopecks} is not null then ${cashOperations.amountKopecks} else 0 end), 0)::bigint`,
				legacyRub: sql<string>`coalesce(sum(case when ${cashOperations.amountKopecks} is null then coalesce(${cashOperations.amountRub}, 0) else 0 end), 0)`,
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
			const amtKop =
				Number(exp.exactKopecks || 0) +
				rublesToKopecks(Number(exp.legacyRub || 0));
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

		const [labOrdersRow] = await tx
			.select({
				totalCostKopecks: sql<number>`coalesce(sum(coalesce(${labOrders.labCostKopecks}, 0)), 0)::bigint`,
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

		const directLabCostKopecks = Number(labOrdersRow?.totalCostKopecks ?? 0);

		const [materialsUsageRow] = await tx
			.select({
				exactCostKopecks: sql<number>`coalesce(sum(case when ${inventoryTransactions.unitCostKopecks} is not null then abs(coalesce(${inventoryTransactions.qty}, ${inventoryTransactions.quantityChanged}, 0)) * ${inventoryTransactions.unitCostKopecks} else 0 end), 0)::bigint`,
				legacyCostRub: sql<string>`coalesce(sum(case when ${inventoryTransactions.unitCostKopecks} is null then abs(coalesce(${inventoryTransactions.qty}, ${inventoryTransactions.quantityChanged}, 0)) * coalesce(${inventoryTransactions.unitCostRub}, 0) else 0 end), 0)`,
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

		const directMaterialsCostKopecks =
			Number(materialsUsageRow?.exactCostKopecks || 0) +
			rublesToKopecks(Number(materialsUsageRow?.legacyCostRub || 0));

		// Начисленная зарплата врачей по ведомостям doctorPayrollStatements (метод начисления P&L)
		const [accruedPayrollRow] = await tx
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
		const netMarginPercent = calculateMarginPercentFromKopecks(
			netProfitKopecks,
			totalRevenueKopecks,
			1,
		);

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
		const [historicalLtvRow] = await tx
			.select({
				totalRevenueKopecks: sql<number>`coalesce(sum(${signedFlowKopExpr}), 0)::bigint`,
				payingPatientsCount: sql<number>`count(distinct case when ${incomePaymentPred} then ${payments.patientId} end)::int`,
			})
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, orgId),
					inArray(payments.status, ["paid", "refunded"]),
					sql`(${payments.documentId} is null or not exists (select 1 from patient_invoices pi where pi.id = ${payments.documentId} and pi.organization_id = ${orgId} and pi.status in ('voided', 'cancelled')))`,
				),
			);

		const histPayingPatients = Number(historicalLtvRow?.payingPatientsCount || 0);
		const histTotalRevenueKop = Number(historicalLtvRow?.totalRevenueKopecks || 0);
		const historicalCohortLtvKopecks =
			histPayingPatients > 0 ? Math.round(histTotalRevenueKop / histPayingPatients) : 0;

		const [primaryRevenueRow] = await tx
			.select({
				totalRevenueKopecks: sql<number>`coalesce(sum(${signedFlowKopExpr}), 0)::bigint`,
				patientsCount: sql<number>`count(distinct case when ${incomePaymentPred} then ${payments.patientId} end)::int`,
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
					sql`(${payments.documentId} is null or not exists (select 1 from patient_invoices pi where pi.id = ${payments.documentId} and pi.organization_id = ${orgId} and pi.status in ('voided', 'cancelled')))`,
				),
			);

		const [repeatRevenueRow] = await tx
			.select({
				totalRevenueKopecks: sql<number>`coalesce(sum(${signedFlowKopExpr}), 0)::bigint`,
				patientsCount: sql<number>`count(distinct case when ${incomePaymentPred} then ${payments.patientId} end)::int`,
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
					sql`(${payments.documentId} is null or not exists (select 1 from patient_invoices pi where pi.id = ${payments.documentId} and pi.organization_id = ${orgId} and pi.status in ('voided', 'cancelled')))`,
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
			doctorPayrollKopecks: effectiveDoctorPayrollKopecks,
			cashDoctorPayrollExpensesKopecks: cashPayrollExpensesKopecks,
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
	};

	return executor ? runQuery(executor) : withTenantCtx(orgId, runQuery);
}
