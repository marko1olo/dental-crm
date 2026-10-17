/**
 * DENTE Dental CRM — Modular Price List Mapping Diff Subsystem
 * Barrel exports for types, hook, subcomponents and coordinator
 */

export type {
	MappingConfidenceKind,
	MappingSuggestedAction,
	IngestedMappingItem,
	ExistingCatalogReference,
	PriceListMappingDiffViewProps,
	PriceMappingDiffFilterTab,
	PriceDiffStats,
	PriceDiffToolbarProps,
	PriceDiffItemRowProps,
	PriceDiffTableProps,
	PriceDiffSummaryBarProps,
} from './types';

export { usePriceMappingDiff } from './usePriceMappingDiff';
export { PriceDiffToolbar } from './PriceDiffToolbar';
export { PriceDiffItemRow } from './PriceDiffItemRow';
export { PriceDiffTable } from './PriceDiffTable';
export { PriceDiffSummaryBar } from './PriceDiffSummaryBar';
