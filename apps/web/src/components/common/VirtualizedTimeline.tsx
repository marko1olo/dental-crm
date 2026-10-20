/**
 * apps/web/src/components/common/VirtualizedTimeline.tsx
 *
 * DENTE Dental CRM — Virtualized Timeline & Low-End Memory Shield Component.
 * Compliance: Mandates 8c, 8e, 8k, 8n (Zero CLS, <8KB Pure TSX, 60 FPS on Celeron).
 *
 * Purpose:
 * Renders clinical timelines, visit histories, and financial ledgers with dynamic
 * card heights. Mounts only ~8–12 DOM nodes + 2 overscan buffers at a time,
 * eliminating 200–400MB memory bloat on low-spec hardware (Intel Celeron / 4GB RAM).
 */

import React, { memo } from "react";
import {
	useDynamicVirtualizer,
	type UseDynamicVirtualizerOptions,
} from "../../utils/useDynamicVirtualizer";

export interface VirtualizedTimelineProps<T> {
	/** List of items to render */
	readonly items: readonly T[];
	/** Render function for each item */
	readonly renderItem: (
		item: T,
		index: number,
		meta: { isVirtualizing: boolean; index: number },
	) => React.ReactNode;
	/** Estimated height of one card in pixels (default: 80) */
	readonly estimateHeight?: number;
	/** Buffer of items above/below viewport (default: 2) */
	readonly overscan?: number;
	/** Unique key extractor */
	readonly getItemKey?: (item: T, index: number) => string | number;
	/** Threshold to activate windowing (default: 8 items) */
	readonly threshold?: number;
	/** Optional className for the root wrapper */
	readonly className?: string;
	/** Optional style for the root wrapper */
	readonly style?: React.CSSProperties;
	/** Optional empty state node when items.length === 0 */
	readonly emptyState?: React.ReactNode;
	/** Optional header element rendered above the list */
	readonly header?: React.ReactNode;
	/** Optional footer element rendered below the list */
	readonly footer?: React.ReactNode;
	/** Optional external scroll container ref */
	readonly scrollContainerRef?: React.RefObject<HTMLElement | null>;
	/** Optional fixed viewport height override (useful for testing) */
	readonly viewportHeightOverride?: number;
	/** Optional initial scroll top */
	readonly initialScrollTop?: number;
	/** Data-testid for automated testing */
	readonly dataTestId?: string;
}

function VirtualizedTimelineInner<T>({
	items,
	renderItem,
	estimateHeight = 80,
	overscan = 2,
	getItemKey,
	threshold = 8,
	className = "",
	style,
	emptyState,
	header,
	footer,
	scrollContainerRef,
	viewportHeightOverride,
	initialScrollTop,
	dataTestId,
}: VirtualizedTimelineProps<T>) {
	const count = items.length;

	const {
		virtualItems,
		topSpacerHeight,
		bottomSpacerHeight,
		isVirtualizing,
		containerRef,
		totalHeight,
	} = useDynamicVirtualizer({
		count,
		estimateHeight,
		overscan,
		getItemKey: (idx) => {
			if (getItemKey && items[idx] !== undefined) {
				return getItemKey(items[idx], idx);
			}
			return idx;
		},
		threshold,
		scrollContainerRef,
		viewportHeightOverride,
		initialScrollTop,
	});

	if (count === 0) {
		return (
			<div className={`virtualized-timeline-empty ${className}`} style={style} data-testid={dataTestId}>
				{header}
				{emptyState || (
					<div className="p-4 text-center text-xs text-[var(--muted)]">
						Список пуст
					</div>
				)}
				{footer}
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className={`virtualized-timeline-container flex flex-col w-full ${className}`}
			style={{
				minHeight: isVirtualizing ? totalHeight : undefined,
				...style,
			}}
			data-testid={dataTestId}
			data-virtualizing={isVirtualizing ? "true" : "false"}
			data-virtual-count={count}
			data-rendered-count={virtualItems.length}
		>
			{header}

			{/* Top Spacer to preserve scroll position */}
			{isVirtualizing && topSpacerHeight > 0 && (
				<div
					className="virtualized-timeline-spacer-top"
					style={{
						height: topSpacerHeight,
						width: "100%",
						flexShrink: 0,
						pointerEvents: "none",
					}}
					aria-hidden="true"
					data-testid="virtualized-spacer-top"
				/>
			)}

			{/* Rendered Window of Visible Items */}
			{virtualItems.map((vItem) => {
				const item = items[vItem.index];
				if (item === undefined) return null;

				return (
					<div
						key={vItem.key}
						ref={vItem.measureRef}
						className="virtualized-timeline-item-wrapper w-full"
						data-virtual-index={vItem.index}
						data-virtual-key={vItem.key}
					>
						{renderItem(item, vItem.index, {
							isVirtualizing,
							index: vItem.index,
						})}
					</div>
				);
			})}

			{/* Bottom Spacer to preserve scroll bar height */}
			{isVirtualizing && bottomSpacerHeight > 0 && (
				<div
					className="virtualized-timeline-spacer-bottom"
					style={{
						height: bottomSpacerHeight,
						width: "100%",
						flexShrink: 0,
						pointerEvents: "none",
					}}
					aria-hidden="true"
					data-testid="virtualized-spacer-bottom"
				/>
			)}

			{footer}
		</div>
	);
}

export const VirtualizedTimeline = memo(
	VirtualizedTimelineInner,
) as typeof VirtualizedTimelineInner;
