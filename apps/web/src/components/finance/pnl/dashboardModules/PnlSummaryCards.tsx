import type React from "react";
import { type ManagerialPnlReport, formatRubles } from "@dental/shared";

export interface PnlSummaryCardsProps {
	readonly report: ManagerialPnlReport;
}

export const PnlSummaryCards: React.FC<PnlSummaryCardsProps> = ({ report }) => {
	const totalServicesCount = report.departmentRevenue.reduce(
		(acc, item) => acc + item.servicesCount,
		0,
	);

	return (
		<div className="pnl-kpi-grid">
			<div className="pnl-kpi-card">
				<span className="pnl-kpi-label">Валовая выручка</span>
				<span className="pnl-kpi-val revenue font-mono tabular-nums tracking-tight">
					{formatRubles(report.grossRevenueRub)}
				</span>
				<span className="pnl-kpi-sub">{totalServicesCount} услуг</span>
			</div>

			<div className="pnl-kpi-card">
				<span className="pnl-kpi-label">Себестоимость (COGS)</span>
				<span className="pnl-kpi-val cogs font-mono tabular-nums tracking-tight">
					{formatRubles(report.totalCogsRub)}
				</span>
				<span className="pnl-kpi-sub">
					ЗТЛ: {formatRubles(report.directLabCostRub)}
				</span>
			</div>

			<div className="pnl-kpi-card">
				<span className="pnl-kpi-label">Валовая прибыль</span>
				<span className="pnl-kpi-val profit font-mono tabular-nums tracking-tight">
					{formatRubles(report.grossProfitRub)}
				</span>
				<span className="pnl-kpi-sub">Маржинальность: {report.grossMarginPct}%</span>
			</div>

			<div className="pnl-kpi-card">
				<span className="pnl-kpi-label">Расходы клиники (OPEX)</span>
				<span className="pnl-kpi-val font-mono tabular-nums tracking-tight">
					{formatRubles(report.totalOpexRub)}
				</span>
				<span className="pnl-kpi-sub">Аренда, маркетинг, связь</span>
			</div>

			<div className="pnl-kpi-card">
				<span className="pnl-kpi-label">EBITDA</span>
				<span className="pnl-kpi-val ebitda font-mono tabular-nums tracking-tight">
					{formatRubles(report.ebitdaRub)}
				</span>
				<span className="pnl-kpi-sub">Рентабельность: {report.ebitdaMarginPct}%</span>
			</div>

			<div className="pnl-kpi-card">
				<span className="pnl-kpi-label">Чистая прибыль (Net)</span>
				<span className={`pnl-kpi-val ${report.isProfitable ? "profit" : "loss"} font-mono tabular-nums tracking-tight`}>
					{formatRubles(report.netProfitRub)}
				</span>
				<span className="pnl-kpi-sub">Рентабельность: {report.netMarginPct}%</span>
			</div>
		</div>
	);
};
