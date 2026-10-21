import { MoreHorizontal } from "lucide-react";
import React from "react";
import type { InventoryItem } from "../inventoryDataMappers.js";
import { StockRowMenuButtons } from "./StockRowMenuButtons.js";

export interface StockRowActionsMenuProps {
	readonly item: InventoryItem;
	readonly isMenuOpen: boolean;
	readonly menuRef?: React.RefObject<HTMLDivElement | null> | undefined;
	readonly onToggleMenu: () => void;
	readonly onCloseMenu: () => void;
	readonly onOpenWarehouseManager?: (() => void) | undefined;
	readonly onOpenInventoryAudit?: (() => void) | undefined;
	readonly onEditItem?: ((item: InventoryItem) => void) | undefined;
	readonly onDeleteItem?: ((id: string, name: string) => void) | undefined;
}

export const StockRowActionsMenu: React.FC<StockRowActionsMenuProps> = ({
	item,
	isMenuOpen,
	menuRef,
	onToggleMenu,
	onCloseMenu,
	onOpenWarehouseManager,
	onOpenInventoryAudit,
	onEditItem,
	onDeleteItem,
}) => {
	return (
		<div className="relative inline-block shrink-0">
			<button
				type="button"
				onClick={onToggleMenu}
				className="w-7 h-7 rounded-lg text-xs transition-all cursor-pointer inline-flex items-center justify-center border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink-muted)] hover:text-[var(--ink)] shadow-xs"
				title="Дополнительные операции"
				data-testid={`btn-item-more-${item.id}`}
				aria-expanded={isMenuOpen}
			>
				<MoreHorizontal size={13} />
			</button>

			{isMenuOpen && (
				<div
					ref={menuRef}
					className="absolute right-0 top-full mt-1 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-lg p-1.5 z-40 min-w-[190px] flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100"
					role="menu"
				>
					<StockRowMenuButtons
						item={item}
						onCloseMenu={onCloseMenu}
						onOpenWarehouseManager={onOpenWarehouseManager}
						onOpenInventoryAudit={onOpenInventoryAudit}
						onEditItem={onEditItem}
						onDeleteItem={onDeleteItem}
					/>
				</div>
			)}
		</div>
	);
};

export default StockRowActionsMenu;
