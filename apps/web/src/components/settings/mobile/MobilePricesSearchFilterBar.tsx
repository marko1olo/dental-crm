import React from "react";
import { Search, X } from "lucide-react";
import { CATEGORY_TABS } from "../pricelistEditorHelpers";

interface MobilePricesSearchFilterBarProps {
	searchQuery: string;
	setSearchQuery: (val: string) => void;
	selectedCategory: string;
	setSelectedCategory: (val: string) => void;
	rawCatalogCount: number;
	rawCatalog: Array<{ category?: string }>;
}

export const MobilePricesSearchFilterBar: React.FC<MobilePricesSearchFilterBarProps> = ({
	searchQuery,
	setSearchQuery,
	selectedCategory,
	setSelectedCategory,
	rawCatalogCount,
	rawCatalog,
}) => {
	return (
		<>
			<div className="px-4 pt-3 pb-2">
				<div className="dente-search-wrap relative flex items-center w-full">
					<Search
						size={15}
						className="dente-search-icon absolute left-3.5 text-[var(--muted)] pointer-events-none"
					/>
					<input
						type="search"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Поиск по услугам или коду..."
						className="dente-search-input w-full h-10 min-h-[40px] pl-10 pr-9 text-[14px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--teal)] transition-all mobile-settings-search-input"
						style={{ paddingLeft: "38px" }}
						data-testid="input-mobile-price-search"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => setSearchQuery("")}
							className="dente-search-clear absolute right-2.5 w-6 h-6 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] active:scale-95 transition-transform cursor-pointer"
							aria-label="Очистить поиск"
						>
							<X size={14} />
						</button>
					)}
				</div>
			</div>

			<div className="dente-filter-chips flex items-center gap-1.5 overflow-x-auto px-4 py-1.5 scrollbar-none overscroll-contain">
				<button
					type="button"
					onClick={() => setSelectedCategory("all")}
					className={`dente-filter-chip mobile-filter-chip ${selectedCategory === "all" ? "active" : ""}`}
					data-active={selectedCategory === "all" ? "true" : undefined}
				>
					<span>Все</span>
					<span className="chip-counter">{rawCatalogCount}</span>
				</button>

				{CATEGORY_TABS.filter((cat) => cat.id !== "all").map((cat) => {
					const countInCat = rawCatalog.filter(
						(s) => (s.category || "other") === cat.id,
					).length;
					return (
						<button
							key={cat.id}
							type="button"
							onClick={() => setSelectedCategory(cat.id)}
							className={`dente-filter-chip mobile-filter-chip ${selectedCategory === cat.id ? "active" : ""}`}
							data-active={selectedCategory === cat.id ? "true" : undefined}
						>
							<span>{cat.label}</span>
							{countInCat > 0 && <span className="chip-counter">{countInCat}</span>}
						</button>
					);
				})}
			</div>
		</>
	);
};
