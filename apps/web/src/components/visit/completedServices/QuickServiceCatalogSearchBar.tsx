import { Plus, Search, X } from "lucide-react";
import React from "react";
import { money } from "../../../AppHelpers";
import type { FilteredCatalogService } from "../completedServicesPlan";

export interface QuickServiceCatalogSearchBarProps {
	readonly catalogSearch: string;
	readonly onCatalogSearchChange: (val: string) => void;
	readonly filteredCatalog: FilteredCatalogService[];
	readonly onAddCatalogService: (item: FilteredCatalogService) => void;
	readonly selectedTooth: string | null;
}

export const QuickServiceCatalogSearchBar: React.FC<
	QuickServiceCatalogSearchBarProps
> = ({
	catalogSearch,
	onCatalogSearchChange,
	filteredCatalog,
	onAddCatalogService,
	selectedTooth,
}) => {
	return (
		<div className="mb-3 relative">
			<div className="relative">
				<input
					type="text"
					value={catalogSearch}
					onChange={(e) => onCatalogSearchChange(e.target.value)}
					placeholder="Поиск по прейскуранту клиники (код услуги или название: пломба, коронка, анестезия)..."
					data-testid="service-catalog-search-input"
					className="w-full text-xs text-[var(--ink)] bg-[var(--paper)] border border-[var(--line)] rounded-lg pl-10 pr-9 py-2.5 min-h-[44px] sm:min-h-[36px] focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] placeholder:text-[var(--ink-muted)]"
				/>
				<Search className="w-4 h-4 text-[var(--ink-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
				{catalogSearch && (
					<button
						type="button"
						onClick={() => onCatalogSearchChange("")}
						className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--ink-muted)] hover:text-[var(--ink)] rounded-full"
						title="Очистить поиск"
					>
						<X className="w-4 h-4" />
					</button>
				)}
			</div>

			{catalogSearch.trim().length > 0 && (
				<div
					data-testid="service-catalog-search-results"
					className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--paper)] shadow-lg z-30 divide-y divide-[var(--line)]"
				>
					{filteredCatalog.length === 0 ? (
						<div className="p-3 text-xs text-[var(--ink-muted)] text-center">
							Ничего не найдено в прейскуранте по запросу «{catalogSearch}»
						</div>
					) : (
						filteredCatalog.map((item) => (
							<button
								key={item.id}
								type="button"
								onClick={() => onAddCatalogService(item)}
								className="w-full min-h-[44px] flex items-center justify-between p-2.5 text-left hover:bg-[var(--paper-soft)] transition-colors group"
							>
								<div className="flex-1 min-w-0 pr-2">
									<div className="flex items-center gap-1.5">
										<span className="text-xs font-medium text-[var(--ink)] group-hover:text-[var(--primary)] truncate">
											{item.title}
										</span>
										<span className="font-mono text-[10px] text-[var(--ink-muted)] shrink-0">
											[{item.code}]
										</span>
									</div>
									{selectedTooth && (
										<div className="text-[10px] text-[var(--primary)] mt-0.5">
											будет привязано к зубу {selectedTooth}
										</div>
									)}
								</div>
								<div className="flex items-center gap-2 shrink-0">
									<span className="text-xs font-bold font-mono text-[var(--ink)]">
										{money(item.priceRub)}
									</span>
									<span className="text-xs text-[var(--primary)] font-semibold flex items-center gap-0.5">
										<Plus className="w-3.5 h-3.5" /> Добавить
									</span>
								</div>
							</button>
						))
					)}
				</div>
			)}
		</div>
	);
};
