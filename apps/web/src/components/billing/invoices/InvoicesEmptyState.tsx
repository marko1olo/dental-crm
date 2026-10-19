/**
 * apps/web/src/components/billing/invoices/InvoicesEmptyState.tsx
 *
 * Clean empty state when no invoices match the current filter or search.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { Receipt } from "lucide-react";

interface InvoicesEmptyStateProps {
	readonly searchQuery: string;
	readonly onResetFilters: () => void;
}

export const InvoicesEmptyState: React.FC<InvoicesEmptyStateProps> = ({
	searchQuery,
	onResetFilters,
}) => {
	return (
		<div className="flex-1 flex flex-col items-center justify-center p-8 text-center" data-testid="invoices-empty-state">
			<div className="w-12 h-12 rounded-2xl bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] mb-3 shadow-2xs">
				<Receipt size={24} />
			</div>
			<div className="text-sm font-bold text-[var(--ink,#0f172a)] mb-1">
				Счета не найдены
			</div>
			<div className="text-xs text-[var(--muted,#64748b)] max-w-sm mb-4">
				{searchQuery
					? `По запросу «${searchQuery}» ничего не найдено. Проверьте правильность написания или сбросьте поиск.`
					: "В выбранной категории пока нет выставленных счетов."}
			</div>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onResetFilters}
					className="secondary-button h-8 px-3 rounded-lg text-xs font-semibold"
					data-testid="btn-reset-invoices-filters"
				>
					Сбросить фильтры
				</button>
				<button
					type="button"
					onClick={onResetFilters}
					className="primary-button h-8 px-3 rounded-lg text-xs font-bold text-white"
					data-testid="btn-create-first-invoice"
				>
					Создать первый счет
				</button>
			</div>
		</div>
	);
};
