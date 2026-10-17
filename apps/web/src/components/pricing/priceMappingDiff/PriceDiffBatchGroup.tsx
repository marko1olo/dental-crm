import React from 'react';

export interface PriceDiffBatchGroupProps {
	readonly onBatchMarkup: (percent: number) => void;
	readonly onBatchRounding: (roundTo?: number | undefined) => void;
	readonly onBatchSetZero: () => void;
}

export const PriceDiffBatchGroup: React.FC<PriceDiffBatchGroupProps> = ({
	onBatchMarkup,
	onBatchRounding,
	onBatchSetZero,
}) => {
	return (
		<div className="pricelist-diff-toolbar-middle">
			<div className="pricelist-diff-batch-group">
				<span
					className="pricelist-diff-batch-label"
					title="Пакетные операции с ценами выбранных позиций"
				>
					Пакетно:
				</span>
				<button
					type="button"
					className="pricelist-diff-batch-btn"
					onClick={() => onBatchMarkup(5)}
					title="Прибавить 5% к ценам"
				>
					+5%
				</button>
				<button
					type="button"
					className="pricelist-diff-batch-btn"
					onClick={() => onBatchMarkup(10)}
					title="Прибавить 10% к ценам"
				>
					+10%
				</button>
				<button
					type="button"
					className="pricelist-diff-batch-btn warranty"
					onClick={onBatchSetZero}
					title="Установить 0 ₽ (Гарантия) для выбранных услуг"
				>
					0 ₽ (Гарантия)
				</button>
				<button
					type="button"
					className="pricelist-diff-batch-btn"
					onClick={() => onBatchRounding(100)}
					title="Округлить цены до 100 ₽"
				>
					До 100 ₽
				</button>
				<button
					type="button"
					className="pricelist-diff-batch-btn"
					onClick={() => onBatchRounding(500)}
					title="Округлить цены до 500 ₽"
				>
					До 500 ₽
				</button>
			</div>
		</div>
	);
};
