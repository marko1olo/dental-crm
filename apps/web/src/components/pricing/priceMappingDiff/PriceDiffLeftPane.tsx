import React, { type RefObject } from 'react';
import { FileText } from 'lucide-react';
import type { IngestedMappingItem } from './itemTypes';

export interface PriceDiffLeftPaneProps {
	readonly filteredItems: readonly IngestedMappingItem[];
	readonly hoveredRowId: string | null;
	readonly leftBodyRef: RefObject<HTMLDivElement | null>;
	readonly onLeftScroll: () => void;
	readonly onHoverRow: (id: string | null) => void;
}

export const PriceDiffLeftPane: React.FC<PriceDiffLeftPaneProps> = ({
	filteredItems,
	hoveredRowId,
	leftBodyRef,
	onLeftScroll,
	onHoverRow,
}) => {
	return (
		<section className="pricelist-diff-pane left-pane" aria-label="Исходный прейскурант клиники">
			<header className="pricelist-diff-pane-header">
				<div className="pricelist-diff-pane-title">
					<FileText size={13} style={{ flexShrink: 0 }} />
					<span className="pricelist-diff-pane-title-text">
						1. Исходный прейскурант клиники
					</span>
				</div>
				<span className="pricelist-diff-pane-counter">{`${filteredItems.length} строк`}</span>
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
						className={`pricelist-diff-raw-row ${hoveredRowId === item.id ? 'is-hovered' : ''}`}
						onMouseEnter={() => onHoverRow(item.id)}
						onMouseLeave={() => onHoverRow(null)}
						data-testid={`diff-raw-row-${item.id}`}
					>
						<span className="pricelist-diff-line-number">{`#${item.sourceLineNumber}`}</span>
						<div className="pricelist-diff-raw-text">{item.rawLine}</div>
					</div>
				))}

				{filteredItems.length === 0 && (
					<div
						style={{
							textAlign: 'center',
							padding: '2rem',
							color: 'var(--muted)',
							fontSize: '0.8125rem',
						}}
					>
						Нет строк, соответствующих выбранному фильтру
					</div>
				)}
			</div>
		</section>
	);
};
