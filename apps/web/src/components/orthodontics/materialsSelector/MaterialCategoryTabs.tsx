import React from "react";

export type OrthoCategoryFilter = "all" | "brackets" | "wires" | "aligners" | "miniscrews";

export const CATEGORY_TABS: readonly { readonly id: OrthoCategoryFilter; readonly label: string }[] = [
	{ id: "all", label: "Все (90% рынка)" },
	{ id: "brackets", label: "Брекеты" },
	{ id: "wires", label: "Дуги" },
	{ id: "aligners", label: "Элайнеры" },
	{ id: "miniscrews", label: "Микровинты" },
];

export interface MaterialCategoryTabsProps {
	readonly activeCategory: OrthoCategoryFilter;
	readonly setActiveCategory: (c: OrthoCategoryFilter) => void;
}

export const MaterialCategoryTabs: React.FC<MaterialCategoryTabsProps> = ({
	activeCategory,
	setActiveCategory,
}) => {
	return (
		<div className="dente-segmented-bar flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto shrink-0 shadow-2xs">
			{CATEGORY_TABS.map((tab) => {
				const isActive = activeCategory === tab.id;
				return (
					<button
						key={tab.id}
						type="button"
						onClick={() => setActiveCategory(tab.id)}
						className={`dente-segmented-item ${isActive ? "active" : ""}`}
					>
						{tab.label}
					</button>
				);
			})}
		</div>
	);
};
