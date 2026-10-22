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
					className="w-full text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-8 py-2.5 min-h-[44px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-400"
				/>
				<Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
				{catalogSearch && (
					<button
						type="button"
						onClick={() => onCatalogSearchChange("")}
						className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
						title="Очистить поиск"
					>
						<X className="w-4 h-4" />
					</button>
				)}
			</div>

			{catalogSearch.trim().length > 0 && (
				<div
					data-testid="service-catalog-search-results"
					className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg z-30 divide-y divide-slate-100 dark:divide-slate-800"
				>
					{filteredCatalog.length === 0 ? (
						<div className="p-3 text-xs text-slate-500 dark:text-slate-400 text-center">
							Ничего не найдено в прейскуранте по запросу «{catalogSearch}»
						</div>
					) : (
						filteredCatalog.map((item) => (
							<button
								key={item.id}
								type="button"
								onClick={() => onAddCatalogService(item)}
								className="w-full min-h-[44px] flex items-center justify-between p-2.5 text-left hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 transition-colors group"
							>
								<div className="flex-1 min-w-0 pr-2">
									<div className="flex items-center gap-1.5">
										<span className="text-xs font-medium text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 truncate">
											{item.title}
										</span>
										<span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
											[{item.code}]
										</span>
									</div>
									{selectedTooth && (
										<div className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">
											будет привязано к зубу {selectedTooth}
										</div>
									)}
								</div>
								<div className="flex items-center gap-2 shrink-0">
									<span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-200">
										{money(item.priceRub)}
									</span>
									<span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-0.5">
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
