import { Search, X } from "lucide-react";
import type React from "react";
import type { BatchFilter } from "./batchTrackingTypes.js";

export interface BatchTrackingFilterBarProps {
	readonly searchQuery: string;
	readonly onSearchChange: (q: string) => void;
	readonly activeFilter: BatchFilter;
	readonly onFilterChange: (f: BatchFilter) => void;
	readonly stats: {
		total: number;
		expired: number;
		warning: number;
		good: number;
	};
	readonly hasTargetItem: boolean;
	readonly onResetTargetItem: () => void;
}

export const BatchTrackingFilterBar: React.FC<BatchTrackingFilterBarProps> = ({
	searchQuery,
	onSearchChange,
	activeFilter,
	onFilterChange,
	stats,
	hasTargetItem,
	onResetTargetItem,
}) => (
	<div className="p-3 border-b border-[var(--line)] bg-[var(--paper)] flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
		<div className="dente-search-wrap relative flex-1 min-w-[200px] max-w-xs">
			<Search size={14} className="dente-search-icon" />
			<input
				type="text"
				className="dente-search-input"
				placeholder="Поиск по партии, серии или названию..."
				value={searchQuery}
				onChange={(e) => onSearchChange(e.target.value)}
				data-testid="batch-search-input"
			/>
			{searchQuery && (
				<button
					type="button"
					className="dente-search-clear"
					onClick={() => onSearchChange("")}
					aria-label="Очистить поиск"
				>
					<X size={12} />
				</button>
			)}
		</div>
		<div className="dente-segmented-bar inline-flex items-center gap-1 p-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
			<button
				type="button"
				onClick={() => onFilterChange("all")}
				className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
					activeFilter === "all"
						? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
						: "text-[var(--muted)] hover:text-[var(--ink)]"
				}`}
				data-testid="batch-filter-all"
			>
				Все ({stats.total})
			</button>
			<button
				type="button"
				onClick={() => onFilterChange("warning_soon")}
				className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
					activeFilter === "warning_soon"
						? "bg-amber-500/20 text-amber-900 dark:text-amber-200 shadow-xs"
						: "text-[var(--muted)] hover:text-amber-700"
				}`}
				data-testid="batch-filter-warning"
			>
				Скоро истекает ({stats.warning})
			</button>
			<button
				type="button"
				onClick={() => onFilterChange("expired")}
				className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
					activeFilter === "expired"
						? "bg-rose-500/20 text-rose-900 dark:text-rose-200 shadow-xs"
						: "text-[var(--muted)] hover:text-rose-700"
				}`}
				data-testid="batch-filter-expired"
			>
				Просрочено ({stats.expired})
			</button>
		</div>
		{hasTargetItem && (
			<button
				type="button"
				onClick={onResetTargetItem}
				className="h-8 px-2.5 rounded-lg border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors text-xs flex items-center gap-1 cursor-pointer"
				title="Показать партии всех материалов"
				data-testid="batch-reset-item-filter"
			>
				<X size={13} />
				<span>Все материалы</span>
			</button>
		)}
	</div>
);
