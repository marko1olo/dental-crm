import { MoreHorizontal } from "lucide-react";
import React from "react";
import type { InventoryItem } from "../inventoryDataMappers.js";
import { MobileStockCardMenu } from "./MobileStockCardMenu.js";

export interface MobileStockCardHeaderProps {
	readonly item: InventoryItem;
	readonly catInfo: { label: string; className: string };
	readonly isMenuOpen: boolean;
	readonly onToggleMenu: () => void;
	readonly onCloseMenu: () => void;
	readonly onSelectItem?: ((item: InventoryItem) => void) | undefined;
	readonly onOpenSheet: (item: InventoryItem) => void;
	readonly onOpenWarehouseManager?: (() => void) | undefined;
	readonly onOpenInventoryAudit?: (() => void) | undefined;
	readonly onEditItem?: ((item: InventoryItem) => void) | undefined;
	readonly onDeleteItem?: ((id: string, name: string) => void) | undefined;
}

export const MobileStockCardHeader: React.FC<MobileStockCardHeaderProps> = ({
	item, catInfo, isMenuOpen, onToggleMenu, onCloseMenu, onSelectItem,
	onOpenSheet, onOpenWarehouseManager, onOpenInventoryAudit, onEditItem, onDeleteItem,
}) => {
	return (
		<div className="flex items-start justify-between gap-2">
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5 flex-wrap">
					<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${catInfo.className}`}>
						{catInfo.label}
					</span>
					{item.lotNumber && (
						<span className="text-[10px] font-mono text-[var(--muted)] font-medium">
							Партия: #{item.lotNumber}
						</span>
					)}
				</div>
				<h4
					className="text-sm font-bold text-[var(--ink)] leading-snug mt-1 cursor-pointer hover:text-[var(--teal)] transition-colors"
					onClick={() => (onSelectItem ? onSelectItem(item) : onOpenSheet(item))}
				>
					{item.name}
				</h4>
				{(item.sku || item.barcode) && (
					<div className="text-[10px] text-[var(--muted)] font-mono flex items-center gap-2 mt-0.5">
						{item.sku && <span>SKU: {item.sku}</span>}
						{item.barcode && <span>ШК: {item.barcode}</span>}
					</div>
				)}
			</div>

			<div className="relative shrink-0">
				<button
					type="button"
					onClick={onToggleMenu}
					className="min-h-[44px] min-w-[44px] rounded-xl text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center bg-[var(--paper-soft)] border border-[var(--line)] cursor-pointer"
					aria-label="Действия с материалом"
				>
					<MoreHorizontal size={16} />
				</button>
				<MobileStockCardMenu
					item={item}
					isMenuOpen={isMenuOpen}
					onCloseMenu={onCloseMenu}
					onOpenWarehouseManager={onOpenWarehouseManager}
					onOpenInventoryAudit={onOpenInventoryAudit}
					onEditItem={onEditItem}
					onDeleteItem={onDeleteItem}
				/>
			</div>
		</div>
	);
};

export default MobileStockCardHeader;
