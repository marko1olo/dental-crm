import { Minus, Plus } from "lucide-react";
import React from "react";
import type { InventoryItem } from "../inventoryDataMappers.js";

export interface MobileSheetStepperProps {
	readonly activeSheetItem: InventoryItem;
	readonly sheetQuantity: number;
	readonly onStepQuantity: (delta: number) => void;
	readonly onSetQuantity: (val: number) => void;
}

export const MobileSheetStepper: React.FC<MobileSheetStepperProps> = ({
	activeSheetItem,
	sheetQuantity,
	onStepQuantity,
	onSetQuantity,
}) => {
	return (
		<div className="p-3.5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2.5">
			<div className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] text-center">
				Количество единиц:
			</div>
			<div className="flex items-center justify-center gap-3">
				<button
					type="button"
					onClick={() => onStepQuantity(-1)}
					className="min-w-[56px] min-h-[56px] w-14 h-14 rounded-2xl border-2 border-[var(--line)] bg-[var(--paper)] text-2xl font-black text-[var(--ink)] flex items-center justify-center cursor-pointer active:scale-95 shadow-xs transition-all"
					aria-label="Уменьшить количество"
					data-testid="stepper-minus-btn"
				>
					<Minus size={22} />
				</button>

				<div className="flex-1 text-center">
					<div className="text-3xl font-black font-mono text-[var(--ink)] tracking-tight">
						{sheetQuantity}
					</div>
					<div className="text-xs text-[var(--muted)] font-medium">
						{activeSheetItem.unit || "ед."}
					</div>
				</div>

				<button
					type="button"
					onClick={() => onStepQuantity(1)}
					className="min-w-[56px] min-h-[56px] w-14 h-14 rounded-2xl border-2 border-[var(--line)] bg-[var(--paper)] text-2xl font-black text-[var(--ink)] flex items-center justify-center cursor-pointer active:scale-95 shadow-xs transition-all"
					aria-label="Увеличить количество"
					data-testid="stepper-plus-btn"
				>
					<Plus size={22} />
				</button>
			</div>

			<div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
				{[1, 5, 10].map((val) => (
					<button
						key={val}
						type="button"
						onClick={() => onSetQuantity(val)}
						className={`min-h-[36px] px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
							sheetQuantity === val
								? "bg-[var(--teal)] text-white border-[var(--teal)]"
								: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)]"
						}`}
					>
						+{val}
					</button>
				))}
				{Number(activeSheetItem.stockQuantity ?? 0) > 0 && (
					<button
						type="button"
						onClick={() => onSetQuantity(Math.max(1, Number(activeSheetItem.stockQuantity)))}
						className="min-h-[36px] px-3 rounded-lg text-xs font-bold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)] transition-colors cursor-pointer"
					>
						Весь остаток ({activeSheetItem.stockQuantity})
					</button>
				)}
			</div>
		</div>
	);
};

export default MobileSheetStepper;
