import type React from "react";
import type {
	DocumentEdsFilter,
	DocumentRegistryFilterBarProps,
	DocumentStatusFilter,
} from "./filters/filterBarTypes";
import { FilterDocumentKindChips } from "./filters/FilterDocumentKindChips";
import { FilterSearchRow } from "./filters/FilterSearchRow";
import { FilterStatusAndSignatureChips } from "./filters/FilterStatusAndSignatureChips";

export type {
	DocumentEdsFilter,
	DocumentRegistryFilterBarProps,
	DocumentStatusFilter,
};

export function DocumentRegistryFilterBar({
	searchQuery,
	onSearchChange,
	statusFilter,
	onStatusFilterChange,
	edsFilter,
	onEdsFilterChange,
	kindFilter,
	onKindFilterChange,
	totalCount,
	filteredCount,
	onResetFilters,
	availableKinds = [],
	activeCategoryTab,
	onSelectCategoryTab,
	categoryCounts,
}: DocumentRegistryFilterBarProps): React.JSX.Element {
	const safeQuery = searchQuery ?? "";
	const hasActiveFilters =
		safeQuery.trim().length > 0 ||
		statusFilter !== "all" ||
		edsFilter !== "all" ||
		kindFilter !== "all" ||
		(activeCategoryTab !== undefined && activeCategoryTab !== "all");

	return (
		<div
			className="document-registry-filter-bar"
			aria-label="Фильтры и поиск по реестру документов"
		>
			<FilterSearchRow
				searchQuery={searchQuery}
				onSearchChange={onSearchChange}
				availableKinds={availableKinds}
				kindFilter={kindFilter}
				onKindFilterChange={onKindFilterChange}
				hasActiveFilters={hasActiveFilters}
				onResetFilters={onResetFilters}
				filteredCount={filteredCount}
				totalCount={totalCount}
			/>

			<FilterDocumentKindChips
				kindFilter={kindFilter}
				onKindFilterChange={onKindFilterChange}
			/>

			<FilterStatusAndSignatureChips
				activeCategoryTab={activeCategoryTab}
				onSelectCategoryTab={onSelectCategoryTab}
				categoryCounts={categoryCounts}
				statusFilter={statusFilter}
				onStatusFilterChange={onStatusFilterChange}
				edsFilter={edsFilter}
				onEdsFilterChange={onEdsFilterChange}
			/>
		</div>
	);
}
