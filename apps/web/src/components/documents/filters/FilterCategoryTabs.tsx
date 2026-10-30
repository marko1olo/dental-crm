import React from "react";
import type { DocumentCategoryTab } from "../DocumentNavTabs";

export interface FilterCategoryTabsProps {
	readonly activeCategoryTab?: DocumentCategoryTab | undefined;
	readonly onSelectCategoryTab: (tab: DocumentCategoryTab) => void;
	readonly categoryCounts?: Record<DocumentCategoryTab, number> | undefined;
}

export function FilterCategoryTabs({
	activeCategoryTab,
	onSelectCategoryTab,
	categoryCounts,
}: FilterCategoryTabsProps): React.JSX.Element {
	return (
		<div className="document-filter-group" role="group" aria-label="Фильтр по разделу документов">
			<span className="document-filter-label">Раздел:</span>
			<button
				type="button"
				className={`document-filter-chip ${activeCategoryTab === "all" ? "active" : ""}`}
				onClick={() => onSelectCategoryTab("all")}
			>
				Все{categoryCounts?.all !== undefined ? ` (${categoryCounts.all})` : ""}
			</button>
			<button
				type="button"
				className={`document-filter-chip ${activeCategoryTab === "intake" ? "active" : ""}`}
				onClick={() => onSelectCategoryTab("intake")}
			>
				Первичные{categoryCounts?.intake !== undefined ? ` (${categoryCounts.intake})` : ""}
			</button>
			<button
				type="button"
				className={`document-filter-chip ${activeCategoryTab === "clinical" ? "active" : ""}`}
				onClick={() => onSelectCategoryTab("clinical")}
			>
				Клинические{categoryCounts?.clinical !== undefined ? ` (${categoryCounts.clinical})` : ""}
			</button>
			<button
				type="button"
				className={`document-filter-chip ${activeCategoryTab === "finance_tax" ? "active" : ""}`}
				onClick={() => onSelectCategoryTab("finance_tax")}
			>
				Финансы/ФНС{categoryCounts?.finance_tax !== undefined ? ` (${categoryCounts.finance_tax})` : ""}
			</button>
			<button
				type="button"
				className={`document-filter-chip ${activeCategoryTab === "certificates_sanpin" ? "active" : ""}`}
				onClick={() => onSelectCategoryTab("certificates_sanpin")}
			>
				Стерилизация{categoryCounts?.certificates_sanpin !== undefined ? ` (${categoryCounts.certificates_sanpin})` : ""}
			</button>
		</div>
	);
}
