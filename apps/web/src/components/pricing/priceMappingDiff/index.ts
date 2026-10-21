/**
 * DENTE Dental CRM — Modular Price List Mapping Diff Subsystem
 * Barrel exports for types, hook, subcomponents and coordinator
 */

export { PriceDiffItemRow } from "./PriceDiffItemRow";
export { PriceDiffSummaryBar } from "./PriceDiffSummaryBar";
export { PriceDiffTable } from "./PriceDiffTable";
export { PriceDiffToolbar } from "./PriceDiffToolbar";
export type {
	ExistingCatalogReference,
	IngestedMappingItem,
	MappingConfidenceKind,
	MappingSuggestedAction,
	PriceDiffItemRowProps,
	PriceDiffStats,
	PriceDiffSummaryBarProps,
	PriceDiffTableProps,
	PriceDiffToolbarProps,
	PriceListMappingDiffViewProps,
	PriceMappingDiffFilterTab,
} from "./types";
export { usePriceMappingDiff } from "./usePriceMappingDiff";
