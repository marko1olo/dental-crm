import React from "react";

export interface PlanBeforeAfterCategoriesProps {
	readonly categories: readonly string[];
	readonly activeCategory: string;
	readonly onSelectCategory: (cat: string) => void;
}

export const PlanBeforeAfterCategories: React.FC<PlanBeforeAfterCategoriesProps> = ({
	categories,
	activeCategory,
	onSelectCategory,
}) => {
	return (
		<div style={{ display: "flex", gap: "6px", flexWrap: "wrap", paddingBottom: "4px" }}>
			{categories.map((cat) => {
				const isActive = activeCategory === cat;
				const label = cat === "all" ? "Все кейсы" : cat;
				return (
					<button
						key={cat}
						type="button"
						data-testid={`before-after-filter-${cat}`}
						onClick={() => onSelectCategory(cat)}
						style={{
							minHeight: "44px",
							padding: "8px 14px",
							borderRadius: "20px",
							border: `1px solid ${isActive ? "var(--pc-primary, #0d9488)" : "var(--pc-border, #334155)"}`,
							backgroundColor: isActive ? "rgba(13, 148, 136, 0.2)" : "var(--pc-surface, var(--paper-strong, #ffffff))",
							color: isActive ? "var(--pc-primary, #0d9488)" : "var(--pc-text-muted, #94a3b8)",
							fontSize: "12px",
							fontWeight: isActive ? 700 : 500,
							cursor: "pointer",
							touchAction: "manipulation",
						}}
					>
						{label}
					</button>
				);
			})}
		</div>
	);
};
