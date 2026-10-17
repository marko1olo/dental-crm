/**
 * DENTE Dental CRM — Mapped Item Row for Price List Diff
 * Layer 4: Presentation Subcomponent (Minzdrav 804n Mapping, Modifiers & Linking)
 */

import React from 'react';
import type { PriceDiffItemRowProps } from './types';
import { PriceDiffRowBadges } from './PriceDiffRowBadges';
import { PriceDiffRowLinkDrawer } from './PriceDiffRowLinkDrawer';
import { PriceDiffRowPriceCol } from './PriceDiffRowPriceCol';
import { PriceDiffRowActions } from './PriceDiffRowActions';

export const PriceDiffItemRow: React.FC<PriceDiffItemRowProps> = ({
	item,
	isLinking,
	isHovered,
	editingPriceId,
	editingPriceBuffer,
	existingCatalog,
	onMouseEnter,
	onMouseLeave,
	onToggleApprove,
	onSetCreateNew,
	onStartLinking,
	onCancelLinking,
	onLinkExisting,
	onStartEditPrice,
	onPriceBufferChange,
	onCommitPrice,
	onCancelEditPrice,
	onModifyDelta,
	onSetZeroPrice,
	formatPrice,
}) => {
	return (
		<div
			className={`pricelist-diff-mapped-row ${item.isApproved ? '' : 'unapproved'} ${isHovered ? 'is-hovered' : ''}`}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			data-testid={`diff-mapped-row-${item.id}`}
		>
			{/* Main Item Metadata */}
			<div className="pricelist-diff-mapped-main">
				<div className="pricelist-diff-mapped-header">
					<span className="pricelist-diff-code-badge" title={item.statutoryTitle804n}>
						{item.code804n}
					</span>
					<PriceDiffRowBadges
						confidence={item.confidence}
						kind={item.confidenceKind}
						action={item.suggestedAction}
					/>
				</div>

				<div className="pricelist-diff-mapped-title" title={item.cleanedTitle}>
					{item.cleanedTitle}
				</div>

				<div
					className="pricelist-diff-statutory-title"
					title={`Номенклатура: ${item.statutoryTitle804n}`}
				>
					{`Номенклатура: ${item.statutoryTitle804n}`}
				</div>

				{/* Inline Service Linker Drawer (if active) */}
				{isLinking && (
					<PriceDiffRowLinkDrawer
						item={item}
						existingCatalog={existingCatalog}
						onLinkExisting={onLinkExisting}
						onCancelLinking={onCancelLinking}
						formatPrice={formatPrice}
					/>
				)}
			</div>

			{/* Price Column with Inline Modifiers */}
			<PriceDiffRowPriceCol
				item={item}
				editingPriceId={editingPriceId}
				editingPriceBuffer={editingPriceBuffer}
				onStartEditPrice={onStartEditPrice}
				onPriceBufferChange={onPriceBufferChange}
				onCommitPrice={onCommitPrice}
				onCancelEditPrice={onCancelEditPrice}
				onModifyDelta={onModifyDelta}
				onSetZeroPrice={onSetZeroPrice}
				formatPrice={formatPrice}
			/>

			{/* 1-Click Row Actions */}
			<PriceDiffRowActions
				item={item}
				isLinking={isLinking}
				onSetCreateNew={onSetCreateNew}
				onStartLinking={onStartLinking}
				onCancelLinking={onCancelLinking}
				onToggleApprove={onToggleApprove}
			/>
		</div>
	);
};
