import { Box, Printer, RotateCcw } from "lucide-react";
import type { DentalLabWorkflowOrder } from "../dentalLabWorkflowEngine";

export interface DentalLabOrderInspectFooterProps {
	readonly order: DentalLabWorkflowOrder;
	readonly onClose: () => void;
	readonly onPrintBlank: (order: DentalLabWorkflowOrder) => void;
	readonly onOpenWarrantyRework: (order: DentalLabWorkflowOrder) => void;
	readonly onView3DScan?: (order: DentalLabWorkflowOrder) => void;
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
					style={{
						color: "var(--bad-fg, #e11d48)",
						borderColor: "var(--bad-line, #fecdd3)",
						fontWeight: 700,
					}}
					onClick={() => onOpenWarrantyRework(order)}
					title="Оформить рекламацию"
				>
					<RotateCcw size={14} />
					<span>Рекламация</span>
				</button>
			)}
			{onView3DScan && (
				<button
					type="button"
					className="ztl-btn-secondary"
					data-testid="ztl-details-view-3d-scan-btn"
					style={{
						color: "var(--teal, #0d9488)",
						borderColor: "var(--teal-line, #99f6e4)",
						fontWeight: 700,
					}}
					onClick={() => onView3DScan(order)}
					title="Открыть 3D-скан челюсти"
				>
					<Box size={14} />
					<span>3D-скан (STL/PLY)</span>
				</button>
			)}
			<button
				type="button"
				className="ztl-btn-secondary"
				onClick={() => onPrintBlank(order)}
			>
				<Printer size={14} />
				<span>Распечатать А4</span>
			</button>
			<button type="button" className="ztl-btn-primary" onClick={onClose}>
				Закрыть
			</button>
		</footer>
	);
}
