import React from "react";
import { MOBILE_INVENTORY_CATEGORIES, type MobileInventoryCategoryType } from "./types.js";

export interface MobileInventoryCategoryChipsProps {
	readonly selectedCategory: MobileInventoryCategoryType;
	readonly categoryCounts: Record<MobileInventoryCategoryType, number>;
	readonly onSelectCategory: (cat: MobileInventoryCategoryType) => void;
	readonly triggerHaptic: () => void;
}

export const MobileInventoryCategoryChips: React.FC<MobileInventoryCategoryChipsProps> = ({
	selectedCategory,
	categoryCounts,
	onSelectCategory,
	triggerHaptic,
}) => {
	return (
		<div
			className="mobile-inventory-chips-scroller"
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
						className={`mobile-inventory-chip ${isActive ? "active" : ""}`}
						onClick={() => {
							triggerHaptic();
							onSelectCategory(cat.id);
						}}
						role="tab"
						aria-selected={isActive}
						data-testid={`mobile-chip-${cat.id}`}
					>
						<Icon size={14} aria-hidden="true" />
						<span>{cat.label}</span>
						<span className="mobile-inventory-chip-count">{count}</span>
					</button>
				);
			})}
		</div>
	);
};
