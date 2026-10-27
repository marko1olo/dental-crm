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
				className="secondary-button h-7 min-h-[28px] px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 shadow-xs transition-colors"
				data-testid="alert-action-open-waybills"
				title="Оприходовать накладную поставщика и закрыть дефицит"
			>
				<Truck size={13} className="shrink-0 text-[var(--teal,#0d9488)]" />
				<span className="whitespace-nowrap">Приход накладной</span>
			</button>
		)}
		{onOpenBatchTracking && (
			<button
				type="button"
				onClick={onOpenBatchTracking}
				className="secondary-button h-7 min-h-[28px] px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 shadow-xs transition-colors"
				data-testid="alert-action-open-batches"
				title="Партионный учёт и контроль сроков годности FEFO"
			>
				<Layers
					size={13}
					className="text-[var(--teal,#0d9488)] shrink-0"
				/>
				<span className="whitespace-nowrap">Партии FEFO</span>
			</button>
		)}
		{onOpenInventoryAudit && (
			<button
				type="button"
				onClick={onOpenInventoryAudit}
				className="secondary-button h-7 min-h-[28px] px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 shadow-xs transition-colors"
				data-testid="alert-action-open-audit"
				title="Провести инвентаризацию и сверку остатков"
			>
				<FileText
					size={13}
					className="text-[var(--teal,#0d9488)] shrink-0"
				/>
				<span className="whitespace-nowrap">Инвентаризация</span>
			</button>
		)}
	</div>
);
