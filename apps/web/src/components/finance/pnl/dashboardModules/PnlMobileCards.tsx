import type React from "react";
import { Building2, PieChart, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { DEPARTMENT_METADATA_RU, type ManagerialPnlReport } from "@dental/shared";

export interface PnlMobileCardsProps {
	readonly report: ManagerialPnlReport;
}

export const PnlMobileCards: React.FC<PnlMobileCardsProps> = ({ report }) => {
	const be = report.breakEven;

	return (
		<div className="pnl-mobile-view">
			{/* Направления */}
			<div className="pnl-mobile-group">
				<div className="pnl-mobile-group-header">
					<PieChart size={15} className="text-blue-600" />
					<span>Выручка по отделениям ({report.departmentRevenue.length})</span>
				</div>
				<div className="pnl-mobile-cards-list">
					{report.departmentRevenue.map((dept) => {
						const color = DEPARTMENT_METADATA_RU[dept.department]?.color || "var(--teal)";
						return (
							<div key={dept.department} className="pnl-mobile-card">
								<div className="pnl-mobile-card-row">
									<span className="pnl-mobile-card-title">{dept.titleRu}</span>
									<span className="pnl-mobile-card-val">{dept.revenueRub.toLocaleString("ru-RU")} ₽</span>
								</div>
								<div className="pnl-progress-bar-bg">
									<div className="pnl-progress-bar-fill" style={{ width: `${dept.sharePct}%`, background: color }} />
								</div>
								<div className="pnl-mobile-card-details">
									<span>Доля: {dept.sharePct}%</span>
									<span className="text-emerald-600 dark:text-emerald-400">Маржа: {dept.marginRub.toLocaleString("ru-RU")} ₽</span>
									<span>Чек: {dept.averageBillRub.toLocaleString("ru-RU")} ₽</span>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Кассы */}
			<div className="pnl-mobile-group">
				<div className="pnl-mobile-group-header">
					<Wallet size={15} className="text-blue-600" />
					<span>Поступления по кассам ({report.cashBoxRevenue.length})</span>
				</div>
				<div className="pnl-mobile-cards-list">
					{report.cashBoxRevenue.map((box) => (
						<div key={box.boxId} className="pnl-mobile-card">
							<div className="pnl-mobile-card-row">
								<span className="pnl-mobile-card-title">{box.boxName}</span>
								<span className="pnl-mobile-card-val">{box.revenueRub.toLocaleString("ru-RU")} ₽</span>
							</div>
							<div className="pnl-mobile-card-details">
								<span className="font-mono text-xs text-slate-500">{box.boxType}</span>
								<span>Доля: {box.sharePct}%</span>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Расходы */}
			<div className="pnl-mobile-group">
				<div className="pnl-mobile-group-header">
					<TrendingDown size={15} className="text-red-600" />
					<span>Статьи расходов ({report.statutoryExpenses.length})</span>
				</div>
				<div className="pnl-mobile-cards-list">
					{report.statutoryExpenses.slice(0, 6).map((exp) => (
						<div key={exp.reasonId} className="pnl-mobile-card">
							<div className="pnl-mobile-card-row">
								<span className="pnl-mobile-card-title">{exp.titleRu}</span>
								<span className="pnl-mobile-card-val text-rose-600 dark:text-rose-400">
									{exp.amountRub.toLocaleString("ru-RU")} ₽
								</span>
							</div>
							<div className="pnl-mobile-card-details">
								<span>Доля: {exp.shareOfExpensesPct}%</span>
								<span>{exp.costNature === "direct_cogs" ? "COGS" : exp.costNature === "opex" ? "OPEX" : "Налоги"}</span>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* CVP статус */}
			{be && (
				<div className="pnl-mobile-group">
					<div className="pnl-mobile-group-header">
						<TrendingUp size={15} className="text-emerald-600" />
						<span>Точка безубыточности: {be.isBreakEvenReached ? "Достигнута" : "Зона риска"}</span>
					</div>
					<div className="pnl-mobile-card">
						<div className="pnl-mobile-card-row">
							<span>Точка безубыточности:</span>
							<span className="font-semibold">{be.breakEvenRevenueRub.toLocaleString("ru-RU")} ₽</span>
						</div>
						<div className="pnl-mobile-card-row">
							<span>Запас безопасности:</span>
							<span className={be.isBreakEvenReached ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>
								{be.marginOfSafetyRub.toLocaleString("ru-RU")} ₽ ({be.marginOfSafetyPct}%)
							</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
