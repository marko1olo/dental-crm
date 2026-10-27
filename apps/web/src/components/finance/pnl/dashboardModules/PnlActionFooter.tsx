import type React from "react";
import { Download, PlusCircle, Printer } from "lucide-react";
import type { ManagerialPnlReport } from "@dental/shared";

export interface PnlActionFooterProps {
	readonly report: ManagerialPnlReport | null;
	readonly onOpenQuickExpense: () => void;
	readonly periodLabel?: string | undefined;
}

export const PnlActionFooter: React.FC<PnlActionFooterProps> = ({
	report,
	onOpenQuickExpense,
	periodLabel,
}) => {
	const handlePrint = () => {
		if (typeof window !== "undefined") {
			window.print();
		}
	};

	const handleExportCsv = () => {
		if (!report || typeof document === "undefined") return;

		const rows: string[][] = [
			["Управленческий P&L отчет DENTE CRM", periodLabel || ""],
			["Период", `${report.period.from} — ${report.period.to}`],
			["Клиника", report.clinicName],
			[],
			["КЛЮЧЕВЫЕ ПОКАЗАТЕЛИ", "Сумма (₽)", "Доля / Примечание"],
			["Валовая выручка", String(report.grossRevenueRub), "100%"],
			["Себестоимость COGS", String(report.totalCogsRub), `ЗТЛ: ${report.directLabCostRub} ₽`],
			["Валовая прибыль", String(report.grossProfitRub), `Маржинальность: ${report.grossMarginPct}%`],
			["Расходы клиники OPEX", String(report.totalOpexRub), ""],
			["EBITDA", String(report.ebitdaRub), `Рентабельность: ${report.ebitdaMarginPct}%`],
			["Чистая прибыль Net", String(report.netProfitRub), `Рентабельность: ${report.netMarginPct}%`],
			[],
			["ВЫРУЧКА ПО ОТДЕЛЕНИЯМ", "Выручка (₽)", "Доля (%)", "Маржа (₽)"],
			...report.departmentRevenue.map((d) => [d.titleRu, String(d.revenueRub), `${d.sharePct}%`, String(d.marginRub)]),
			[],
			["РАСХОДЫ ПО СТАТЬЯМ", "Категория", "Сумма (₽)", "Доля (%)"],
			...report.statutoryExpenses.map((e) => [e.titleRu, e.costNature, String(e.amountRub), `${e.shareOfExpensesPct}%`]),
		];

		const csvContent = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
		const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `pnl_report_${report.period.from}_${report.period.to}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	return (
		<div className="pnl-footer">
			<div className="pnl-footer-meta">
				<span className="pnl-footer-status">✓ Данные синхронизированы в реальном времени</span>
			</div>
			<div className="pnl-footer-actions">
				<button
					type="button"
					className="pnl-footer-btn-secondary"
					onClick={handlePrint}
					title="Распечатать P&L отчет"
				>
					<Printer size={14} />
					<span>Печать</span>
				</button>

				<button
					type="button"
					className="pnl-footer-btn-secondary"
					onClick={handleExportCsv}
					title="Экспортировать отчет в CSV"
				>
					<Download size={14} />
					<span>Экспорт CSV</span>
				</button>

				<button
					type="button"
					className="pnl-footer-btn-primary"
					onClick={onOpenQuickExpense}
					title="Внести операционный расход"
				>
					<PlusCircle size={15} />
					<span>+ Внести расход</span>
				</button>
			</div>
		</div>
	);
};
