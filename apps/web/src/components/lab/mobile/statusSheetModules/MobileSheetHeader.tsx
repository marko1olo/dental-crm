import React from "react";
import { X } from "lucide-react";
import type { DentalLabOrderData } from "../../labMath";

export interface MobileSheetHeaderProps {
	order: DentalLabOrderData;
	onClose: () => void;
}

export function MobileSheetHeader({ order, onClose }: MobileSheetHeaderProps): React.JSX.Element {
	const orderNumDisplay = (order as any).orderNumber || (order.id ? `#${order.id.slice(0, 8)}` : "ЗТЛ");
	const toothDisplay = order.toothFdi
		? `Зуб ${order.toothFdi}`
		: order.selectedTeeth?.length
			? `Зуб ${order.selectedTeeth.join(", ")}`
			: "Челюсть";

	return (
		<>
			<div className="mobile-lab-drag-handle" />
			<div className="mobile-lab-sheet-header">
				<div className="min-w-0 flex-1">
					<div className="mobile-lab-sheet-title truncate">
						{order.patientName || "Пациент"}
					</div>
					<div className="mobile-lab-sheet-subtitle flex items-center gap-2">
						<span className="font-mono font-bold text-[var(--teal,#0d9488)]">
							{orderNumDisplay}
						</span>
						<span>•</span>
						<span>{toothDisplay}</span>
					</div>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="mobile-lab-sheet-close-btn mobile-lab-sheet-close"
					aria-label="Закрыть"
					data-testid="mobile-lab-sheet-close-btn"
				>
					<X size={18} />
				</button>
			</div>
		</>
	);
}
