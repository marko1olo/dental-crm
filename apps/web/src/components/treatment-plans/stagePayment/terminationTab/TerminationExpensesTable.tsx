import React from "react";
import { Plus } from "lucide-react";
import { formatKopecksRu } from "@dental/shared";
import type { TerminationExpenseItem } from "../stagePaymentEngine.js";

export interface TerminationExpensesTableProps {
	readonly itemizedExpenses: readonly TerminationExpenseItem[];
	readonly newExpenseTitle: string;
	readonly onNewExpenseTitleChange: (value: string) => void;
	readonly newExpenseRub: string;
	readonly onNewExpenseRubChange: (value: string) => void;
	readonly newExpenseCategory: TerminationExpenseItem["category"];
	readonly onNewExpenseCategoryChange: (value: TerminationExpenseItem["category"]) => void;
	readonly onAddCustomExpense: () => void;
}

export const TerminationExpensesTable: React.FC<TerminationExpensesTableProps> = ({
	itemizedExpenses,
	newExpenseTitle,
	onNewExpenseTitleChange,
	newExpenseRub,
	onNewExpenseRubChange,
	newExpenseCategory,
	onNewExpenseCategoryChange,
	onAddCustomExpense,
}) => {
	return (
		<div className="rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,#ffffff)] p-5 flex flex-col gap-4">
			<h3 className="font-bold text-sm text-[var(--ink,#0f172a)] flex items-center justify-between">
				<span>Фактически понесенные расходы клиники (Lab, BOM, расходники):</span>
				<span className="text-xs text-[var(--muted,#64748b)] font-normal">
					Позиций: {itemizedExpenses.length}
				</span>
			</h3>

			{itemizedExpenses.length > 0 ? (
				<div className="overflow-x-auto">
					<table className="w-full text-xs text-left">
						<thead>
							<tr className="border-b border-[var(--border,#cbd5e1)] text-[var(--muted,#64748b)]">
								<th className="py-2 px-3">Статья расхода</th>
								<th className="py-2 px-3">Категория</th>
								<th className="py-2 px-3">Обоснование</th>
								<th className="py-2 px-3 text-right">Сумма</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--line)]">
							{itemizedExpenses.map((exp, i) => (
								<tr key={i} className="hover:bg-[var(--paper-soft)] transition-colors">
									<td className="py-2 px-3 font-semibold text-[var(--ink)]">{exp.title}</td>
									<td className="py-2 px-3 text-[var(--muted)]">{exp.category}</td>
									<td className="py-2 px-3 text-[var(--muted)]">{exp.justificationRu}</td>
									<td className="py-2 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
										{formatKopecksRu(exp.amountKopecks)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<p className="text-xs text-[var(--muted)] italic">
					Прямых расходов по незавершенным этапам не зафиксировано.
				</p>
			)}

			{/* Add Custom Expense Input */}
			<div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[var(--line)]">
				<input
					type="text"
					value={newExpenseTitle}
					onChange={(e) => onNewExpenseTitleChange(e.target.value)}
					placeholder="Добавить подтвержденный расход (напр. фрезеровка каркаса)..."
					className="flex-1 min-w-[200px] rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-xs text-[var(--ink)] focus:border-[var(--teal,var(--brand-primary))] focus:outline-none"
				/>
				<select
					value={newExpenseCategory}
					onChange={(e) => onNewExpenseCategoryChange(e.target.value as TerminationExpenseItem["category"])}
					className="rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-xs text-[var(--ink)] focus:border-[var(--teal,var(--brand-primary))] focus:outline-none cursor-pointer"
				>
					<option value="lab_cadcam">CAD/CAM Лаборатория</option>
					<option value="implant_hardware">Имплантаты/Компоненты</option>
					<option value="sterilization_materials">Материалы/Стерилизация</option>
					<option value="diagnostic">Диагностика/Шаблоны</option>
				</select>
				<input
					type="number"
					value={newExpenseRub}
					onChange={(e) => onNewExpenseRubChange(e.target.value)}
					placeholder="Сумма ₽"
					className="w-28 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-xs text-[var(--ink)] focus:border-[var(--teal,var(--brand-primary))] focus:outline-none"
				/>
				<button
					type="button"
					onClick={onAddCustomExpense}
					className="stage-action-btn secondary text-xs h-8 px-3"
				>
					<Plus className="h-4 w-4" />
					<span>Добавить</span>
				</button>
			</div>
		</div>
	);
};
