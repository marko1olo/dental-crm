import { FolderTree, Plus, Sparkles, UploadCloud } from "lucide-react";
import type React from "react";
import { SettingsPricesCategoryGroup } from "../SettingsPricesCategoryGroup";
import type { PricesCatalogTableProps } from "./types";

export function PricesCatalogTable({
	groupedCatalog,
	categoryLimits,
	setCategoryLimits,
	serviceCategoryLabels,
	specialtyLabels,
	deletingServiceId,
	onEditService,
	onDeleteService,
	searchQuery,
	selectedCategoryFilter,
	onResetFilters,
	isSeedingBaseline,
	onSeedBaseline,
	onAddNewService,
	onOpenScannerDropzone,
}: PricesCatalogTableProps) {
	const hasGroups = Object.keys(groupedCatalog).length > 0;

	return (
		<div className="catalog-groups">
			{hasGroups &&
				Object.entries(groupedCatalog).map(([category, items]) => (
					<SettingsPricesCategoryGroup
						key={category}
						category={category}
						items={items}
						categoryLimits={categoryLimits}
						setCategoryLimits={setCategoryLimits}
						serviceCategoryLabels={serviceCategoryLabels}
						specialtyLabels={specialtyLabels}
						deletingServiceId={deletingServiceId}
						onEditService={onEditService}
						onDeleteService={onDeleteService}
					/>
				))}

			{!hasGroups &&
				(searchQuery.trim() || selectedCategoryFilter !== "all" ? (
					<div className="empty-catalog-state">
						<FolderTree size={48} color="var(--line-strong)" />
						<p>По фильтрам ничего не найдено</p>
						<small style={{ color: "var(--muted)", marginTop: "4px" }}>
							Проверьте критерии поиска или очистите фильтры.
						</small>
						<button
							type="button"
							onClick={onResetFilters}
							className="secondary-button min-h-[32px] px-3 py-1.5 text-xs font-medium rounded-lg mt-2 cursor-pointer"
						>
							Сбросить фильтры
						</button>
					</div>
				) : (
					<div className="empty-catalog-state p-6 max-w-lg mx-auto my-6 bg-[var(--paper)] border border-[var(--line)] rounded-2xl shadow-sm text-center flex flex-col items-center gap-3">
						<div className="w-12 h-12 rounded-full bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center shrink-0">
							<Sparkles size={24} />
						</div>
						<div className="flex flex-col gap-1">
							<h4 className="text-base font-bold text-[var(--ink)]">
								Каталог услуг пуст
							</h4>
							<p className="text-xs text-[var(--muted)] leading-relaxed max-w-sm">
								Быстро наполните прейскурант клиники 30 основными стоматологическими услугами с рекомендованными ценами.
							</p>
						</div>
						<div className="flex flex-col sm:flex-row items-center gap-2 mt-2 w-full justify-center">
							<button
								type="button"
								data-testid="pricelist-seed-baseline-804n-btn"
								title="Заполнить рекомендованный прейскурант (30 базовых услуг)"
								disabled={isSeedingBaseline}
								onClick={onSeedBaseline}
								className="primary-button min-h-[36px] w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white shadow-xs inline-flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
							>
								<Sparkles size={15} className="shrink-0" />
								<span>
									{isSeedingBaseline
										? "Наполнение каталога..."
										: "Заполнить базовый прейскурант (30 услуг)"}
								</span>
							</button>
						</div>
						<div className="flex flex-wrap items-center justify-center gap-2 mt-2">
							<button
								type="button"
								onClick={onAddNewService}
								className="secondary-button h-8 px-3 text-[13px] font-medium rounded-lg cursor-pointer"
							>
								<Plus size={14} className="text-[var(--teal)] mr-1 inline" />
								Добавить вручную
							</button>
							<button
								type="button"
								onClick={onOpenScannerDropzone}
								className="secondary-button h-8 px-3 text-[13px] font-medium rounded-lg cursor-pointer"
							>
								<UploadCloud size={14} className="text-[var(--teal)] mr-1 inline" />
								Импорт прейскуранта
							</button>
						</div>
					</div>
				))}
		</div>
	);
}
