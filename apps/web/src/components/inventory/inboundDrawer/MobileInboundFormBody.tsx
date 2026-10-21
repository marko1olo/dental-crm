import { CheckCircle2 } from "lucide-react";
import React from "react";
import type { InventoryItem } from "../inventoryDataMappers.js";
import { MobileInboundQuantitySection } from "./MobileInboundQuantitySection.js";

export interface MobileInboundFormBodyProps {
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
	readonly onClose: () => void;
	readonly triggerHaptic: () => void;
}

export const MobileInboundFormBody: React.FC<MobileInboundFormBodyProps> = ({
	drawerTargetItem, items, drawerQuantity, setDrawerQuantity, drawerLotNumber, setDrawerLotNumber,
	drawerExpDate, setDrawerExpDate, onSelectTargetItem, onSubmitInbound, isSubmittingInbound,
	onOpenInboundInvoice, onClose, triggerHaptic,
}) => {
	return (
		<form onSubmit={onSubmitInbound} className="mobile-inventory-drawer-body">
			{!drawerTargetItem && (
				<div className="mobile-inventory-field-group">
					<label className="mobile-inventory-field-label">Материал со склада</label>
					<select
						className="mobile-inventory-field-input"
						value={drawerTargetItem ? (drawerTargetItem as InventoryItem).id : ""}
						onChange={(e) => {
							const found = items.find((it) => it.id === e.target.value);
							if (found) {
								onSelectTargetItem(found);
							}
						}}
						data-testid="drawer-material-select"
					>
						<option value="">-- Выберите материал для пополнения --</option>
						{items.map((it) => (
							<option key={it.id} value={it.id}>
								{it.name} (остаток: {it.stockQuantity} {it.unit || "шт."})
							</option>
						))}
					</select>
				</div>
			)}

			<MobileInboundQuantitySection
				drawerQuantity={drawerQuantity}
				setDrawerQuantity={setDrawerQuantity}
				triggerHaptic={triggerHaptic}
			/>

			<div className="grid grid-cols-2 gap-3">
				<div className="mobile-inventory-field-group">
					<label className="mobile-inventory-field-label">Партия / Серия</label>
					<input
						type="text"
						className="mobile-inventory-field-input"
						value={drawerLotNumber}
						onChange={(e) => setDrawerLotNumber(e.target.value)}
						placeholder="LOT-2026..."
						data-testid="drawer-input-lot"
					>
					</input>
				</div>

				<div className="mobile-inventory-field-group">
					<label className="mobile-inventory-field-label">Срок годности (FEFO)</label>
					<input
						type="date"
						className="mobile-inventory-field-input"
						value={drawerExpDate}
						onChange={(e) => setDrawerExpDate(e.target.value)}
						data-testid="drawer-input-expdate"
					/>
				</div>
			</div>

			<div className="mobile-inventory-drawer-footer">
				<button
					type="submit"
					disabled={isSubmittingInbound}
					className="mobile-inventory-drawer-submit"
					data-testid="drawer-btn-submit"
				>
					<CheckCircle2 size={20} aria-hidden="true" />
					<span>
						{isSubmittingInbound
							? "Приём на склад..."
							: `Принять на склад • +${drawerQuantity} шт`}
					</span>
				</button>

				{onOpenInboundInvoice && (
					<button
						type="button"
						className="mobile-inventory-drawer-secondary-link"
						onClick={() => {
							onClose();
							onOpenInboundInvoice();
						}}
					>
						Оформить приходную накладную поставщика
					</button>
				)}
			</div>
		</form>
	);
};

export default MobileInboundFormBody;
