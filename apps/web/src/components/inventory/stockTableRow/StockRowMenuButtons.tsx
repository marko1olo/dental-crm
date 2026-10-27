import { ArrowDownToLine, Printer, QrCode, ShieldCheck, TrendingUp } from "lucide-react";
import React from "react";
import { showToast } from "../../GlobalToast.js";
import type { InventoryItem } from "../inventoryDataMappers.js";
import { StockRowEditDeleteButtons } from "./StockRowEditDeleteButtons.js";

export interface StockRowMenuButtonsProps {
	readonly item: InventoryItem;
	readonly writeQty?: number | undefined;
	readonly onCloseMenu: () => void;
	readonly onReceiveItem?: ((item: InventoryItem, qty: number) => void) | undefined;
	readonly onOpenWarehouseManager?: (() => void) | undefined;
	readonly onOpenInventoryAudit?: (() => void) | undefined;
	readonly onEditItem?: ((item: InventoryItem) => void) | undefined;
	readonly onDeleteItem?: ((id: string, name: string) => void) | undefined;
}

export const StockRowMenuButtons: React.FC<StockRowMenuButtonsProps> = ({
	item,
	writeQty = 1,
	onCloseMenu,
	onReceiveItem,
	onOpenWarehouseManager,
	onOpenInventoryAudit,
	onEditItem,
	onDeleteItem,
}) => {
	const handleCopyBarcode = () => {
		onCloseMenu();
		if (item.barcode) {
			navigator.clipboard?.writeText(item.barcode);
			showToast(`Штрихкод скопирован: ${item.barcode}`, "info");
		} else {
			showToast("У позиции нет штрихкода (задайте в редактировании)", "info");
		}
	};

	const handlePrintLabel = () => {
		onCloseMenu();
		showToast(`Печать этикетки «${item.name}» (штрихкод: ${item.barcode || "б/ш"}) отправлена`, "info");
	};

	return (
		<>
			{onReceiveItem && (
				<button
					type="button"
					onClick={() => {
						onCloseMenu();
						onReceiveItem(item, writeQty);
					}}
					className="w-full px-2.5 py-1.5 rounded-lg text-xs text-left font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
					role="menuitem"
					title={`Оприходовать материал на склад (+${writeQty})`}
					data-testid={`btn-item-arrival-${item.id}`}
				>
					<ArrowDownToLine size={13} className="text-[var(--ink-muted)] shrink-0" />
					<span>Оприходовать (+{writeQty})</span>
				</button>
			)}

			<button
				type="button"
				onClick={handleCopyBarcode}
				className="w-full px-2.5 py-1.5 rounded-lg text-xs text-left font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
				role="menuitem"
			>
				<QrCode size={13} className="text-[var(--ink-muted)] shrink-0" />
				<span>Штрихкод {item.barcode ? `(${item.barcode})` : ""}</span>
			</button>

			{onOpenWarehouseManager && (
				<button
					type="button"
					onClick={() => {
						onCloseMenu();
						onOpenWarehouseManager();
					}}
					className="w-full px-2.5 py-1.5 rounded-lg text-xs text-left font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
					role="menuitem"
				>
					<TrendingUp size={13} className="text-[var(--ink-muted)] shrink-0" />
					<span>История движений</span>
				</button>
			)}

			<button
				type="button"
				onClick={handlePrintLabel}
				className="w-full px-2.5 py-1.5 rounded-lg text-xs text-left font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
				role="menuitem"
			>
				<Printer size={13} className="text-[var(--ink-muted)] shrink-0" />
				<span>Печать этикетки</span>
			</button>

			{onOpenInventoryAudit && (
				<button
					type="button"
					onClick={() => {
						onCloseMenu();
						onOpenInventoryAudit();
					}}
					className="w-full px-2.5 py-1.5 rounded-lg text-xs text-left font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
					role="menuitem"
				>
					<ShieldCheck size={13} className="text-[var(--ink-muted)] shrink-0" />
					<span>Инвентаризация (сверка)</span>
				</button>
			)}

			<StockRowEditDeleteButtons
				item={item}
				onCloseMenu={onCloseMenu}
				onEditItem={onEditItem}
				onDeleteItem={onDeleteItem}
			/>
		</>
	);
};

export default StockRowMenuButtons;
