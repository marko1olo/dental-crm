import React from "react";
import type { DocumentCatalogCategory } from "./types";

export interface CatalogCategoryTabsProps {
	activeCategory: DocumentCatalogCategory;
	setActiveCategory: (cat: DocumentCatalogCategory) => void;
	categoryCounts: Record<string, number>;
	existingDocsCount: number;
	onSelectRegistryTab?: (() => void) | undefined;
}

export function CatalogCategoryTabs({
	activeCategory,
	setActiveCategory,
	categoryCounts,
	existingDocsCount,
	onSelectRegistryTab,
}: CatalogCategoryTabsProps): React.JSX.Element {
	const tabs = [
		{
			id: "all" as const,
			label: "Все",
			testId: "filter-cat-all",
			count: categoryCounts.all,
		},
		{
			id: "intake" as const,
			label: "Первичный приём",
			testId: "filter-cat-intake",
		},
		{
			id: "clinical" as const,
			label: "Лечение",
			testId: "filter-cat-clinical",
		},
		{
			id: "finance_tax" as const,
			label: "Финансы и ФНС",
			testId: "filter-cat-finance",
		},
		{ id: "refusal" as const, label: "Отказы", testId: "filter-cat-refusal" },
		{
			id: "pediatric" as const,
			label: "Детские",
			testId: "filter-cat-pediatric",
		},
		{
			id: "registry" as const,
			label: "Реестр",
			testId: "filter-cat-registry",
			count: existingDocsCount,
		},
	];

	return (
		<div
			className="dente-segmented-bar inline-flex p-0.5 rounded-xl bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#cbd5e1)] gap-0.5 overflow-x-auto max-w-full min-h-[32px] items-center shrink-0 select-none"
			role="tablist"
			aria-label="Категории документов"
		>
			{tabs.map((tab) => {
				const isActive = activeCategory === tab.id;
				return (
					<button
						key={tab.id}
						type="button"
						role="tab"
						aria-selected={isActive}
						onClick={() => {
							setActiveCategory(tab.id);
							if (tab.id === "registry") onSelectRegistryTab?.();
						}}
						className={`dente-segmented-item h-7 px-2 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 border ${
							isActive
								? "active bg-[var(--paper,#ffffff)] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]/40 shadow-2xs font-bold"
								: "bg-transparent border-transparent text-[var(--ink,#334155)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)]/70 font-semibold"
						}`}
						data-testid={tab.testId}
					>
						<span>{tab.label}</span>
						{tab.count !== undefined && (
							<span
								className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
									isActive
										? "bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)]"
										: "bg-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)]"
								}`}
							>
								{tab.count}
							</span>
						)}
					</button>
				);
			})}
		</div>
	);
}
