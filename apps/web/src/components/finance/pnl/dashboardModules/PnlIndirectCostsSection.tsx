import type React from "react";
import { Building2, TrendingUp } from "lucide-react";
import type { ManagerialPnlReport } from "@dental/shared";
import { PnlChairEconomicsTable } from "./PnlChairEconomicsTable";

export interface PnlIndirectCostsSectionProps {
	readonly report: ManagerialPnlReport;
}

export const PnlIndirectCostsSection: React.FC<PnlIndirectCostsSectionProps> = ({ report }) => {
	const be = report.breakEven;
	const ce = report.chairEconomics;

	return (
		<>
			{be && (
				<div className="pnl-section-block">
					<h3 className="pnl-section-title">
						<TrendingUp size={15} className="text-emerald-600" />
						<span>4. Точка безубыточности (CVP-анализ практики)</span>
					</h3>
					<div className="pnl-breakeven-grid">
						<div className="pnl-breakeven-card">
							<span className="pnl-kpi-label">Точка безубыточности</span>
							<span className="pnl-kpi-val text-blue-600">{be.breakEvenRevenueRub.toLocaleString("ru-RU")} ₽</span>
							<span className="pnl-kpi-sub">Требуется визитов: <b>{be.breakEvenVisitsCount}</b></span>
						</div>
						<div className="pnl-breakeven-card">
							<span className="pnl-kpi-label">Постоянные расходы (Fixed)</span>
							<span className="pnl-kpi-val">{be.fixedCostsRub.toLocaleString("ru-RU")} ₽</span>
							<span className="pnl-kpi-sub">Аренда, оклады, IT, коммуналка</span>
						</div>
						<div className="pnl-breakeven-card">
							<span className="pnl-kpi-label">Переменные расходы (Variable)</span>
							<span className="pnl-kpi-val cogs">{be.variableCostsRub.toLocaleString("ru-RU")} ₽</span>
							<span className="pnl-kpi-sub">Материалы, ЗТЛ, сдельный ФОТ</span>
						</div>
						<div className="pnl-breakeven-card">
							<span className="pnl-kpi-label">Коэффициент марж. дохода</span>
							<span className="pnl-kpi-val profit">{(be.contributionMarginRatio * 100).toFixed(1)}%</span>
							<span className="pnl-kpi-sub">Марж. доход: {be.contributionMarginRub.toLocaleString("ru-RU")} ₽</span>
						</div>
						<div className="pnl-breakeven-card">
							<span className="pnl-kpi-label">Запас фин. прочности</span>
							<span className={`pnl-kpi-val ${be.isBreakEvenReached ? "profit" : "loss"}`}>{be.marginOfSafetyRub.toLocaleString("ru-RU")} ₽</span>
							<span className="pnl-kpi-sub">{be.isBreakEvenReached ? `Запас безопасности: +${be.marginOfSafetyPct}%` : "Ниже точки безубыточности"}</span>
						</div>
						<div className="pnl-breakeven-card">
							<span className="pnl-kpi-label">Статус безубыточности</span>
							<div className="mt-1">
								<span className={`pnl-status-pill ${be.isBreakEvenReached ? "success" : "danger"}`}>{be.isBreakEvenReached ? "Безубыточность достигнута" : "Зона риска"}</span>
							</div>
							<span className="pnl-kpi-sub mt-1">
								{report.grossRevenueRub >= be.breakEvenRevenueRub
									? `Превышение на ${(report.grossRevenueRub - be.breakEvenRevenueRub).toLocaleString("ru-RU")} ₽`
									: `Дефицит: ${(be.breakEvenRevenueRub - report.grossRevenueRub).toLocaleString("ru-RU")} ₽`}
							</span>
						</div>
					</div>
				</div>
			)}

			{ce && (
				<div className="pnl-section-block">
					<h3 className="pnl-section-title">
						<Building2 size={15} className="text-indigo-600" />
						<span>5. Юнит-экономика стоматологических кресел</span>
					</h3>
					<div className="pnl-chair-summary-grid">
						<div className="pnl-kpi-card">
							<span className="pnl-kpi-label">Активных установок</span>
							<span className="pnl-kpi-val text-indigo-600">{ce.activeChairsCount} кресел</span>
							<span className="pnl-kpi-sub">Фонд часов: {ce.totalOperatingHours} ч</span>
						</div>
						<div className="pnl-kpi-card">
							<span className="pnl-kpi-label">Загрузка фонда кресел</span>
							<span className="pnl-kpi-val">{ce.chairOccupancyRatePct}%</span>
							<span className="pnl-kpi-sub">Отработано: {ce.totalOccupiedHours} ч</span>
						</div>
						<div className="pnl-kpi-card">
							<span className="pnl-kpi-label">Себестоимость часа доступности</span>
							<span className="pnl-kpi-val text-slate-700 dark:text-slate-200">{ce.costPerAvailableChairHourRub.toLocaleString("ru-RU")} ₽/ч</span>
							<span className="pnl-kpi-sub">Все расходы / фонд часов</span>
						</div>
						<div className="pnl-kpi-card">
							<span className="pnl-kpi-label">Себестоимость часа приема</span>
							<span className="pnl-kpi-val text-rose-600 dark:text-rose-400">{ce.costPerOccupiedChairHourRub.toLocaleString("ru-RU")} ₽/ч</span>
							<span className="pnl-kpi-sub">Все расходы / занятые часы</span>
						</div>
						<div className="pnl-kpi-card">
							<span className="pnl-kpi-label">Выручка на кресло</span>
							<span className="pnl-kpi-val revenue">{ce.revenuePerChairRub.toLocaleString("ru-RU")} ₽</span>
							<span className="pnl-kpi-sub">Средняя выработка</span>
						</div>
						<div className="pnl-kpi-card">
							<span className="pnl-kpi-label">Прибыль на кресло</span>
							<span className={`pnl-kpi-val ${ce.profitPerChairRub >= 0 ? "profit" : "loss"}`}>{ce.profitPerChairRub.toLocaleString("ru-RU")} ₽</span>
							<span className="pnl-kpi-sub">Чистый итог</span>
						</div>
					</div>
					<PnlChairEconomicsTable chairEconomics={ce} />
				</div>
			)}
		</>
	);
};
