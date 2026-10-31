/**
 * DENTE Dental CRM — Coordinating Dual-Pane Layout for Price Diff
 * Unified SSOT Presentation Module (Mandates 8b, 8zi, 8ze, 8am)
 */

import { FileText, Layers, ShieldCheck } from "lucide-react";
import React, { useState } from "react";
import type { PriceDiffTableProps } from "../types";
import { PriceDiffSourcePane } from "./PriceDiffSourcePane";
import { PriceDiffTargetPane } from "./PriceDiffTargetPane";

export interface ExtendedPriceDiffPanesProps extends PriceDiffTableProps {
	readonly sourceTitle?: string | undefined;
	readonly targetTitle?: string | undefined;
}

export const PriceDiffPanes: React.FC<ExtendedPriceDiffPanesProps> = ({
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
	sourceTitle,
	targetTitle,
}) => {
	// Mobile tab view: "source" (left raw lines) or "target" (right mapped items)
	const [mobileActiveTab, setMobileActiveTab] = useState<"source" | "target">("target");

	return (
		<div className="pricelist-diff-panes-wrapper" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
			{/* Mobile tab bar for screens <= 768px (hidden on desktop via CSS) */}
			<div className="pricelist-diff-mobile-tabbar">
				<button
					type="button"
					className={`pricelist-diff-btn ${mobileActiveTab === "target" ? "pricelist-diff-btn-primary" : ""}`}
					style={{ flex: 1, height: "44px", minHeight: "44px", fontSize: "0.8125rem" }}
					onClick={() => setMobileActiveTab("target")}
				>
					<ShieldCheck size={16} />
					<span>{`Сопоставление (${totalApprovedCount}/${totalCount})`}</span>
				</button>
				<button
					type="button"
					className={`pricelist-diff-btn ${mobileActiveTab === "source" ? "pricelist-diff-btn-primary" : ""}`}
					style={{ flex: 1, height: "44px", minHeight: "44px", fontSize: "0.8125rem" }}
					onClick={() => setMobileActiveTab("source")}
				>
					<FileText size={16} />
					<span>{`Исходный файл (${filteredItems.length})`}</span>
				</button>
			</div>

			<div className="pricelist-diff-panes">
				{/* Left Pane (Desktop always visible, Mobile conditionally visible) */}
				<div className={`pricelist-diff-pane-col-left ${mobileActiveTab !== "source" ? "is-mobile-hidden" : ""}`}>
					<PriceDiffSourcePane
						filteredItems={filteredItems}
						hoveredRowId={hoveredRowId}
						leftBodyRef={leftBodyRef}
						onLeftScroll={onLeftScroll}
						onHoverRow={onHoverRow}
						{...(sourceTitle !== undefined ? { title: sourceTitle } : {})}
					/>
				</div>

				{/* Right Pane (Desktop always visible, Mobile conditionally visible) */}
				<div className={`pricelist-diff-pane-col-right ${mobileActiveTab !== "target" ? "is-mobile-hidden" : ""}`}>
					<PriceDiffTargetPane
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
						{...(targetTitle !== undefined ? { title: targetTitle } : {})}
					/>
				</div>
			</div>
		</div>
	);
};

/**
 * Canonical backward compatibility alias for PriceDiffTable.
 */
export const PriceDiffTable: React.FC<PriceDiffTableProps> = (props) => {
	return <PriceDiffPanes {...props} />;
};

export { PriceDiffSourcePane } from "./PriceDiffSourcePane";
export { PriceDiffTargetPane } from "./PriceDiffTargetPane";
export { PriceDiffComparisonRow } from "./PriceDiffComparisonRow";
