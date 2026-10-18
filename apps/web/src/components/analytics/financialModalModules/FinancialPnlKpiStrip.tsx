import React from "react";
import {
	CheckCircle2,
	DollarSign,
	Layers,
	PieChart,
	Receipt,
	TrendingUp,
} from "lucide-react";
import type { ComputedPnlMetrics, ExecutiveKpisData } from "./financialPnlTypes";

export interface FinancialPnlKpiStripProps {
	readonly metrics: ComputedPnlMetrics;
	readonly executiveKpis: ExecutiveKpisData | null;
	readonly realPnl: any | null;
}

export const FinancialPnlKpiStrip: React.FC<FinancialPnlKpiStripProps> = ({
	metrics,
	executiveKpis,
	realPnl,
}) => {
	const {
		totalRevenueRub,
		estimatedCogsRub,
		grossProfitRub,
		totalOpexRub,
		marketingSpendRub,
		ebitdaRub,
		netProfitRub,
		netMarginPercent,
	} = metrics;

	return (
		<div className="fin-analytics-kpi-grid">
			<div className="fin-analytics-kpi-card" data-testid="kpi-gross-revenue">
				<div className="fin-analytics-kpi-header">
					<span>Выручка (Gross)</span>
					<DollarSign size={14} color="var(--teal)" />
				</div>
				<div className="fin-analytics-kpi-value">
					{totalRevenueRub.toLocaleString("ru-RU")} ₽
				</div>
				<div className="fin-analytics-kpi-sub">
					Первичка: {Math.round((executiveKpis?.primaryRevenueKopecks || 0) / 100).toLocaleString("ru-RU")} ₽
				</div>
			</div>

			<div className="fin-analytics-kpi-card" data-testid="kpi-cogs">
				<div className="fin-analytics-kpi-header">
					<span>Себестоимость (COGS)</span>
					<Layers size={14} color="var(--muted)" />
				</div>
				<div className="fin-analytics-kpi-value">
					{estimatedCogsRub.toLocaleString("ru-RU")} ₽
				</div>
				<div className="fin-analytics-kpi-sub">
					{realPnl
						? `ЗТЛ: ${(realPnl.directLabCostRub || 0).toLocaleString("ru-RU")} ₽ • Мат: ${(realPnl.directMaterialsCostRub || 0).toLocaleString("ru-RU")} ₽`
						: "ЗТЛ, материалы и ФОТ"}
				</div>
			</div>

			<div className="fin-analytics-kpi-card" data-testid="kpi-gross-profit">
				<div className="fin-analytics-kpi-header">
					<span>Валовая прибыль</span>
					<TrendingUp size={14} color="var(--teal)" />
				</div>
				<div className="fin-analytics-kpi-value" style={{ color: "var(--teal)" }}>
					{grossProfitRub.toLocaleString("ru-RU")} ₽
				</div>
				<div className="fin-analytics-kpi-sub">
					{realPnl
						? `Маржинальность: ${realPnl.grossMarginPct}%`
						: `Маржа: ${totalRevenueRub > 0 ? Math.round((grossProfitRub / totalRevenueRub) * 100) : 0}%`}
				</div>
			</div>

			<div className="fin-analytics-kpi-card" data-testid="kpi-opex">
				<div className="fin-analytics-kpi-header">
					<span>Операционные (OPEX)</span>
					<Receipt size={14} color="var(--warn-fg)" />
				</div>
				<div className="fin-analytics-kpi-value">
					{totalOpexRub.toLocaleString("ru-RU")} ₽
				</div>
				<div className="fin-analytics-kpi-sub">
					Маркетинг: {marketingSpendRub.toLocaleString("ru-RU")} ₽
				</div>
			</div>

			<div className="fin-analytics-kpi-card" data-testid="kpi-ebitda">
				<div className="fin-analytics-kpi-header">
					<span>EBITDA</span>
					<PieChart size={14} color="var(--teal)" />
				</div>
				<div className="fin-analytics-kpi-value" style={{ color: "var(--teal)" }}>
					{ebitdaRub.toLocaleString("ru-RU")} ₽
				</div>
				<div className="fin-analytics-kpi-sub">До налога и амортизации</div>
			</div>

			<div className="fin-analytics-kpi-card" data-testid="kpi-net-profit">
				<div className="fin-analytics-kpi-header">
					<span>Чистая прибыль</span>
					<CheckCircle2 size={14} color="var(--ok-fg)" />
				</div>
				<div className="fin-analytics-kpi-value" style={{ color: "var(--ok-fg)" }}>
					{netProfitRub.toLocaleString("ru-RU")} ₽
				</div>
				<div className="fin-analytics-kpi-sub">
					Рентабельность: <b>{netMarginPercent}%</b>
				</div>
			</div>
		</div>
	);
};
export default FinancialPnlKpiStrip;
