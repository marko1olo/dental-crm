import React from 'react';
import type { IngestedMappingItem } from './itemTypes';

export interface PriceDiffRowPriceColProps {
	readonly item: IngestedMappingItem;
	readonly editingPriceId: string | null;
	readonly editingPriceBuffer: string;
	readonly onStartEditPrice: () => void;
	readonly onPriceBufferChange: (val: string) => void;
	readonly onCommitPrice: (val: string) => void;
	readonly onCancelEditPrice: () => void;
	readonly onModifyDelta: (deltaRub: number) => void;
	readonly onSetZeroPrice: () => void;
	readonly formatPrice: (rub: number) => string;
}

export const PriceDiffRowPriceCol: React.FC<PriceDiffRowPriceColProps> = ({
	item,
	editingPriceId,
	editingPriceBuffer,
	onStartEditPrice,
	onPriceBufferChange,
	onCommitPrice,
	onCancelEditPrice,
	onModifyDelta,
	onSetZeroPrice,
	formatPrice,
}) => {
	const isWarranty = item.priceRub === 0;
	const isEditingPrice = editingPriceId === item.id;

	return (
		<div className="pricelist-diff-price-col">
			{isEditingPrice ? (
				<div className="pricelist-diff-inline-input-box">
					<input
						type="text"
						inputMode="numeric"
						className="pricelist-diff-price-input"
						autoFocus
						value={editingPriceBuffer}
						onChange={(e) => onPriceBufferChange(e.target.value.replace(/[^\d]/g, ''))}
						onKeyDown={(e) => {
							if (e.key === 'Enter') onCommitPrice(editingPriceBuffer);
							else if (e.key === 'Escape') onCancelEditPrice();
						}}
						onBlur={() => onCommitPrice(editingPriceBuffer)}
					/>
					<span style={{ fontSize: '0.6875rem', color: 'var(--muted)' }}>₽</span>
				</div>
			) : (
				<button
					type="button"
					className={`pricelist-diff-price-btn ${isWarranty ? 'warranty' : ''}`}
					onClick={onStartEditPrice}
					title="Кликните для изменения цены вручную"
				>
					<span>{isWarranty ? '0 ₽ (Гарантия)' : formatPrice(item.priceRub)}</span>
				</button>
			)}

			<div className="pricelist-diff-price-modifiers">
				<button
					type="button"
					className="pricelist-diff-delta-btn"
					onClick={() => onModifyDelta(-500)}
					title="Вычесть 500 ₽"
				>
					-500 ₽
				</button>
				<button
					type="button"
					className="pricelist-diff-delta-btn"
					onClick={() => onModifyDelta(-100)}
					title="Вычесть 100 ₽"
				>
					-100 ₽
				</button>
				<button
					type="button"
					className="pricelist-diff-delta-btn"
					onClick={() => onModifyDelta(100)}
					title="Прибавить 100 ₽"
				>
					+100 ₽
				</button>
				<button
					type="button"
					className="pricelist-diff-delta-btn"
					onClick={() => onModifyDelta(500)}
					title="Прибавить 500 ₽"
				>
					+500 ₽
				</button>
				<button
					type="button"
					className={`pricelist-diff-delta-btn warranty ${isWarranty ? 'active' : ''}`}
					onClick={onSetZeroPrice}
					title="Установить 0 ₽ (Гарантия / Бесплатно)"
				>
					0 ₽
				</button>
			</div>
		</div>
	);
};
