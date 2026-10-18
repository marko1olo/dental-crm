/**
 * apps/web/src/components/billing/retail/RetailToolbar.tsx
 *
 * Search input and category filter chips bar for RetailProductsModal.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { Search, X, Barcode } from "lucide-react";
import type { RetailProductCategory } from "@dental/shared";
import { CATEGORY_OPTIONS } from "./retailTypes.js";

interface RetailToolbarProps {
	readonly searchQuery: string;
	readonly setSearchQuery: (q: string) => void;
	readonly selectedCategory: RetailProductCategory | "all";
	readonly setSelectedCategory: (c: RetailProductCategory | "all") => void;
}

export const RetailToolbar: React.FC<RetailToolbarProps> = ({
	searchQuery,
	setSearchQuery,
	selectedCategory,
	setSelectedCategory,
}) => {
	return (
		<div className="px-4 sm:px-6 py-2 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line)] flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
			<div className="dente-search-wrap retail-search-wrap shrink-0 relative">
				<Search size={14} className="dente-search-icon" />
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder="Поиск по товарам..."
					className="dente-search-input"
					data-testid="input-retail-search"
					autoFocus
				/>
				{searchQuery ? (
					<button
						type="button"
						onClick={() => setSearchQuery("")}
						className="dente-search-clear"
						aria-label="Очистить поиск"
					>
						<X size={13} />
					</button>
				) : (
					<span className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[var(--muted,#64748b)] items-center gap-0.5 pointer-events-none">
						<Barcode size={12} /> EAN-13
					</span>
				)}
			</div>

			<div className="dente-filter-chips flex-1 min-w-0 overflow-x-auto scrollbar-none py-0.5 flex items-center gap-1.5 flex-nowrap">
				{CATEGORY_OPTIONS.map((cat) => {
					const isActive = selectedCategory === cat.id;
					return (
						<button
							key={cat.id}
							type="button"
							onClick={() => setSelectedCategory(cat.id)}
							className={`dente-filter-chip ${isActive ? "active" : ""}`}
							data-active={isActive}
							data-testid={`filter-cat-${cat.id}`}
						>
							{cat.label}
						</button>
					);
				})}
			</div>
		</div>
	);
};
