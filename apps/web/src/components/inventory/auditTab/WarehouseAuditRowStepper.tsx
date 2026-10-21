import type React from "react";
import type { WarehouseAuditItemLine } from "../warehouseInventoryEngine.js";

export interface WarehouseAuditRowStepperProps {
	readonly it: WarehouseAuditItemLine;
	readonly onQuantityChange: (itemId: string, newActual: number) => void;
}

export const WarehouseAuditRowStepper: React.FC<WarehouseAuditRowStepperProps> = ({
	it,
	onQuantityChange,
}) => {
	return (
		<td style={{ textAlign: "center" }}>
			<div className="flex items-center justify-center gap-1.5 flex-nowrap">
				<div className="warehouse-qty-stepper shrink-0">
					<button
						type="button"
						className="warehouse-qty-stepper-btn"
						onClick={() => onQuantityChange(it.itemId, it.actualQuantity - 1)}
						aria-label="Уменьшить фактическое количество"
					>
						-
					</button>
					<input
						type="number"
						className="warehouse-qty-input font-mono font-bold"
						value={it.actualQuantity}
						min={0}
						onChange={(e) =>
							onQuantityChange(it.itemId, Number.parseInt(e.target.value, 10) || 0)
						}
						data-testid={`input-audit-actual-${it.itemId}`}
					/>
					<button
						type="button"
						className="warehouse-qty-stepper-btn"
						onClick={() => onQuantityChange(it.itemId, it.actualQuantity + 1)}
						aria-label="Увеличить фактическое количество"
					>
						+
					</button>
				</div>
				<button
					type="button"
					onClick={() => onQuantityChange(it.itemId, it.bookQuantity)}
					className={`h-7 px-2 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer inline-flex items-center gap-1 shrink-0 ${
						it.actualQuantity === it.bookQuantity
							? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
							: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
					}`}
					title="Приравнять факт к учету (✓ Совпадает с учётом)"
					data-testid={`btn-audit-match-${it.itemId}`}
				>
					✓ Совпадает
				</button>
			</div>
		</td>
	);
};
