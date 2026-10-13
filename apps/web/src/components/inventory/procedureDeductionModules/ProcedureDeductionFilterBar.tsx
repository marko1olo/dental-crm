/**
 * ProcedureDeductionFilterBar.tsx — Поисковая строка и фильтр категорий материалов.
 */

import { Search, X } from "lucide-react";
import React from "react";
import {
	TECH_MAP_CATEGORY_LABELS,
	type TechMapCategory,
} from "../inventoryMath.js";
import type { DeductionLineItem } from "./procedureDeductionTypes.js";

export interface ProcedureDeductionFilterBarProps {
	readonly searchQuery: string;
	readonly onSearchChange: (query: string) => void;
	readonly activeCategory: TechMapCategory | "all";
	readonly onCategoryChange: (cat: TechMapCategory | "all") => void;
	readonly lines: readonly DeductionLineItem[];
}

export const ProcedureDeductionFilterBar: React.FC<
	ProcedureDeductionFilterBarProps
> = ({
	searchQuery,
	onSearchChange,
	activeCategory,
	onCategoryChange,
	lines,
}) => {
	return (
		<div className="inventory-filter-toolbar">
			<div className="inventory-search-wrap">
				<Search size={16} className="inventory-search-icon" />
				<input
					type="text"
					className="inventory-search-input"
					placeholder="Поиск материала..."
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
				/>
				{searchQuery && (
					<button
						type="button"
						className="inventory-search-clear"
						onClick={() => onSearchChange("")}
						aria-label="Очистить поиск"
					>
						<X size={14} />
					</button>
				)}
			</div>

			<div className="inventory-category-tabs">
				<button
					type="button"
					className={`inventory-category-tab ${activeCategory === "all" ? "active" : ""}`}
					onClick={() => onCategoryChange("all")}
				>
					Все ({lines.length})
				</button>
				{(Object.keys(TECH_MAP_CATEGORY_LABELS) as TechMapCategory[]).map((cat) => {
					const count = lines.filter((l) => l.category === cat).length;
					if (count === 0) return null;
					return (
						<button
							key={cat}
							type="button"
							className={`inventory-category-tab ${activeCategory === cat ? "active" : ""}`}
							onClick={() => onCategoryChange(cat)}
						>
							{TECH_MAP_CATEGORY_LABELS[cat]} ({count})
						</button>
					);
				})}
			</div>
		</div>
	);
};
