import { ArrowDownToLine, Plus } from "lucide-react";
import React from "react";

export interface MobileInventoryBottomBarProps {
	readonly onOpenInboundDrawer: () => void;
	readonly onOpenInboundInvoice?: (() => void) | undefined;
}

export const MobileInventoryBottomBar: React.FC<MobileInventoryBottomBarProps> = ({
	onOpenInboundDrawer,
	onOpenInboundInvoice,
}) => {
	return (
		<div className="mobile-inventory-bottom-bar" data-testid="mobile-inventory-bottom-bar">
			<button
				type="button"
				className="mobile-inventory-primary-fab cursor-pointer"
				onClick={onOpenInboundDrawer}
				data-testid="mobile-btn-inbound-batch"
				aria-label="Оприходовать партию материалов (+ Приход)"
			>
				<Plus size={20} aria-hidden="true" />
				<span>+ Приход (Оприходовать партию)</span>
			</button>

			{onOpenInboundInvoice && (
				<button
					type="button"
					className="mobile-inventory-secondary-btn cursor-pointer"
					onClick={onOpenInboundInvoice}
					title="Приходные накладные поставщиков"
					aria-label="Открыть накладные"
					data-testid="mobile-btn-waybills"
				>
					<ArrowDownToLine size={18} aria-hidden="true" />
					<span className="hidden sm:inline">Накладные</span>
				</button>
			)}
		</div>
	);
};
