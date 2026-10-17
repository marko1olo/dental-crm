/**
 * DENTE Dental CRM — Types for Price List Mapping & 804n Nomenclature Diff
 * Layer 0: Component Props & Re-exports
 */

import type { RefObject } from 'react';
import type {
	IngestedMappingItem,
	ExistingCatalogReference,
	PriceMappingDiffFilterTab,
	PriceDiffStats,
} from './itemTypes';

export * from './itemTypes';

export interface PriceListMappingDiffViewProps {
	readonly items: readonly IngestedMappingItem[];
	readonly onItemsChange?: ((items: readonly IngestedMappingItem[]) => void) | undefined;
	readonly onAcceptAll?: (() => void) | undefined;
	readonly onApply?: ((approvedItems: readonly IngestedMappingItem[]) => void) | undefined;
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
	readonly onBatchRounding: (roundTo?: number | undefined) => void;
	readonly onBatchSetZero: () => void;
	readonly onAcceptAll: () => void;
	readonly onDeselectAll: () => void;
}

export interface PriceDiffItemRowProps {
	readonly item: IngestedMappingItem;
	readonly isLinking: boolean;
	readonly isHovered: boolean;
	readonly editingPriceId: string | null;
	readonly editingPriceBuffer: string;
	readonly existingCatalog: readonly ExistingCatalogReference[];
	readonly onMouseEnter: () => void;
	readonly onMouseLeave: () => void;
	readonly onToggleApprove: () => void;
	readonly onSetCreateNew: () => void;
	readonly onStartLinking: () => void;
	readonly onCancelLinking: () => void;
	readonly onLinkExisting: (targetServiceId: string) => void;
	readonly onStartEditPrice: () => void;
	readonly onPriceBufferChange: (val: string) => void;
	readonly onCommitPrice: (val: string) => void;
	readonly onCancelEditPrice: () => void;
	readonly onModifyDelta: (deltaRub: number) => void;
	readonly onSetZeroPrice: () => void;
	readonly formatPrice: (rub: number) => string;
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
	readonly onToggleApproveRow: (id: string) => void;
	readonly onSetCreateNew: (id: string) => void;
	readonly onSetActiveLinkRowId: (id: string | null) => void;
	readonly onSetLinkExisting: (rowId: string, targetServiceId: string) => void;
	readonly onStartEditPrice: (id: string, initialVal: number) => void;
	readonly onPriceBufferChange: (val: string) => void;
	readonly onCommitRowPrice: (rowId: string, val: string) => void;
	readonly onCancelEditPrice: () => void;
	readonly onModifyRowDelta: (rowId: string, deltaRub: number) => void;
	readonly onSetRowZeroPrice: (rowId: string) => void;
	readonly formatPrice: (rub: number) => string;
}

export interface PriceDiffSummaryBarProps {
	readonly approvedCount: number;
	readonly totalCount: number;
	readonly isLoading?: boolean | undefined;
	readonly onApply?: (() => void) | undefined;
	readonly onCancel?: (() => void) | undefined;
}
