import React from "react";
import { MOBILE_INVENTORY_CATEGORIES, type MobileInventoryCategoryType } from "./types.js";

export interface MobileInventoryCategoryChipsProps {
	readonly selectedCategory: MobileInventoryCategoryType;
	readonly categoryCounts: Record<MobileInventoryCategoryType, number>;
	readonly onSelectCategory: (cat: MobileInventoryCategoryType) => void;
	readonly triggerHaptic: () => void;
}

/**
 * Горизонтальная полоса чипов категорий склада (Apple HIG, Mandate 8b: <= 120 строк).
 * flex-nowrap, overflow-x-auto, scrollbar-width: none, flex-shrink-0 — слова НИКОГДА не режутся многоточием.
 */
export const MobileInventoryCategoryChips: React.FC<MobileInventoryCategoryChipsProps> = ({
	selectedCategory,
	categoryCounts,
	onSelectCategory,
	triggerHaptic,
}) => {
	return (
		<div
			className="mobile-inventory-chips-scroller flex flex-nowrap overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shrink-0 w-full"
			role="tablist"
			aria-label="Фильтр категорий материалов"
			data-testid="mobile-inventory-category-chips"
		>
			{MOBILE_INVENTORY_CATEGORIES.map((cat) => {
				const Icon = cat.icon;
				const isActive = selectedCategory === cat.id;
				const count = categoryCounts[cat.id] || 0;
				return (
					<button
						key={cat.id}
						type="button"
						className={`mobile-inventory-chip shrink-0 whitespace-nowrap select-none cursor-pointer ${isActive ? "active" : ""}`}
						onClick={() => {
							triggerHaptic();
							onSelectCategory(cat.id);
						}}
						role="tab"
						aria-selected={isActive}
						data-testid={`mobile-chip-${cat.id}`}
					>
						<Icon size={14} aria-hidden="true" className="shrink-0" />
						<span className="whitespace-nowrap shrink-0">{cat.label}</span>
						<span className="mobile-inventory-chip-count shrink-0">{count}</span>
					</button>
				);
			})}
		</div>
	);
};
