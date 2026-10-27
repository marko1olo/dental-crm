/**
 * DENTE CRM — Clinical Help Search & Category Filter Bar
 * Authority: Mandate 8b (<= 120 lines), Apple HIG (Touch targets >= 44px on mobile)
 */

import React from "react";
import { Search, X } from "lucide-react";
import { GUIDE_CATEGORIES } from "./helpCategoriesData";
import type { ClinicalGuideCategory } from "./helpTypes";

export interface ClinicalHelpSearchFilterProps {
	readonly searchQuery: string;
	readonly onSearchChange: (query: string) => void;
	readonly selectedCategory: ClinicalGuideCategory | "all";
	readonly onCategoryChange: (category: ClinicalGuideCategory | "all") => void;
	readonly totalCount: number;
}

export const ClinicalHelpSearchFilter: React.FC<ClinicalHelpSearchFilterProps> = React.memo(({
	searchQuery,
	onSearchChange,
	selectedCategory,
	onCategoryChange,
	totalCount,
}) => {
	return (
		<div className="space-y-3 shrink-0">
			{/* Search Input Bar with Icon */}
			<div className="relative">
				<Search
					size={16}
					className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
				/>
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder="Поиск по темам, горячим клавишам и процедурам..."
					className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl text-[var(--ink)] placeholder-[var(--muted)] focus:outline-hidden focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 min-h-[44px] sm:min-h-[38px] transition-all"
				/>
				{searchQuery && (
					<button
						type="button"
						onClick={() => onSearchChange("")}
						className="absolute right-2 top-1/2 -translate-y-1/2 p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
						aria-label="Очистить поиск"
					>
						<X size={14} />
					</button>
				)}
			</div>

			{/* Category Filter Chips / Segmented Scroller */}
			<div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar overscroll-contain">
				<button
					type="button"
					onClick={() => onCategoryChange("all")}
					className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 min-h-[44px] sm:min-h-[32px] flex items-center justify-center ${
						selectedCategory === "all"
							? "bg-teal-500 text-white font-semibold shadow-2xs"
							: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
					}`}
				>
					{`Все разделы (${totalCount})`}
				</button>
				{GUIDE_CATEGORIES.map((cat) => {
					const isActive = selectedCategory === cat.id;
					return (
						<button
							key={cat.id}
							type="button"
							onClick={() => onCategoryChange(cat.id)}
							className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 min-h-[44px] sm:min-h-[32px] flex items-center justify-center ${
								isActive
									? "bg-teal-500 text-white font-semibold shadow-2xs"
									: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
							}`}
						>
							{cat.label}
						</button>
					);
				})}
			</div>
		</div>
	);
});

ClinicalHelpSearchFilter.displayName = "ClinicalHelpSearchFilter";
