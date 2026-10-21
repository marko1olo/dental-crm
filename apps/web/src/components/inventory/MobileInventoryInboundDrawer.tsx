/**
 * MobileInventoryInboundDrawer.tsx
 * DENTE Dental CRM — Нативная iOS Bottom Sheet шторка оприходования партии материалов.
 * Apple HIG Touch Ergonomics, Мандаты 8b, 8e, 8n.
 * Декомпозирован до <= 120 строк.
 */

import { X } from "lucide-react";
import React from "react";
import type { InventoryItem } from "./inventoryDataMappers.js";
import { MobileInboundFormBody } from "./inboundDrawer/MobileInboundFormBody.js";

export interface MobileInventoryInboundDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly drawerTargetItem: InventoryItem | null;
	readonly items: readonly InventoryItem[];
	readonly drawerQuantity: number;
	readonly setDrawerQuantity: React.Dispatch<React.SetStateAction<number>>;
	readonly drawerLotNumber: string;
	readonly setDrawerLotNumber: (val: string) => void;
	readonly drawerExpDate: string;
	readonly setDrawerExpDate: (val: string) => void;
	readonly onSelectTargetItem: (it: InventoryItem) => void;
	readonly onSubmitInbound: (e: React.FormEvent) => void;
	readonly isSubmittingInbound: boolean;
	readonly onOpenInboundInvoice?: (() => void) | undefined;
	readonly triggerHaptic: () => void;
}

export const MobileInventoryInboundDrawer: React.FC<
	MobileInventoryInboundDrawerProps
> = ({
	isOpen,
	onClose,
	drawerTargetItem,
	items,
	drawerQuantity,
	setDrawerQuantity,
	drawerLotNumber,
	setDrawerLotNumber,
	drawerExpDate,
	setDrawerExpDate,
	onSelectTargetItem,
	onSubmitInbound,
	isSubmittingInbound,
	onOpenInboundInvoice,
	triggerHaptic,
}) => {
	if (!isOpen) return null;

	return (
		<div
			className="mobile-inventory-drawer-backdrop"
			onClick={onClose}
			data-testid="mobile-inventory-drawer-backdrop"
		>
			<div
				className="mobile-inventory-drawer-surface"
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
				aria-label="Оприходование партии на склад"
				data-testid="mobile-inventory-drawer"
			>
				{/* Tactile Drag Handle */}
				<div className="mobile-inventory-drag-handle-wrap">
					<div className="mobile-inventory-drag-handle" />
				</div>

				{/* Drawer Header */}
				<div className="mobile-inventory-drawer-header">
					<div>
						<h2 className="mobile-inventory-drawer-title">
							Оприходовать партию
						</h2>
						<p className="text-xs text-[var(--muted)] m-0">
							{drawerTargetItem
								? drawerTargetItem.name
								: "Поступление расходных материалов"}
						</p>
					</div>

					<button
						type="button"
						className="mobile-inventory-drawer-close"
						onClick={onClose}
						aria-label="Закрыть шторку"
					>
						<X size={18} aria-hidden="true" />
					</button>
				</div>

				<MobileInboundFormBody
					drawerTargetItem={drawerTargetItem}
					items={items}
					drawerQuantity={drawerQuantity}
					setDrawerQuantity={setDrawerQuantity}
					drawerLotNumber={drawerLotNumber}
					setDrawerLotNumber={setDrawerLotNumber}
					drawerExpDate={drawerExpDate}
					setDrawerExpDate={setDrawerExpDate}
					onSelectTargetItem={onSelectTargetItem}
					onSubmitInbound={onSubmitInbound}
					isSubmittingInbound={isSubmittingInbound}
					onOpenInboundInvoice={onOpenInboundInvoice}
					onClose={onClose}
					triggerHaptic={triggerHaptic}
				/>
			</div>
		</div>
	);
};

export default MobileInventoryInboundDrawer;
