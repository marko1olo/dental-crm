import React from "react";
import { Box, Printer, RotateCcw } from "lucide-react";
import type { DentalLabWorkflowOrder } from "../dentalLabWorkflowEngine";

export interface DentalLabOrderInspectFooterProps {
	readonly order: DentalLabWorkflowOrder;
	readonly onClose: () => void;
	readonly onPrintBlank: (order: DentalLabWorkflowOrder) => void;
	readonly onOpenWarrantyRework: (order: DentalLabWorkflowOrder) => void;
	readonly onView3DScan?: ((order: DentalLabWorkflowOrder) => void) | undefined;
}

export function DentalLabOrderInspectFooter({
	order,
	onClose,
	onPrintBlank,
	onOpenWarrantyRework,
	onView3DScan,
}: DentalLabOrderInspectFooterProps) {
	return (
		<footer className="ztl-detail-footer">
			{order.currentStage === "installed_completed" && (
				<button
					type="button"
					className="ztl-btn-secondary"
					onClick={() => onOpenWarrantyRework(order)}
					title="Оформить рекламацию"
				>
					<RotateCcw size={14} className="text-[var(--bad-fg,#e11d48)]" />
					<span>Рекламация</span>
				</button>
			)}
			{onView3DScan && (
				<button
					type="button"
					className="ztl-btn-secondary"
					data-testid="ztl-details-view-3d-scan-btn"
					onClick={() => onView3DScan(order)}
					title="Открыть 3D-скан челюсти"
				>
					<Box size={14} className="text-[var(--muted)]" />
					<span>3D-скан (STL/PLY)</span>
				</button>
			)}
			<button
				type="button"
				className="ztl-btn-secondary"
				onClick={() => onPrintBlank(order)}
			>
				<Printer size={14} className="text-[var(--muted)]" />
				<span>Распечатать А4</span>
			</button>
			<button type="button" className="ztl-btn-secondary font-bold" onClick={onClose}>
				Закрыть
			</button>
		</footer>
	);
}
