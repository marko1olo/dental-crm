import type React from "react";
import type { ManagerialPnlReport } from "@dental/shared";

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
				<span className="pnl-kpi-val revenue">
					{report.grossRevenueRub.toLocaleString("ru-RU")} ₽
				</span>
				<span className="pnl-kpi-sub">{totalServicesCount} услуг</span>
			</div>

			<div className="pnl-kpi-card">
				<span className="pnl-kpi-label">Себестоимость (COGS)</span>
				<span className="pnl-kpi-val cogs">
					{report.totalCogsRub.toLocaleString("ru-RU")} ₽
				</span>
				<span className="pnl-kpi-sub">
					ЗТЛ: {report.directLabCostRub.toLocaleString("ru-RU")} ₽
				</span>
			</div>

			<div className="pnl-kpi-card">
				<span className="pnl-kpi-label">Валовая прибыль</span>
				<span className="pnl-kpi-val profit">
					{report.grossProfitRub.toLocaleString("ru-RU")} ₽
				</span>
				<span className="pnl-kpi-sub">Маржинальность: {report.grossMarginPct}%</span>
			</div>

			<div className="pnl-kpi-card">
				<span className="pnl-kpi-label">Расходы клиники (OPEX)</span>
				<span className="pnl-kpi-val">
					{report.totalOpexRub.toLocaleString("ru-RU")} ₽
				</span>
				<span className="pnl-kpi-sub">Аренда, маркетинг, связь</span>
			</div>

			<div className="pnl-kpi-card">
				<span className="pnl-kpi-label">EBITDA</span>
				<span className="pnl-kpi-val ebitda">
					{report.ebitdaRub.toLocaleString("ru-RU")} ₽
				</span>
				<span className="pnl-kpi-sub">Рентабельность: {report.ebitdaMarginPct}%</span>
			</div>

			<div className="pnl-kpi-card">
				<span className="pnl-kpi-label">Чистая прибыль (Net)</span>
				<span className={`pnl-kpi-val ${report.isProfitable ? "profit" : "loss"}`}>
					{report.netProfitRub.toLocaleString("ru-RU")} ₽
				</span>
				<span className="pnl-kpi-sub">Рентабельность: {report.netMarginPct}%</span>
			</div>
		</div>
	);
};
