import type { ClinicPnlSummary, RealExpensesInput } from "./financialEngineTypes";

/**
 * Расчет P&L структуры частной стоматологической клиники.
 * Честный учет фактических статей расходов из кассы и накладных.
 */
export function calculateClinicPnl(
	grossRevenueKopecks: number,
	customMarketingSpendKopecks = 0,
	realExpenses?: RealExpensesInput,
): ClinicPnlSummary {
	const rev = Math.max(0, Math.round(grossRevenueKopecks));

	// Себестоимость лечения (COGS: материалы, ЗТЛ, медикаменты) — факт из накладных/кассы
	const cogsKopecks =
		realExpenses?.cogsKopecks !== undefined
			? Math.max(0, Math.round(realExpenses.cogsKopecks))
			: Math.round(rev * 0.18);
	const grossProfitKopecks = Math.max(0, rev - cogsKopecks);

	// Маркетинг: факт из расходов либо переданный бюджет
	const marketingSpendKopecks =
		realExpenses?.marketingSpendKopecks !== undefined
			? Math.max(0, Math.round(realExpenses.marketingSpendKopecks))
			: Math.max(0, Math.round(customMarketingSpendKopecks));

	// ФОТ: факт из кассы / начислений зарплаты
	const payrollKopecks =
		realExpenses?.payrollKopecks !== undefined
			? Math.max(0, Math.round(realExpenses.payrollKopecks))
			: Math.round(rev * 0.40);

	// Накладные расходы (аренда кресел, коммуналка, связь, софт)
	const overheadKopecks =
		realExpenses?.overheadKopecks !== undefined
			? Math.max(0, Math.round(realExpenses.overheadKopecks))
			: Math.round(rev * 0.15);

	const totalOpexKopecks = marketingSpendKopecks + payrollKopecks + overheadKopecks;
	const ebitdaKopecks = Math.max(0, grossProfitKopecks - totalOpexKopecks);

	// Налог УСН (факт либо 6% от дохода)
	const estimatedTaxKopecks =
		realExpenses?.taxKopecks !== undefined
			? Math.max(0, Math.round(realExpenses.taxKopecks))
			: Math.round(rev * 0.06);

	const netProfitKopecks = Math.max(0, ebitdaKopecks - estimatedTaxKopecks);
	const netMarginPercent = rev > 0 ? Number(((netProfitKopecks / rev) * 100).toFixed(1)) : 0;

	return {
		grossRevenueKopecks: rev,
		cogsKopecks,
		grossProfitKopecks,
		marketingSpendKopecks,
		payrollKopecks,
		overheadKopecks,
		totalOpexKopecks,
		ebitdaKopecks,
		estimatedTaxKopecks,
		netProfitKopecks,
		netMarginPercent,
	};
}
