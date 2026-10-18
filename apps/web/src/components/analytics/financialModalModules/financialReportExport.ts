import { showToast } from "../../GlobalToast";
import { buildRfc4180Csv, triggerCsvDownload } from "../../reports/reportsCsvExport";

export type FinancialPeriodChoice = "month" | "quarter" | "year";

export interface CashBoxRecord {
	id: string;
	name: string;
	code: string;
	balanceRub: number;
	isShiftOpen: boolean;
	accountType?: string;
}

export function getFinancialPeriodDateRange(p: FinancialPeriodChoice) {
	const now = new Date();
	const y = now.getFullYear();
	const m = now.getMonth();
	if (p === "quarter") {
		const qStart = Math.floor(m / 3) * 3;
		const from = new Date(Date.UTC(y, qStart, 1)).toISOString().slice(0, 10);
		const to = new Date(Date.UTC(y, qStart + 3, 0)).toISOString().slice(0, 10);
		return { from, to };
	}
	if (p === "year") {
		return { from: `${y}-01-01`, to: `${y}-12-31` };
	}
	const from = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
	const to = new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);
	return { from, to };
}

export function exportFinancialPnlCsvReport(params: {
	period: FinancialPeriodChoice;
	totalRevenueRub: number;
	estimatedCogsRub: number;
	grossProfitRub: number;
	estimatedPayrollRub: number;
	marketingSpendRub: number;
	estimatedOverheadRub: number;
	ebitdaRub: number;
	netProfitRub: number;
	netMarginPercent: number;
}) {
	try {
		const rows = [
			["Статья P&L", "Сумма (₽)"],
			["Выручка (Gross Revenue)", params.totalRevenueRub],
			["Себестоимость лечения (COGS: ЗТЛ + Материалы + ФОТ)", params.estimatedCogsRub],
			["Валовая прибыль (Gross Profit)", params.grossProfitRub],
			["ФОТ врачей и персонала (факт)", params.estimatedPayrollRub],
			["Маркетинг и реклама", params.marketingSpendRub],
			["Аренда и накладные расходы (факт)", params.estimatedOverheadRub],
			["EBITDA", params.ebitdaRub],
			["Чистая прибыль (Net Profit)", params.netProfitRub],
			["Рентабельность (%)", `${params.netMarginPercent}%`],
		];
		const todayDate = new Date().toISOString().slice(0, 10);
		const csvContent = buildRfc4180Csv(rows, ";");
		triggerCsvDownload(csvContent, `Dente_Financial_PnL_${params.period}_${todayDate}.csv`);
		showToast("Финансовый отчет выгружен в CSV (Excel)", "success");
	} catch {
		showToast("Не удалось экспортировать отчет", "error");
	}
}
