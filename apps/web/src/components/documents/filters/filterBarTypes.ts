import type { DocumentCategoryTab } from "../DocumentNavTabs";

export type DocumentStatusFilter = "all" | "draft" | "issued" | "voided";
export type DocumentEdsFilter = "all" | "signed_eds" | "signed_paper" | "unsigned";

export interface DocumentRegistryFilterBarProps {
	readonly searchQuery: string;
	readonly onSearchChange: (query: string) => void;
	readonly statusFilter: DocumentStatusFilter;
	readonly onStatusFilterChange: (status: DocumentStatusFilter) => void;
	readonly edsFilter: DocumentEdsFilter;
	readonly onEdsFilterChange: (eds: DocumentEdsFilter) => void;
	readonly kindFilter: string;
	readonly onKindFilterChange: (kind: string) => void;
	readonly totalCount: number;
	readonly filteredCount: number;
	readonly onResetFilters: () => void;
	readonly availableKinds?: ReadonlyArray<{ readonly kind: string; readonly label: string }> | undefined;
	readonly activeCategoryTab?: DocumentCategoryTab | undefined;
	readonly onSelectCategoryTab?: ((tab: DocumentCategoryTab) => void) | undefined;
	readonly categoryCounts?: Record<DocumentCategoryTab, number> | undefined;
}
