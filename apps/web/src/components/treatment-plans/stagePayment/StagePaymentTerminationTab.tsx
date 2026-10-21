/**
 * StagePaymentTerminationTab.tsx — Вкладка расторжения договора и расчета возврата (DENTE CRM).
 */

import React from "react";
import type {
	TerminationExpenseItem,
	TerminationRefundCalculation,
} from "./stagePaymentEngine.js";
import { TerminationStatutoryGrid } from "./terminationTab/TerminationStatutoryGrid.js";
import { TerminationExpensesTable } from "./terminationTab/TerminationExpensesTable.js";

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
			<TerminationStatutoryGrid terminationCalc={terminationCalc} />

			<TerminationExpensesTable
				itemizedExpenses={terminationCalc.itemizedExpenses}
				newExpenseTitle={newExpenseTitle}
				onNewExpenseTitleChange={onNewExpenseTitleChange}
				newExpenseRub={newExpenseRub}
				onNewExpenseRubChange={onNewExpenseRubChange}
				newExpenseCategory={newExpenseCategory}
				onNewExpenseCategoryChange={onNewExpenseCategoryChange}
				onAddCustomExpense={onAddCustomExpense}
			/>

			{/* Legal Rationale Box */}
			<div className="rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] p-4 text-xs text-[var(--muted)] leading-relaxed">
				<strong className="text-[var(--ink)] block mb-1">
					Правовое заключение для соглашения о расторжении:
				</strong>
				{terminationCalc.legalRationaleRu}
			</div>
		</div>
	);
};

export default StagePaymentTerminationTab;
