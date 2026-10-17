/**
 * apps/web/src/components/visit/billing/VisitBillingEmptyState.tsx
 * Empty state placeholder when no billing items are attached to visit.
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React from "react";
import { Plus } from "lucide-react";

export interface VisitBillingEmptyStateProps {
	readOnly?: boolean | undefined;
	onAddService: () => void;
}

export const VisitBillingEmptyState: React.FC<VisitBillingEmptyStateProps> = ({
	readOnly = false,
	onAddService,
}) => {
	return (
		<div
			className="p-8 text-center border-2 border-dashed border-[var(--line,#e2e8f0)] rounded-xl text-xs text-[var(--muted,#64748b)] space-y-2.5"
			data-testid="billing-empty-state"
		>
			<p className="m-0 font-medium text-[var(--ink,#0f172a)] text-xs">
				Услуги приёма ещё не добавлены. Примените клинический протокол или выберите услугу из прейскуранта.
			</p>
			{!readOnly && (
				<button
					type="button"
					onClick={onAddService}
					className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-bold hover:bg-teal-100 transition-colors cursor-pointer text-xs"
					data-testid="btn-empty-add-service"
				>
					<Plus size={14} />
					<span>+ Выбрать услугу из прейскуранта</span>
				</button>
			)}
		</div>
	);
};
