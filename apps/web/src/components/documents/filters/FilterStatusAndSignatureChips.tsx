import type React from "react";
import type { DocumentCategoryTab } from "../DocumentNavTabs";
import type { DocumentEdsFilter, DocumentStatusFilter } from "./filterBarTypes";
import { FilterCategoryTabs } from "./FilterCategoryTabs";

export interface FilterStatusAndSignatureChipsProps {
	readonly activeCategoryTab?: DocumentCategoryTab | undefined;
	readonly onSelectCategoryTab?: ((tab: DocumentCategoryTab) => void) | undefined;
	readonly categoryCounts?: Record<DocumentCategoryTab, number> | undefined;
	readonly statusFilter: DocumentStatusFilter;
	readonly onStatusFilterChange: (status: DocumentStatusFilter) => void;
	readonly edsFilter: DocumentEdsFilter;
	readonly onEdsFilterChange: (eds: DocumentEdsFilter) => void;
}

export function FilterStatusAndSignatureChips({
	activeCategoryTab,
	onSelectCategoryTab,
	categoryCounts,
	statusFilter,
	onStatusFilterChange,
	edsFilter,
	onEdsFilterChange,
}: FilterStatusAndSignatureChipsProps): React.JSX.Element {
	return (
		<div className="document-filters-row">
			{onSelectCategoryTab && (
				<FilterCategoryTabs
					activeCategoryTab={activeCategoryTab}
					onSelectCategoryTab={onSelectCategoryTab}
					categoryCounts={categoryCounts}
				/>
			)}

			<div className="document-filter-group" role="group" aria-label="Фильтр по статусу документа">
				<span className="document-filter-label">Статус:</span>
				<button
					type="button"
					className={`document-filter-chip ${statusFilter === "all" ? "active" : ""}`}
					onClick={() => onStatusFilterChange("all")}
				>
					Все
				</button>
				<button
					type="button"
					className={`document-filter-chip ${statusFilter === "issued" ? "active" : ""}`}
					onClick={() => onStatusFilterChange("issued")}
				>
					Выдано
				</button>
				<button
					type="button"
					className={`document-filter-chip ${statusFilter === "draft" ? "active" : ""}`}
					onClick={() => onStatusFilterChange("draft")}
				>
					Черновики
				</button>
				<button
					type="button"
					className={`document-filter-chip ${statusFilter === "voided" ? "active" : ""}`}
					onClick={() => onStatusFilterChange("voided")}
				>
					Аннулировано
				</button>
			</div>

			<div className="document-filter-group" role="group" aria-label="Фильтр по статусу подписи">
				<span className="document-filter-label document-filter-label--eds">Подпись:</span>
				<button
					type="button"
					className={`document-filter-chip ${edsFilter === "all" ? "active" : ""}`}
					onClick={() => onEdsFilterChange("all")}
				>
					Любая
				</button>
				<button
					type="button"
					className={`document-filter-chip ${edsFilter === "signed_eds" ? "active" : ""}`}
					onClick={() => onEdsFilterChange("signed_eds")}
					title="Подписано квалифицированной электронной подписью (УКЭП / КриптоПро)"
				>
					ЭЦП / УКЭП
				</button>
				<button
					type="button"
					className={`document-filter-chip ${edsFilter === "signed_paper" ? "active" : ""}`}
					onClick={() => onEdsFilterChange("signed_paper")}
					title="Бумажная собственноручная подпись"
				>
					Бумага
				</button>
				<button
					type="button"
					className={`document-filter-chip ${edsFilter === "unsigned" ? "active" : ""}`}
					onClick={() => onEdsFilterChange("unsigned")}
					title="Без подтвержденной подписи"
				>
					Без подписи
				</button>
			</div>
		</div>
	);
}
