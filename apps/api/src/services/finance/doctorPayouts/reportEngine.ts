import { Decimal } from "decimal.js";
import { withTenantCtx } from "../../../db/rls.js";
import type {
	DoctorPayoutScope,
	DoctorPayoutReport,
	DoctorPayoutRow,
} from "./types.js";
import {
	computeDoctorPayout,
	materialsStateOf,
	payoutRowNote,
} from "./formula.js";
import { buildDoctorPayoutAggregateQuery } from "./queries.js";
import { fetchDoctorPayoutDrillDownDetails } from "./drillDown.js";
import { moneyFromDb, percentFromDb } from "./dbParsers.js";
import { buildCategoryBreakdown } from "./categoryAccruals.js";
import {
	buildDoctorVisitsRegistry,
	buildDoctorLabOrdersRegistry,
	buildDoctorPayslipHtml,
} from "./drillDownRegistry.js";
import {
	computeDoctorPayoutReportTotals,
	buildDoctorPayoutLimitations,
	METHOD_NOTE,
} from "./statementTotals.js";

/**
 * Выплаты всем врачам клиники за период (Doctor Payout Report Engine SSOT).
 * Декомпозирован по Mandate 8b / Sweet Spot (~150-200 строк).
 */
export async function doctorPayouts(
	scope: DoctorPayoutScope,
): Promise<DoctorPayoutReport> {
	const [snapshotRows, drillDown] = await withTenantCtx(
		scope.organizationId,
		async () => {
			const aggregates = await buildDoctorPayoutAggregateQuery(scope);
			const details = await fetchDoctorPayoutDrillDownDetails(scope);
			return [aggregates, details];
		},
	);

	const [snapshotHead] = snapshotRows;
	const aggregateRows = snapshotRows.filter(
		(
			row,
		): row is typeof row & {
			doctorUserId: string;
			doctorName: string;
			role: string;
			isActive: boolean;
		} => row.doctorUserId !== null,
	);

	const rows: DoctorPayoutRow[] = aggregateRows.map((row) => {
		const revenueRub = moneyFromDb(row.revenueRub, "выручка врача");
		const materialCostRub = moneyFromDb(
			row.materialCostRub,
			"себестоимость материалов",
		);
		const overheadCostRub = moneyFromDb(
			row.overheadCostRub ?? 0,
			"общеклинические расходники",
		);
		const materialMovements = Number(row.materialMovements ?? 0);
		const materialMovementsUnpriced = Number(
			row.materialMovementsUnpriced ?? 0,
		);
		const labCostRub = moneyFromDb(row.labCostRub, "расходы ЗТЛ");
		const labOrdersCount = Number(row.labOrdersCount ?? 0);
		const commissionPct = percentFromDb(
			row.commissionPct,
			"ставка врача (commission_pct)",
		);
		const materialDeductionPct = percentFromDb(
			row.materialDeductionPct,
			"процент удержания за материалы (material_cost_deduction_pct)",
		);
		const labDeductionPct = percentFromDb(
			row.labDeductionPct,
			"процент удержания за лабораторию (lab_cost_deduction_pct)",
		);

		const computed = computeDoctorPayout({
			revenueRub,
			materialCostRub,
			materialMovements,
			commissionPct,
			materialDeductionPct,
			overheadCostRub,
			labCostRub,
			labOrdersCount,
			labDeductionPct,
		});
		const materialsState = materialsStateOf(
			materialMovements,
			materialMovementsUnpriced,
		);
		const rateRowCount = Number(row.rateRowCount ?? 0);

		// Реестр визитов
		const doctorVisitsList = buildDoctorVisitsRegistry(row.doctorUserId, drillDown);

		// Реестр нарядов ЗТЛ
		const doctorLabOrdersList = buildDoctorLabOrdersRegistry(
			row.doctorUserId,
			drillDown,
			commissionPct,
			labDeductionPct,
		);

		// Начисления по категориям услуг (терапия, ортопедия, ортодонтия, хирургия)
		const doctorRates = drillDown.doctorSpecialtyRates.filter(
			(r) => r.userId === row.doctorUserId,
		);
		const categoryBreakdown = buildCategoryBreakdown(
			doctorVisitsList,
			doctorRates,
			commissionPct,
		);

		// Расчетный листок врача по формуле Net Revenue
		const payslipHtml = buildDoctorPayslipHtml({
			doctorUserId: row.doctorUserId,
			doctorName: row.doctorName,
			role: row.role,
			scope,
			revenueRub,
			materialCostRub,
			overheadCostRub,
			labCostRub,
			computedAccruedRub: computed.accruedRub,
			computedPayoutRub: computed.payoutRub,
			computedWithheldLabRub: computed.withheldLabRub,
			computedWithheldMaterialRub: computed.withheldMaterialRub,
			commissionPct,
			categoryBreakdown,
			doctorVisitsList,
			doctorLabOrdersList,
			drillDown,
		});

		return {
			doctorUserId: row.doctorUserId,
			doctorName: row.doctorName,
			role: row.role,
			isActive: row.isActive,
			revenueRub,
			paymentCount: Number(row.paymentCount ?? 0),
			materialCostRub,
			overheadCostRub,
			materialMovements,
			materialMovementsUnpriced,
			materialsState,
			labCostRub,
			labOrdersCount,
			withheldLabRub: computed.withheldLabRub,
			commissionPct,
			materialDeductionPct,
			rateEffectiveFrom: row.rateEffectiveFrom
				? new Date(row.rateEffectiveFrom).toISOString()
				: null,
			rateRowCount,
			state: computed.state,
			accruedRub: computed.accruedRub,
			withheldMaterialRub: computed.withheldMaterialRub,
			payoutRub: computed.payoutRub,
			...(categoryBreakdown.length > 0 ? { categoryBreakdown } : {}),
			payslipHtml,
			t51Html: payslipHtml,
			note: payoutRowNote({
				state: computed.state,
				materialsState,
				materialMovementsUnpriced,
				commissionPct,
				rateRowCount,
				payoutRub: computed.payoutRub,
				revenueRub,
			}),
			visits: doctorVisitsList,
			labOrders: doctorLabOrdersList,
		};
	});

	rows.sort(
		(left, right) =>
			new Decimal(right.revenueRub).minus(new Decimal(left.revenueRub)).toNumber() ||
			left.doctorName.localeCompare(right.doctorName, "ru"),
	);

	const {
		totals,
		totalRevenueRub,
		attributableRevenueRub,
		doctorsCounted,
		doctorsWithoutRate,
	} = computeDoctorPayoutReportTotals(rows, snapshotHead);

	const limitations = buildDoctorPayoutLimitations(
		rows,
		totalRevenueRub,
		attributableRevenueRub,
		doctorsCounted,
		doctorsWithoutRate,
	);

	return {
		period: { from: scope.from.toISOString(), to: scope.to.toISOString() },
		rows,
		totals,
		methodNote: METHOD_NOTE,
		limitations,
		isEmpty: rows.length === 0,
	};
}
