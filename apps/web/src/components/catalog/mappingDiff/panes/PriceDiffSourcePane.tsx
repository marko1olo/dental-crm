/**
 * DENTE Dental CRM — Left Pane: Source Ingested Document & Raw Price Lines
 * Unified SSOT Presentation Module (Mandates 8b, 8zi)
 */

import { FileText, Search } from "lucide-react";
import React from "react";
import type { RefObject } from "react";
import type { IngestedMappingItem } from "../types";

export interface PriceDiffSourcePaneProps {
	readonly filteredItems: readonly IngestedMappingItem[];
	readonly hoveredRowId: string | null;
	readonly leftBodyRef: RefObject<HTMLDivElement | null>;
	readonly onLeftScroll: () => void;
	readonly onHoverRow: (id: string | null) => void;
	readonly title?: string | undefined;
	readonly searchHighlight?: string | undefined;
}

export const PriceDiffSourcePane: React.FC<PriceDiffSourcePaneProps> = ({
	filteredItems,
	hoveredRowId,
	leftBodyRef,
	onLeftScroll,
	onHoverRow,
	title = "1. Исходный прейскурант клиники",
	searchHighlight = "",
}) => {
	const renderRawLine = (text: string) => {
		if (!searchHighlight) return text;
		const lower = text.toLowerCase();
		const term = searchHighlight.toLowerCase();
		const index = lower.indexOf(term);
		if (index === -1) return text;

		const before = text.slice(0, index);
		const match = text.slice(index, index + term.length);
		const after = text.slice(index + term.length);

		return (
			<>
				{before}
				<mark
					style={{
						backgroundColor: "var(--teal-soft)",
						color: "var(--teal)",
						borderRadius: "2px",
						padding: "0 2px",
					}}
				>
					{match}
				</mark>
				{after}
			</>
		);
	};

	return (
		<section
			className="pricelist-diff-pane left-pane"
			aria-label="Исходный прейскурант клиники"
		>
			<header className="pricelist-diff-pane-header">
				<div className="pricelist-diff-pane-title">
					<FileText size={13} style={{ flexShrink: 0 }} />
					<span className="pricelist-diff-pane-title-text" title={title}>
						{title}
					</span>
				</div>
				<span className="pricelist-diff-pane-counter">
					{`${filteredItems.length} строк`}
				</span>
			</header>

			<div
				ref={leftBodyRef}
				onScroll={onLeftScroll}
				className="pricelist-diff-pane-body"
				data-testid="diff-pane-left"
			>
				{filteredItems.map((item) => (
					<div
						key={`raw-${item.id}`}
						className={`pricelist-diff-raw-row ${hoveredRowId === item.id ? "is-hovered" : ""}`}
						onMouseEnter={() => onHoverRow(item.id)}
						onMouseLeave={() => onHoverRow(null)}
						data-testid={`diff-raw-row-${item.id}`}
					>
						<span className="pricelist-diff-line-number">{`#${item.sourceLineNumber}`}</span>
						<div className="pricelist-diff-raw-text">
							{renderRawLine(item.rawLine)}
						</div>
					</div>
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
						Нет строк, соответствующих выбранному фильтру
					</div>
				)}
			</div>
		</section>
	);
};
