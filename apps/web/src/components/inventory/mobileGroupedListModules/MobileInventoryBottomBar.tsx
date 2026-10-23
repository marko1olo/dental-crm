import { ArrowDownToLine, PackageCheck, Plus, QrCode } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";

export interface MobileInventoryBottomBarProps {
	readonly onOpenInboundDrawer: () => void;
	readonly onOpenInboundInvoice?: (() => void) | undefined;
	readonly onOpenShiftDeduction?: (() => void) | undefined;
	readonly onOpenMdlpScanning?: (() => void) | undefined;
}

export const MobileInventoryBottomBar: React.FC<MobileInventoryBottomBarProps> = ({
	onOpenInboundDrawer,
	onOpenInboundInvoice,
	onOpenShiftDeduction,
	onOpenMdlpScanning,
}) => {
	const barElement = (
		<div className="mobile-inventory-bottom-bar" data-testid="mobile-inventory-bottom-bar">
			<button
				type="button"
				className="mobile-inventory-primary-fab cursor-pointer"
				onClick={onOpenInboundDrawer}
				data-testid="mobile-btn-inbound-batch"
				aria-label="Оприходовать партию материалов (+ Приход)"
			>
				<Plus size={20} aria-hidden="true" />
				<span>+ Приход</span>
			</button>

			{onOpenMdlpScanning && (
				<button
					type="button"
					className="mobile-inventory-secondary-btn cursor-pointer"
					onClick={onOpenMdlpScanning}
					title="Маркированные медикаменты Честный Знак / МДЛП"
					aria-label="Маркировка"
					data-testid="mobile-btn-mdlp-trigger"
				>
					<QrCode size={18} aria-hidden="true" />
					<span>МДЛП</span>
				</button>
			)}

			{onOpenShiftDeduction && (
				<button
					type="button"
					className="mobile-inventory-shift-btn cursor-pointer"
					onClick={onOpenShiftDeduction}
					title="Пакетное списание расходников за смену в 1 клик"
					aria-label="Списать смену"
					data-testid="mobile-btn-shift-deduction"
				>
					<PackageCheck size={18} aria-hidden="true" />
					<span>Смена</span>
				</button>
			)}

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

	if (typeof document !== "undefined" && document.body) {
		return createPortal(barElement, document.body);
	}

	return barElement;
};
