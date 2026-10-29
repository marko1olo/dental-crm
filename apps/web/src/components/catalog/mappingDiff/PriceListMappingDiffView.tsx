/**
 * DENTE Dental CRM — Dual-Pane Price List Ingestion & Catalog Mapping Diff View
 * Canonical SSOT Implementation (Mandates 8b, 8zi)
 */

import type React from "react";
import "./priceMappingDiff.css";
import { PriceDiffSummaryBar, PriceDiffToolbar } from "./PriceDiffControls";
import { PriceDiffTable } from "./PriceDiffPanes";
import type { PriceListMappingDiffViewProps } from "./types";
import { usePriceMappingDiff } from "./usePriceMappingDiffState";

export const PriceListMappingDiffView: React.FC<PriceListMappingDiffViewProps> = (props) => {
	const { existingCatalog = [], isLoading = false, onCancel } = props;
	const diff = usePriceMappingDiff(props);

	return (
		<div
			className="pricelist-diff-container"
			data-testid="pricelist-diff-container"
		>
			<PriceDiffToolbar
				stats={diff.stats}
				filterTab={diff.filterTab}
				onFilterTabChange={diff.setFilterTab}
				searchTerm={diff.searchTerm}
				onSearchTermChange={diff.setSearchTerm}
				searchInputId={diff.searchInputId}
				onBatchMarkup={diff.handleBatchMarkup}
				onBatchRounding={diff.handleBatchRounding}
				onBatchSetZero={diff.handleBatchSetZero}
				onAcceptAll={diff.handleAcceptAllClick}
				onDeselectAll={diff.handleDeselectAll}
			/>

			<PriceDiffTable
				filteredItems={diff.filteredItems}
				totalApprovedCount={diff.stats.approvedCount}
				totalCount={diff.stats.total}
				activeLinkRowId={diff.activeLinkRowId}
				hoveredRowId={diff.hoveredRowId}
				editingRowPriceId={diff.editingRowPriceId}
				editingRowPriceBuffer={diff.editingRowPriceBuffer}
				existingCatalog={existingCatalog}
				leftBodyRef={diff.leftBodyRef}
				rightBodyRef={diff.rightBodyRef}
				onLeftScroll={diff.handleLeftScroll}
				onRightScroll={diff.handleRightScroll}
				onHoverRow={diff.setHoveredRowId}
				onToggleApproveRow={diff.handleToggleApproveRow}
				onSetCreateNew={diff.handleSetCreateNew}
				onSetActiveLinkRowId={diff.setActiveLinkRowId}
				onSetLinkExisting={diff.handleSetLinkExisting}
				onStartEditPrice={diff.handleStartEditPrice}
				onPriceBufferChange={diff.setEditingRowPriceBuffer}
				onCommitRowPrice={diff.handleCommitRowPrice}
				onCancelEditPrice={diff.handleCancelEditPrice}
				onModifyRowDelta={diff.handleModifyRowDelta}
				onSetRowZeroPrice={diff.handleSetRowZeroPrice}
				formatPrice={diff.formatPrice}
			/>

			<PriceDiffSummaryBar
				approvedCount={diff.stats.approvedCount}
				totalCount={diff.stats.total}
				isLoading={isLoading}
				onApply={diff.handleApply}
				{...(onCancel !== undefined ? { onCancel } : {})}
			/>
		</div>
	);
};
