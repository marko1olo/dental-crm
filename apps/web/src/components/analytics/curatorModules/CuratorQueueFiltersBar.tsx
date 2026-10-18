import React from "react";
import { AlertTriangle, Search } from "lucide-react";

export interface CuratorQueueFiltersBarProps {
	readonly searchQuery: string;
	readonly onSearchChange: (q: string) => void;
	readonly selectedPriceRange: "all" | "low" | "medium" | "high";
	readonly onSelectPriceRange: (r: "all" | "low" | "medium" | "high") => void;
	readonly onlyAttentionFlags: boolean;
	readonly onToggleAttentionFlags: () => void;
	readonly sortBy: "priority" | "sum_desc" | "days_in_stage_desc" | "assigned_at_desc";
	readonly onSortChange: (s: "priority" | "sum_desc" | "days_in_stage_desc" | "assigned_at_desc") => void;
}

export const CuratorQueueFiltersBar: React.FC<CuratorQueueFiltersBarProps> = ({
	searchQuery,
	onSearchChange,
	selectedPriceRange,
	onSelectPriceRange,
	onlyAttentionFlags,
	onToggleAttentionFlags,
	sortBy,
	onSortChange,
}) => {
	return (
		<div className="curator-queue-toolbar">
			<div className="curator-search-input-wrapper">
				<Search className="w-4 h-4 curator-search-icon" />
				<input
					type="text"
					placeholder="Поиск по ФИО, телефону или плану..."
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
					className="curator-search-input"
				/>
			</div>

			<div className="curator-filter-pills">
				<button
					type="button"
					onClick={() => onSelectPriceRange("all")}
					className={`curator-pill-btn ${selectedPriceRange === "all" ? "active" : ""}`}
				>
					Все чеки
				</button>
				<button
					type="button"
					onClick={() => onSelectPriceRange("low")}
					className={`curator-pill-btn ${selectedPriceRange === "low" ? "active" : ""}`}
				>
					До 50к
				</button>
				<button
					type="button"
					onClick={() => onSelectPriceRange("medium")}
					className={`curator-pill-btn ${selectedPriceRange === "medium" ? "active" : ""}`}
				>
					50k–150k
				</button>
				<button
					type="button"
					onClick={() => onSelectPriceRange("high")}
					className={`curator-pill-btn ${selectedPriceRange === "high" ? "active" : ""}`}
				>
					VIP &gt; 150k
				</button>
			</div>

			<button
				type="button"
				onClick={onToggleAttentionFlags}
				className={`curator-toggle-filter-btn ${onlyAttentionFlags ? "active" : ""}`}
			>
				<AlertTriangle className="w-3.5 h-3.5" />
				<span>Только требующие внимания</span>
			</button>

			<select
				value={sortBy}
				onChange={(e) => onSortChange(e.target.value as any)}
				className="curator-select-input"
				style={{ minHeight: "34px", padding: "4px 10px", fontSize: "12px" }}
			>
				<option value="priority">По срочности</option>
				<option value="sum_desc">По сумме сметы</option>
				<option value="days_in_stage_desc">По дням без движения</option>
				<option value="assigned_at_desc">Сначала новые</option>
			</select>
		</div>
	);
};
