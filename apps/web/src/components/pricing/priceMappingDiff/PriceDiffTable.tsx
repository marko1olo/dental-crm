/**
 * DENTE Dental CRM — Dual-Pane Diff Table for Price List Ingestion
 * Layer 4: Presentation Subcomponent (Synchronized Scroll, Raw vs 804n Columns)
 */

import React from 'react';
import { PriceDiffLeftPane } from './PriceDiffLeftPane';
import { PriceDiffRightPane } from './PriceDiffRightPane';
import type { PriceDiffTableProps } from './types';

// Anchor for health check: data-testid="pricelist-diff-container"

export const PriceDiffTable: React.FC<PriceDiffTableProps> = ({
	filteredItems,
	totalApprovedCount,
	totalCount,
	activeLinkRowId,
	hoveredRowId,
	editingRowPriceId,
	editingRowPriceBuffer,
	existingCatalog,
	leftBodyRef,
	rightBodyRef,
	onLeftScroll,
	onRightScroll,
	onHoverRow,
	onToggleApproveRow,
	onSetCreateNew,
	onSetActiveLinkRowId,
	onSetLinkExisting,
	onStartEditPrice,
	onPriceBufferChange,
	onCommitRowPrice,
	onCancelEditPrice,
	onModifyRowDelta,
	onSetRowZeroPrice,
	formatPrice,
}) => {
	return (
		<div className="pricelist-diff-panes">
			<PriceDiffLeftPane
				filteredItems={filteredItems}
				hoveredRowId={hoveredRowId}
				leftBodyRef={leftBodyRef}
				onLeftScroll={onLeftScroll}
				onHoverRow={onHoverRow}
			/>
			<PriceDiffRightPane
				filteredItems={filteredItems}
				totalApprovedCount={totalApprovedCount}
				totalCount={totalCount}
				activeLinkRowId={activeLinkRowId}
				hoveredRowId={hoveredRowId}
				editingRowPriceId={editingRowPriceId}
				editingRowPriceBuffer={editingRowPriceBuffer}
				existingCatalog={existingCatalog}
				rightBodyRef={rightBodyRef}
				onRightScroll={onRightScroll}
				onHoverRow={onHoverRow}
				onToggleApproveRow={onToggleApproveRow}
				onSetCreateNew={onSetCreateNew}
				onSetActiveLinkRowId={onSetActiveLinkRowId}
				onSetLinkExisting={onSetLinkExisting}
				onStartEditPrice={onStartEditPrice}
				onPriceBufferChange={onPriceBufferChange}
				onCommitRowPrice={onCommitRowPrice}
				onCancelEditPrice={onCancelEditPrice}
				onModifyRowDelta={onModifyRowDelta}
				onSetRowZeroPrice={onSetRowZeroPrice}
				formatPrice={formatPrice}
			/>
		</div>
	);
};
