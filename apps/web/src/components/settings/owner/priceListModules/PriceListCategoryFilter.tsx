/**
 * PriceListCategoryFilter.tsx
 *
 * Тулбар поиска и сегментации прейскуранта:
 * - Канонический поисковый инпут dente-search-wrap (отступ 38px, иконка лупы, кнопка очистки).
 * - Segmented Control маржинальности (Все, Маржа >= 70%, Маржа < 50%).
 * - Фильтр-пилюли категорий 804н (dente-filter-chip) без горизонтального клиппинга.
 */

import React from "react";
import { Search, X } from "lucide-react";
import {
	PRICELIST_CATEGORIES,
	type CategoryOption,
} from "./priceListTypes";

export interface PriceListCategoryFilterProps {
	readonly searchQuery: string;
	readonly onSearchChange: (q: string) => void;
	readonly marginFilter: "all" | "high" | "low";
	readonly onMarginFilterChange: (f: "all" | "high" | "low") => void;
	readonly selectedCategory: string;
	readonly onCategoryChange: (cat: string) => void;
}

export const PriceListCategoryFilter: React.FC<PriceListCategoryFilterProps> = ({
	searchQuery,
	onSearchChange,
	marginFilter,
	onMarginFilterChange,
	selectedCategory,
	onCategoryChange,
}) => {
	return (
		<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] mb-3 space-y-2">
			<div className="flex flex-col sm:flex-row gap-2 items-center">
				<div className="dente-search-wrap relative flex-1">
					<Search size={14} className="dente-search-icon" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder="Поиск по коду услуги (A16.07.002) или названию услуги..."
						className="dente-search-input"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => onSearchChange("")}
							className="dente-search-clear"
							title="Очистить поиск"
							aria-label="Очистить поиск"
						>
							<X size={13} />
						</button>
					)}
				</div>
				<div className="dente-segmented-bar shrink-0">
					<button
						type="button"
						onClick={() => onMarginFilterChange("all")}
						className={`dente-segmented-item ${marginFilter === "all" ? "active" : ""}`}
						data-active={marginFilter === "all" ? "true" : undefined}
					>
						Все
					</button>
					<button
						type="button"
						onClick={() => onMarginFilterChange("high")}
						className={`dente-segmented-item ${marginFilter === "high" ? "active" : ""}`}
						data-active={marginFilter === "high" ? "true" : undefined}
					>
						Маржа &gt;= 70%
					</button>
					<button
						type="button"
						onClick={() => onMarginFilterChange("low")}
						className={`dente-segmented-item ${marginFilter === "low" ? "active" : ""}`}
						data-active={marginFilter === "low" ? "true" : undefined}
					>
						Маржа &lt; 50%
					</button>
				</div>
			</div>

			{/* Категории номенклатуры 804н */}
			<div className="flex items-center gap-1.5 flex-wrap">
				{PRICELIST_CATEGORIES.map((cat: CategoryOption) => {
					const isSelected = selectedCategory === cat.key;
					return (
						<button
							key={cat.key}
							type="button"
							onClick={() => onCategoryChange(cat.key)}
							className={`dente-filter-chip shrink-0 whitespace-nowrap ${isSelected ? "active" : ""}`}
							data-active={isSelected ? "true" : undefined}
						>
							{cat.label}
						</button>
					);
				})}
			</div>
		</div>
	);
};
