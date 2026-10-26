import React from "react";
import { Check, Search, X } from "lucide-react";
import type { CatalogServiceLookupItem } from "../treatmentPlanPricingEngine";

export interface AddServiceCatalogListProps {
	readonly searchQuery: string;
	readonly onSearchChange: (q: string) => void;
	readonly categoryFilter: string;
	readonly onCategoryChange: (cat: string) => void;
	readonly availableCategories: readonly string[];
	readonly totalCatalogCount: number;
	readonly filteredServices: readonly CatalogServiceLookupItem[];
	readonly selectedCatalogItem: CatalogServiceLookupItem | null;
	readonly onSelectService: (item: CatalogServiceLookupItem) => void;
}

export const AddServiceCatalogList: React.FC<AddServiceCatalogListProps> = ({
	searchQuery, onSearchChange, categoryFilter, onCategoryChange,
	availableCategories, totalCatalogCount, filteredServices,
	selectedCatalogItem, onSelectService,
}) => {
	return (
		<div className="space-y-2">
			<div className="dente-search-wrap w-full">
				<Search size={14} className="dente-search-icon" />
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder="Поиск по названию или коду (кариес, коронка, имплант, A16.07...)"
					className="dente-search-input"
					data-testid="catalog-service-search-input"
				/>
				{searchQuery && (
					<button
						type="button"
						onClick={() => onSearchChange("")}
						className="dente-search-clear"
						aria-label="Очистить поиск"
					>
						<X size={14} />
					</button>
				)}
			</div>

			{availableCategories.length > 0 && (
				<div className="dente-filter-chips overflow-x-auto pb-1 max-w-full">
					<button
						type="button"
						onClick={() => onCategoryChange("all")}
						className={`dente-filter-chip ${categoryFilter === "all" ? "active" : ""}`}
						data-active={categoryFilter === "all"}
					>
						Все ({totalCatalogCount})
					</button>
					{availableCategories.map((cat) => (
						<button
							key={cat}
							type="button"
							onClick={() => onCategoryChange(cat)}
							className={`dente-filter-chip ${categoryFilter === cat ? "active" : ""}`}
							data-active={categoryFilter === cat}
						>
							{cat}
						</button>
					))}
				</div>
			)}

			<div
				className={`border border-[var(--line)] rounded-2xl overflow-hidden overflow-y-auto divide-y divide-[var(--line)] bg-[var(--paper-soft)] transition-all ${
					selectedCatalogItem ? "max-h-36 sm:max-h-44" : "max-h-64 sm:max-h-72"
				}`}
			>
				{filteredServices.length === 0 ? (
					<div className="p-4 text-center text-xs text-[var(--muted)]">
						Услуги не найдены. Попробуйте изменить поисковый запрос.
					</div>
				) : (
					filteredServices.map((item) => {
						const isSelected = selectedCatalogItem?.id === item.id;
						return (
							<div
								key={item.id}
								onClick={() => onSelectService(item)}
								data-testid={`catalog-item-${item.id}`}
								className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors min-h-[48px] ${
									isSelected
										? "bg-[var(--teal-soft)] border-l-4 border-l-[var(--teal)]"
										: "hover:bg-[var(--paper)]"
								}`}
							>
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-1.5 flex-wrap">
										<span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--line)] text-[var(--teal-dark)] dark:text-teal-300 shrink-0">
											{item.serviceCode || item.code || item.order804nCode || item.id}
										</span>
										<span className="text-[10px] text-[var(--muted)] shrink-0">{item.category}</span>
									</div>
									<div className="font-semibold text-xs text-[var(--ink)] break-words leading-snug mt-1">
										{item.title}
									</div>
								</div>
								<div className="text-right shrink-0 flex items-center gap-2">
									<span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
										{(item.basePriceRub || 0).toLocaleString("ru-RU")} ₽
									</span>
									{isSelected && <Check size={16} className="text-[var(--teal)]" />}
								</div>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
};
