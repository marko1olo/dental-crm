import { FileText, Layers, Truck } from "lucide-react";
import type React from "react";

export interface WarehouseStockAlertsActionsProps {
	readonly onOpenWaybills?: (() => void) | undefined;
	readonly onOpenBatchTracking?: (() => void) | undefined;
	readonly onOpenInventoryAudit?: (() => void) | undefined;
}

export const WarehouseStockAlertsActions: React.FC<
	WarehouseStockAlertsActionsProps
> = ({ onOpenWaybills, onOpenBatchTracking, onOpenInventoryAudit }) => (
	<div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
		{onOpenWaybills && (
			<button
				type="button"
				onClick={onOpenWaybills}
				className="primary-button text-xs font-semibold cursor-pointer"
				data-testid="alert-action-open-waybills"
				title="Оприходовать накладную поставщика и закрыть дефицит"
			>
				<Truck size={14} className="shrink-0" />
				<span className="whitespace-nowrap">Приход накладной</span>
			</button>
		)}
		{onOpenBatchTracking && (
			<button
				type="button"
				onClick={onOpenBatchTracking}
				className="secondary-button text-xs font-semibold cursor-pointer"
				data-testid="alert-action-open-batches"
				title="Партионный учёт и контроль сроков годности FEFO"
			>
				<Layers
					size={14}
					className="text-teal-600 dark:text-teal-400 shrink-0"
				/>
				<span className="whitespace-nowrap">Партии FEFO</span>
			</button>
		)}
		{onOpenInventoryAudit && (
			<button
				type="button"
				onClick={onOpenInventoryAudit}
				className="secondary-button text-xs font-semibold cursor-pointer"
				data-testid="alert-action-open-audit"
				title="Провести инвентаризацию и сверку остатков"
			>
				<FileText
					size={14}
					className="text-teal-600 dark:text-teal-400 shrink-0"
				/>
				<span className="whitespace-nowrap">Инвентаризация</span>
			</button>
		)}
	</div>
);
