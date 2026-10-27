import { Plus, Search, X } from "lucide-react";
import React from "react";
import type { TreatmentPlanItem } from "@dental/shared";
import type { TreatmentPlanStatusFilter } from "./treatmentPlansListTypes";

export interface TreatmentPlansToolbarProps {
	readonly items: readonly TreatmentPlanItem[];
	readonly statusFilter: TreatmentPlanStatusFilter;
	readonly onStatusFilterChange: (status: TreatmentPlanStatusFilter) => void;
	readonly searchQuery: string;
	readonly onSearchQueryChange: (query: string) => void;
	readonly onNewPlanItem?: (() => void) | undefined;
}

export const TreatmentPlansToolbar: React.FC<TreatmentPlansToolbarProps> = React.memo(({
	items,
	statusFilter,
	onStatusFilterChange,
	searchQuery,
	onSearchQueryChange,
	onNewPlanItem,
}) => {
	return (
		<div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-xs">
			<div className="dente-segmented-bar overflow-x-auto max-w-full" role="tablist" data-testid="plans-status-filters">
				<button
					type="button"
					role="tab"
					aria-selected={statusFilter === "all"}
					data-active={statusFilter === "all"}
					onClick={() => onStatusFilterChange("all")}
					className={`dente-segmented-item ${statusFilter === "all" ? "active" : ""}`}
					data-testid="filter-plans-all"
				>
					Все ({items.length})
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={statusFilter === "proposed"}
					data-active={statusFilter === "proposed"}
					onClick={() => onStatusFilterChange("proposed")}
					className={`dente-segmented-item ${statusFilter === "proposed" ? "active" : ""}`}
					data-testid="filter-plans-proposed"
				>
					Черновик ({items.filter((i) => i.status === "proposed" || (i as any).status === "draft").length})
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={statusFilter === "approved"}
					data-active={statusFilter === "approved"}
					onClick={() => onStatusFilterChange("approved")}
					className={`dente-segmented-item ${statusFilter === "approved" ? "active" : ""}`}
					data-testid="filter-plans-approved"
				>
					На согласовании ({items.filter((i) => i.status === "approved" || (i as any).status === "agreed").length})
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={statusFilter === "in_progress"}
					data-active={statusFilter === "in_progress"}
					onClick={() => onStatusFilterChange("in_progress")}
					className={`dente-segmented-item ${statusFilter === "in_progress" ? "active" : ""}`}
					data-testid="filter-plans-in-progress"
				>
					В работе ({items.filter((i) => i.status === "in_progress").length})
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={statusFilter === "completed"}
					data-active={statusFilter === "completed"}
					onClick={() => onStatusFilterChange("completed")}
					className={`dente-segmented-item ${statusFilter === "completed" ? "active" : ""}`}
					data-testid="filter-plans-completed"
				>
					Завершен ({items.filter((i) => i.status === "completed").length})
				</button>
			</div>

			<div className="flex items-center gap-2 flex-1 max-w-sm min-w-[200px] justify-end">
				<div className="dente-search-wrap max-w-xs">
					<Search className="dente-search-icon" aria-hidden="true" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => onSearchQueryChange(e.target.value)}
						placeholder="Поиск по услуге или зубу..."
						className="dente-search-input text-xs"
						data-testid="plans-search-input"
					/>
					{searchQuery && (
						<button type="button" onClick={() => onSearchQueryChange("")} className="dente-search-clear" title="Очистить">
							<X size={13} />
						</button>
					)}
				</div>
				{onNewPlanItem && (
					<button
						type="button"
						onClick={onNewPlanItem}
						className="primary-button h-8 min-h-[32px] px-3 text-xs font-semibold rounded-lg inline-flex items-center gap-1 shrink-0"
						data-testid="btn-add-plan-position"
					>
						<Plus size={14} />
						<span>Добавить</span>
					</button>
				)}
			</div>
		</div>
	);
});

TreatmentPlansToolbar.displayName = "TreatmentPlansToolbar";
