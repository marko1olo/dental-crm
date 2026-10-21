import React from "react";

export interface StockRowStepperProps {
	readonly itemId: string;
	readonly writeQty: number;
	readonly onStepQuantity?: ((delta: number) => void) | undefined;
	readonly onChangeQuantity?: ((val: number) => void) | undefined;
}

export const StockRowStepper: React.FC<StockRowStepperProps> = ({
	itemId,
	writeQty,
	onStepQuantity,
	onChangeQuantity,
}) => {
	return (
		<div className="inline-flex items-center border border-[var(--line)] rounded-lg bg-[var(--paper)] h-7 overflow-hidden shrink-0 shadow-xs mr-0.5">
			<button
				type="button"
				onClick={() => onStepQuantity?.(-1)}
				className="w-5 h-full flex items-center justify-center hover:bg-[var(--paper-soft)] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer text-xs font-bold transition-colors select-none"
				title="Уменьшить количество на 1"
				data-testid={`btn-qty-minus-${itemId}`}
			>
				−
			</button>
			<input
				type="number"
				min="1"
				value={writeQty}
				onChange={(e) =>
					onChangeQuantity?.(Math.max(1, Number.parseInt(e.target.value, 10) || 1))
				}
				className="w-8 h-full text-center text-xs font-bold bg-transparent text-[var(--ink)] border-x border-[var(--line)] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
				title="Количество для списания или оприходования"
				data-testid={`input-qty-${itemId}`}
			/>
			<button
				type="button"
				onClick={() => onStepQuantity?.(1)}
				className="w-5 h-full flex items-center justify-center hover:bg-[var(--paper-soft)] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer text-xs font-bold transition-colors select-none"
				title="Увеличить количество на 1"
				data-testid={`btn-qty-plus-${itemId}`}
			>
				+
			</button>
		</div>
	);
};

export default StockRowStepper;
