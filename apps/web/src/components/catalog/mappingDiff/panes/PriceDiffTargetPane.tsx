/**
 * DENTE Dental CRM — Right Pane: Target Clinical Catalog & 1-Click Linking
 * Unified SSOT Presentation Module (Mandates 8b, 8zi, 8e, 8n)
 */

import { ShieldCheck } from "lucide-react";
import React from "react";
import type { RefObject } from "react";
import type { ExistingCatalogReference, IngestedMappingItem } from "../types";
import { PriceDiffItemRow } from "./PriceDiffItemRow";

export interface PriceDiffTargetPaneProps {
	readonly filteredItems: readonly IngestedMappingItem[];
	readonly totalApprovedCount: number;
	readonly totalCount: number;
	readonly activeLinkRowId: string | null;
	readonly hoveredRowId: string | null;
	readonly editingRowPriceId: string | null;
	readonly editingRowPriceBuffer: string;
	readonly existingCatalog: readonly ExistingCatalogReference[];
	readonly rightBodyRef: RefObject<HTMLDivElement | null>;
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
	readonly title?: string | undefined;
}

export const PriceDiffTargetPane: React.FC<PriceDiffTargetPaneProps> = ({
	filteredItems,
	totalApprovedCount,
	totalCount,
	activeLinkRowId,
	hoveredRowId,
	editingRowPriceId,
	editingRowPriceBuffer,
	existingCatalog,
	rightBodyRef,
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
	title = "2. Сопоставление со стандартной номенклатурой",
}) => {
	return (
		<section
			className="pricelist-diff-pane right-pane"
			aria-label="Сопоставление со стандартной номенклатурой"
		>
			<header className="pricelist-diff-pane-header">
				<div className="pricelist-diff-pane-title">
					<ShieldCheck size={13} style={{ color: "var(--ok-fg)", flexShrink: 0 }} />
					<span className="pricelist-diff-pane-title-text" title={title}>
						{title}
					</span>
				</div>
				<span className="pricelist-diff-pane-counter">
					{`Выбрано к загрузке: ${totalApprovedCount} из ${totalCount}`}
				</span>
			</header>

			<div
				ref={rightBodyRef}
				onScroll={onRightScroll}
				className="pricelist-diff-pane-body"
				data-testid="diff-pane-right"
			>
				{filteredItems.map((item) => (
					<PriceDiffItemRow
						key={`mapped-${item.id}`}
						item={item}
						isLinking={activeLinkRowId === item.id}
						isHovered={hoveredRowId === item.id}
						editingPriceId={editingRowPriceId}
						editingPriceBuffer={editingRowPriceBuffer}
						existingCatalog={existingCatalog}
						onHover={onHoverRow}
						onToggleApprove={() => onToggleApproveRow(item.id)}
						onSetCreateNew={() => onSetCreateNew(item.id)}
						onStartLinking={() => onSetActiveLinkRowId(item.id)}
						onCancelLinking={() => onSetActiveLinkRowId(null)}
						onLinkExisting={(targetId) => onSetLinkExisting(item.id, targetId)}
						onStartEditPrice={() => onStartEditPrice(item.id, item.priceRub)}
						onPriceBufferChange={onPriceBufferChange}
						onCommitPrice={(val) => onCommitRowPrice(item.id, val)}
						onCancelEditPrice={onCancelEditPrice}
						onModifyDelta={(delta) => onModifyRowDelta(item.id, delta)}
						onSetZeroPrice={() => onSetRowZeroPrice(item.id)}
						formatPrice={formatPrice}
					/>
				))}

				{filteredItems.length === 0 && (
					<div
						style={{
							textAlign: "center",
							padding: "2rem",
							color: "var(--muted)",
							fontSize: "0.8125rem",
						}}
					>
						Нет позиций для сопоставления
					</div>
				)}
			</div>
		</section>
	);
};

export {
	PriceDiffItemRow,
	PriceDiffRowBadges,
	PriceDiffRowPriceCol,
	PriceDiffRowActions,
	PriceDiffRowLinkDrawer,
} from "./PriceDiffItemRow";
