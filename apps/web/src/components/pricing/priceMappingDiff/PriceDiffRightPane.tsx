import { ShieldCheck } from "lucide-react";
import type React from "react";
import { PriceDiffItemRow } from "./PriceDiffItemRow";
import type { PriceDiffTableProps } from "./types";

export type PriceDiffRightPaneProps = Omit<
	PriceDiffTableProps,
	"leftBodyRef" | "onLeftScroll"
>;

export const PriceDiffRightPane: React.FC<PriceDiffRightPaneProps> = ({
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
}) => {
	return (
		<section
			className="pricelist-diff-pane right-pane"
			aria-label="Сопоставление со стандартной номенклатурой"
		>
			<header className="pricelist-diff-pane-header">
				<div className="pricelist-diff-pane-title">
					<ShieldCheck
						size={13}
						style={{ color: "var(--ok-fg)", flexShrink: 0 }}
					/>
					<span
						className="pricelist-diff-pane-title-text"
						title="2. Сопоставление со стандартной номенклатурой"
					>
						2. Сопоставление со стандартной номенклатурой
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
						onMouseEnter={() => onHoverRow(item.id)}
						onMouseLeave={() => onHoverRow(null)}
						onToggleApprove={() => onToggleApproveRow(item.id)}
						onSetCreateNew={() => onSetCreateNew(item.id)}
						onStartLinking={() => onSetActiveLinkRowId(item.id)}
						onCancelLinking={() => onSetActiveLinkRowId(null)}
						onLinkExisting={(targetServiceId) =>
							onSetLinkExisting(item.id, targetServiceId)
						}
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
