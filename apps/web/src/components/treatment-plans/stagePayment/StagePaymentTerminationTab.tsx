/**
 * StagePaymentTerminationTab.tsx — Вкладка расторжения договора и расчета возврата (DENTE CRM).
 *
 * Содержит:
 * 1. Информационный баннер законных оснований расторжения (ст. 32 ЗоЗПП, ст. 709 ГК РФ).
 * 2. 4-колоночную финансовую сетку расчета (Оплачено, Принято по актам, Затраты клиники, К возврату).
 * 3. Детализированную таблицу подтвержденных расходов (Lab CAD/CAM, титан, стерилизация).
 * 4. Форму ручного добавления фактически понесенного расхода.
 * 5. Правовое заключение для соглашения о расторжении.
 */

import React from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { formatKopecksRu } from "@dental/shared";
import type {
	TerminationExpenseItem,
	TerminationRefundCalculation,
} from "./stagePaymentEngine.js";

export interface StagePaymentTerminationTabProps {
	readonly terminationCalc: TerminationRefundCalculation;
	readonly newExpenseTitle: string;
	readonly onNewExpenseTitleChange: (value: string) => void;
	readonly newExpenseRub: string;
	readonly onNewExpenseRubChange: (value: string) => void;
	readonly newExpenseCategory: TerminationExpenseItem["category"];
	readonly onNewExpenseCategoryChange: (value: TerminationExpenseItem["category"]) => void;
	readonly onAddCustomExpense: () => void;
}

export const StagePaymentTerminationTab: React.FC<StagePaymentTerminationTabProps> = ({
	terminationCalc,
	newExpenseTitle,
	onNewExpenseTitleChange,
	newExpenseRub,
	onNewExpenseRubChange,
	newExpenseCategory,
	onNewExpenseCategoryChange,
	onAddCustomExpense,
}) => {
	return (
		<div className="flex flex-col gap-6">
			{/* Statutory Rule Banner */}
			<div className="rounded-2xl border border-rose-500/20 bg-rose-50/40 dark:bg-rose-950/20 p-4 text-xs text-[var(--ink,#0f172a)] flex items-start gap-3">
				<AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
				<div>
					<h4 className="font-bold text-rose-900 dark:text-rose-200">
						Расчет возврата при досрочном расторжении
					</h4>
					<p className="text-[var(--muted,#64748b)] mt-1">
						Потребитель вправе отказаться от договора в любое время при условии оплаты фактически понесенных расходов клиники (ст. 709 ГК РФ). Работы по подписанным Актам признаны и возврату не подлежат.
					</p>
				</div>
			</div>

			{/* Calculation Breakdown Grid */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div className="rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,#ffffff)] p-4 text-xs">
					<span className="text-[var(--muted,#64748b)] block">Всего оплачено пациентом:</span>
					<span className="text-xl font-bold text-[var(--ink,#0f172a)] mt-1 block">
						{formatKopecksRu(terminationCalc.totalPaidByPatientKopecks)}
					</span>
				</div>

				<div className="rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,#ffffff)] p-4 text-xs">
					<span className="text-[var(--muted,#64748b)] block">Принято по Актам (не возвращается):</span>
					<span className="text-xl font-bold text-[var(--teal-dark,var(--teal))] mt-1 block">
						{formatKopecksRu(terminationCalc.completedActsTotalKopecks)}
					</span>
				</div>

				<div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-[var(--paper-strong,#ffffff)] p-4 text-xs">
					<span className="text-[var(--muted,#64748b)] block">Фактические расходы клиники:</span>
					<span className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1 block">
						{formatKopecksRu(terminationCalc.actualClinicExpensesKopecks)}
					</span>
				</div>

				<div className="rounded-xl border border-emerald-400 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 text-xs">
					<span className="text-emerald-800 dark:text-emerald-300 font-bold block">Сумма к возврату пациенту:</span>
					<span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
						{formatKopecksRu(terminationCalc.refundableToPatientKopecks)}
					</span>
				</div>
			</div>

			{/* Itemized Expenses Table */}
			<div className="rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,#ffffff)] p-5 flex flex-col gap-4">
				<h3 className="font-bold text-sm text-[var(--ink,#0f172a)] flex items-center justify-between">
					<span>Фактически понесенные расходы клиники (Lab, BOM, расходники):</span>
					<span className="text-xs text-[var(--muted,#64748b)] font-normal">
						Позиций: {terminationCalc.itemizedExpenses.length}
					</span>
				</h3>

				{terminationCalc.itemizedExpenses.length > 0 ? (
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
							<tbody className="divide-y divide-[var(--border,#cbd5e1)]">
								{terminationCalc.itemizedExpenses.map((exp, i) => (
									<tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
										<td className="py-2 px-3 font-semibold text-[var(--ink,#0f172a)]">{exp.title}</td>
										<td className="py-2 px-3 text-[var(--muted,#64748b)]">{exp.category}</td>
										<td className="py-2 px-3 text-[var(--muted,#64748b)]">{exp.justificationRu}</td>
										<td className="py-2 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
											{formatKopecksRu(exp.amountKopecks)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<p className="text-xs text-[var(--muted,#64748b)] italic">
						Прямых расходов по незавершенным этапам не зафиксировано.
					</p>
				)}

				{/* Add Custom Expense Input */}
				<div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[var(--border,#cbd5e1)]">
					<input
						type="text"
						value={newExpenseTitle}
						onChange={(e) => onNewExpenseTitleChange(e.target.value)}
						placeholder="Добавить подтвержденный расход (напр. фрезеровка каркаса)..."
						className="flex-1 min-w-[200px] rounded-xl border border-[var(--border,#cbd5e1)] bg-transparent px-3 py-2 text-xs text-[var(--ink,#0f172a)] focus:border-[var(--teal,var(--brand-primary))] focus:outline-none"
					/>
					<select
						value={newExpenseCategory}
						onChange={(e) => onNewExpenseCategoryChange(e.target.value as TerminationExpenseItem["category"])}
						className="rounded-xl border border-[var(--border,#cbd5e1)] bg-transparent px-3 py-2 text-xs text-[var(--ink,#0f172a)] focus:border-[var(--teal,var(--brand-primary))] focus:outline-none"
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
						className="w-28 rounded-xl border border-[var(--border,#cbd5e1)] bg-transparent px-3 py-2 text-xs text-[var(--ink,#0f172a)] focus:border-[var(--teal,var(--brand-primary))] focus:outline-none"
					/>
					<button
						type="button"
						onClick={onAddCustomExpense}
						className="stage-action-btn secondary text-xs"
					>
						<Plus className="h-4 w-4" />
						<span>Добавить</span>
					</button>
				</div>
			</div>

			{/* Legal Rationale Box */}
			<div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-[var(--border,#cbd5e1)] p-4 text-xs text-[var(--muted,#64748b)] leading-relaxed">
				<strong className="text-[var(--ink,#0f172a)] block mb-1">
					Правовое заключение для соглашения о расторжении:
				</strong>
				{terminationCalc.legalRationaleRu}
			</div>
		</div>
	);
};

export default StagePaymentTerminationTab;
