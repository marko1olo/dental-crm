import { AlertCircle, AlertTriangle } from "lucide-react";
import type React from "react";
import type { WarehouseTransferLineItem } from "./warehouseTransferEngine.js";

export interface WarehouseTransferAlertsProps {
	readonly isValid: boolean;
	readonly validationErrors: readonly string[];
	readonly hasOverdraft: boolean;
	readonly overdraftItems: readonly WarehouseTransferLineItem[];
	readonly getAvailableStock: (itemId: string) => number;
}

export const WarehouseTransferAlerts: React.FC<WarehouseTransferAlertsProps> = ({
	isValid,
	validationErrors,
	hasOverdraft,
	overdraftItems,
	getAvailableStock,
}) => {
	return (
		<>
			{!isValid && (
				<div className="p-3 rounded-lg bg-bad-bg text-bad-fg text-xs flex items-center gap-2">
					<AlertTriangle size={16} className="shrink-0" />
					<span>{validationErrors.join("; ")}</span>
				</div>
			)}

			{hasOverdraft && (
				<div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
					<AlertCircle size={16} className="shrink-0 text-amber-600 mt-0.5" />
					<div className="flex-1">
						<div className="font-bold text-amber-900 dark:text-amber-100 flex items-center gap-1.5 flex-wrap">
							<span>Внимание: остаток отрицательный, требуется оприходование накладной</span>
							<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200">
								Списание с дефицитом
							</span>
						</div>
						<div className="text-muted mt-0.5 leading-relaxed">
							Позиции с дефицитом:{" "}
							{overdraftItems.map((it) => {
								const stock = getAvailableStock(it.itemId);
								const req = it.dispatchedQuantity > 0 ? it.dispatchedQuantity : it.requestedQuantity;
								return `«${it.nameRu}» (в наличии ${stock} ${it.unitRu}, требуется ${req} ${it.unitRu}, дефицит ${req - stock} ${it.unitRu})`;
							}).join("; ")}
							. Перемещение учтено с дефицитом для последующего оприходования.
						</div>
					</div>
				</div>
			)}
		</>
	);
};
