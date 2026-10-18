import type {
	ComputedPnlMetrics,
	ExecutiveKpisData,
} from "./financialPnlTypes";

export function computeFinancialPnlMetrics(
	executiveKpis: ExecutiveKpisData | null,
	realPnl: any | null,
): ComputedPnlMetrics {
	const totalRevenueRub =
		realPnl?.grossRevenueRub ?? Math.round((executiveKpis?.totalRevenueKopecks || 0) / 100);
	const estimatedCogsRub =
		realPnl?.totalCogsRub ?? Math.round((executiveKpis?.cogsKopecks || 0) / 100);
	const grossProfitRub = realPnl?.grossProfitRub ?? totalRevenueRub - estimatedCogsRub;
	const marketingSpendRub =
		realPnl?.statutoryExpenses?.find((e: any) => e.reasonId === 6)?.amountRub ??
		Math.round((executiveKpis?.totalMarketingSpendKopecks || 0) / 100);
	const estimatedPayrollRub = realPnl?.directDoctorPieceRateRub ?? 0;
	const totalOpexRub =
		realPnl?.totalOpexRub ?? Math.round((executiveKpis?.opexKopecks || 0) / 100);
	const estimatedOverheadRub = Math.max(0, totalOpexRub - marketingSpendRub);
	const ebitdaRub = realPnl?.ebitdaRub ?? grossProfitRub - totalOpexRub;
	const netProfitRub =
		realPnl?.netProfitRub ??
		(executiveKpis?.netProfitKopecks !== undefined
			? Math.round(executiveKpis.netProfitKopecks / 100)
			: ebitdaRub);
	const netMarginPercent =
		realPnl?.netMarginPct ??
		(executiveKpis?.netMarginPercent ??
			(totalRevenueRub > 0 ? Math.round((netProfitRub / totalRevenueRub) * 100) : 0));

	return {
		totalRevenueRub,
		estimatedCogsRub,
		grossProfitRub,
		marketingSpendRub,
		estimatedPayrollRub,
		totalOpexRub,
		estimatedOverheadRub,
		ebitdaRub,
		netProfitRub,
		netMarginPercent,
	};
}
