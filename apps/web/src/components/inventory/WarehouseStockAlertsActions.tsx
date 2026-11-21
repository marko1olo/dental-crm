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
				className="secondary-button h-8 px-2.5 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer inline-flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
				data-testid="alert-action-open-waybills"
				title="Оприходовать накладную поставщика и закрыть дефицит"
			>
				<Truck className="w-3.5 h-3.5 shrink-0 text-[var(--primary)]" />
				<span className="whitespace-nowrap">Приход накладной</span>
			</button>
		)}
		{onOpenBatchTracking && (
			<button
				type="button"
				onClick={onOpenBatchTracking}
				className="secondary-button h-8 px-2.5 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer inline-flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
				data-testid="alert-action-open-batches"
				title="Партионный учёт и контроль сроков годности FEFO"
			>
				<Layers className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
				<span className="whitespace-nowrap">Партии FEFO</span>
			</button>
		)}
		{onOpenInventoryAudit && (
			<button
				type="button"
				onClick={onOpenInventoryAudit}
				className="secondary-button h-8 px-2.5 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer inline-flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
				data-testid="alert-action-open-audit"
				title="Провести инвентаризацию и сверку остатков"
			>
				<FileText className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
				<span className="whitespace-nowrap">Инвентаризация</span>
			</button>
		)}
	</div>
);
