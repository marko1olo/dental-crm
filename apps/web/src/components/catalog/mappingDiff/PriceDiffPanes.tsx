/**
 * DENTE Dental CRM — Dual-Pane Table & Row Presentations for Price Diff View
 * Unified SSOT Presentation Module (Mandates 8b, 8zi)
 *
 * Modular Architecture Facade:
 * Decomposed into dedicated Sweet Spot submodules under `./panes/`:
 * - `usePriceDiffPanesState.ts` (Calculations in integer kopecks & filter state)
 * - `PriceDiffToolbar.tsx` (Status badges & action triggers)
 * - `PriceDiffSourcePane.tsx` (Left raw input document presentation)
 * - `PriceDiffTargetPane.tsx` (Right clinical mapping presentation)
 * - `PriceDiffComparisonRow.tsx` (Visual old vs new price delta card)
 * - `PriceDiffItemRow.tsx` (1-Click modifiers & linking controls)
 */

import React from "react";
import type { PriceDiffTableProps } from "./types";
import {
	PriceDiffPanes,
	PriceDiffSourcePane,
	PriceDiffTargetPane,
} from "./panes";

/* --- Backward Compatibility Subcomponents & Aliases --- */

export {
	PriceDiffRowBadges,
	PriceDiffRowPriceCol,
	PriceDiffRowActions,
	PriceDiffRowLinkDrawer,
	PriceDiffItemRow,
} from "./panes/PriceDiffItemRow";

export { PriceDiffComparisonRow } from "./panes/PriceDiffComparisonRow";
export { PriceDiffSourcePane } from "./panes/PriceDiffSourcePane";
export { PriceDiffTargetPane } from "./panes/PriceDiffTargetPane";
export { PriceDiffToolbar as PriceDiffPanesToolbar } from "./panes/PriceDiffToolbar";
export {
	calculateItemPriceDiff,
	usePriceDiffPanesState,
	type ExtendedDiffFilter,
	type ItemPriceDiffResult,
} from "./panes/usePriceDiffPanesState";

/**
 * Backward compatibility alias: PriceDiffLeftPane -> PriceDiffSourcePane
 */
export const PriceDiffLeftPane = PriceDiffSourcePane;

/**
 * Backward compatibility alias: PriceDiffRightPane -> PriceDiffTargetPane
 */
export const PriceDiffRightPane = PriceDiffTargetPane;

/**
 * Composite Master Table for Dual-Pane Price Diff View.
 * Fully compatible with existing tests, props, and synchronized scrolling.
 */
export const PriceDiffTable: React.FC<PriceDiffTableProps> = (props) => {
	return <PriceDiffPanes {...props} />;
};

export { PriceDiffPanes };
export default PriceDiffTable;
