/**
 * DENTE Dental CRM — Types for Service Catalog & Pricelist Mapping Diff
 * Unified SSOT Canonical Types (Mandates 8b, 8zi)
 */

import type { RefObject } from "react";

export type MappingConfidenceKind =
	| "exact_code"
	| "high_keyword"
	| "medium_category"
	| "low_unmatched";

export type SuggestedAction = "create_new" | "update_existing" | "link_existing";

export interface IngestedMappingItem {
	readonly id: string;
	readonly sourceLineNumber: number;
	readonly rawLine: string;
	readonly cleanedTitle: string;
	readonly code804n: string;
	readonly statutoryTitle804n: string;
	readonly category: string;
	readonly specialty: string;
	readonly priceRub: number;
	readonly priceKopecks: number;
	readonly confidence: number; // 0..1
	readonly confidenceKind: MappingConfidenceKind;
	readonly suggestedAction: SuggestedAction;
	readonly matchedExistingServiceId?: string | null | undefined;
	readonly matchedExistingTitle?: string | undefined;
	readonly matchedExistingPriceRub?: number | undefined;
	readonly isApproved: boolean;
	readonly warning?: string | undefined;
}

export interface ExistingCatalogReference {
	readonly id: string;
	readonly code: string;
	readonly title: string;
	readonly basePriceRub: number;
	readonly category: string;
}

export type PriceMappingDiffFilterTab =
	| "all"
	| "new"
	| "update"
	| "attention";

export interface PriceDiffStats {
	readonly total: number;
	readonly approvedCount: number;
	readonly exactCount: number;
	readonly newCount: number;
	readonly updateCount: number;
	readonly attentionCount: number;
	readonly avgConfidence: number;
}

export interface PriceListMappingDiffViewProps {
	readonly items: readonly IngestedMappingItem[];
	readonly onItemsChange?: ((items: readonly IngestedMappingItem[]) => void) | undefined;
	readonly onAcceptAll?: (() => void) | undefined;
	readonly onApply?: ((items: readonly IngestedMappingItem[]) => void) | undefined;
	readonly onCancel?: (() => void) | undefined;
	readonly existingCatalog?: readonly ExistingCatalogReference[] | undefined;
	readonly isLoading?: boolean | undefined;
}

export interface PriceDiffToolbarProps {
	readonly stats: PriceDiffStats;
	readonly filterTab: PriceMappingDiffFilterTab;
	readonly onFilterTabChange: (tab: PriceMappingDiffFilterTab) => void;
	readonly searchTerm: string;
	readonly onSearchTermChange: (term: string) => void;
	readonly searchInputId: string;
	readonly onBatchMarkup: (percent: number) => void;
	readonly onBatchRounding: (roundTo?: number) => void;
	readonly onBatchSetZero: () => void;
	readonly onAcceptAll: () => void;
	readonly onDeselectAll: () => void;
}

export interface PriceDiffTableProps {
	readonly filteredItems: readonly IngestedMappingItem[];
	readonly totalApprovedCount: number;
	readonly totalCount: number;
	readonly activeLinkRowId: string | null;
	readonly hoveredRowId: string | null;
	readonly editingRowPriceId: string | null;
	readonly editingRowPriceBuffer: string;
	readonly existingCatalog: readonly ExistingCatalogReference[];
	readonly leftBodyRef: RefObject<HTMLDivElement | null>;
	readonly rightBodyRef: RefObject<HTMLDivElement | null>;
	readonly onLeftScroll: () => void;
	readonly onRightScroll: () => void;
	readonly onHoverRow: (id: string | null) => void;
	readonly onToggleApproveRow: (rowId: string) => void;
	readonly onSetCreateNew: (rowId: string) => void;
	readonly onSetActiveLinkRowId: (rowId: string | null) => void;
	readonly onSetLinkExisting: (rowId: string, targetServiceId: string) => void;
	readonly onStartEditPrice: (id: string, initialVal: number) => void;
	readonly onPriceBufferChange: (val: string) => void;
	readonly onCommitRowPrice: (rowId: string, rawVal: string) => void;
	readonly onCancelEditPrice: () => void;
	readonly onModifyRowDelta: (rowId: string, deltaRub: number) => void;
	readonly onSetRowZeroPrice: (rowId: string) => void;
	readonly formatPrice: (rub: number) => string;
}

export interface PriceDiffSummaryBarProps {
	readonly approvedCount: number;
	readonly totalCount: number;
	readonly isLoading?: boolean | undefined;
	readonly onApply: () => void;
	readonly onCancel?: (() => void) | undefined;
}
