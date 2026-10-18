import React from "react";
import { ChevronDown, ChevronUp, Receipt } from "lucide-react";
import { ExpensesTable } from "./ExpensesTable";
import type { ExpenseReasonRecord } from "./financialPnlTypes";

export interface FinancialExpensesSectionProps {
	readonly isExpensesExpanded: boolean;
	readonly onToggleExpenses: () => void;
	readonly expenseReasons: ExpenseReasonRecord[];
	readonly realPnl: any | null;
	readonly totalOpexRub: number;
}

export const FinancialExpensesSection: React.FC<FinancialExpensesSectionProps> = ({
	isExpensesExpanded,
	onToggleExpenses,
	expenseReasons,
	realPnl,
	totalOpexRub,
}) => {
	const resolvedExpenses: ExpenseReasonRecord[] =
		expenseReasons.length > 0
			? expenseReasons
			: (realPnl?.statutoryExpenses || []).map((se: any) => ({
					id: String(se.reasonId),
					code: se.reasonId,
					name: se.titleRu,
					category:
						se.costNature === "direct_cogs"
							? "Прямые (COGS)"
							: se.costNature === "taxes"
								? "Налоги"
								: "Операционные (OPEX)",
					description: "Регламентированная статья управленческого учета P&L",
				}));

	return (
		<section className="fin-analytics-panel" data-testid="panel-expenses">
			<div className="fin-analytics-panel-header">
				<h3 className="fin-analytics-panel-title">
					<Receipt size={16} color="var(--warn-fg)" />
					<span>12 регламентированных статей расходов клиники</span>
				</h3>
				<button
					type="button"
					onClick={onToggleExpenses}
					className="secondary-button fin-analytics-toggle-btn"
					aria-expanded={isExpensesExpanded}
					data-testid="toggle-expenses-btn"
				>
					{isExpensesExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
					<span>{isExpensesExpanded ? "Скрыть статьи" : "Показать статьи расходов"}</span>
				</button>
			</div>

			{!isExpensesExpanded && (
				<div className="fin-analytics-compact-strip" data-testid="expenses-compact-strip">
					<span style={{ color: "var(--muted)" }}>
						12 нормативных статей: ЗТЛ ({(realPnl?.directLabCostRub || 0).toLocaleString("ru-RU")} ₽) • Материалы (
						{(realPnl?.directMaterialsCostRub || 0).toLocaleString("ru-RU")} ₽) • ФОТ (
						{(realPnl?.directDoctorPieceRateRub || 0).toLocaleString("ru-RU")} ₽) • OPEX (
						{totalOpexRub.toLocaleString("ru-RU")} ₽)
					</span>
					<button
						type="button"
						onClick={onToggleExpenses}
						className="secondary-button fin-analytics-toggle-btn"
						style={{ fontSize: 11, height: 26, minHeight: 26 }}
					>
						Развернуть классификатор статей →
					</button>
				</div>
			)}

			{isExpensesExpanded && (
				<ExpensesTable resolvedExpenses={resolvedExpenses} realPnl={realPnl} />
			)}
		</section>
	);
};
export default FinancialExpensesSection;
