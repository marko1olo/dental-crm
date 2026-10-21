import { Edit2, ShieldCheck, Trash2, Zap } from "lucide-react";
import React from "react";
import type { InventoryItem } from "../inventoryDataMappers.js";

export interface MobileStockCardMenuProps {
	readonly item: InventoryItem;
	readonly isMenuOpen: boolean;
	readonly onCloseMenu: () => void;
	readonly onOpenWarehouseManager?: (() => void) | undefined;
	readonly onOpenInventoryAudit?: (() => void) | undefined;
	readonly onEditItem?: ((item: InventoryItem) => void) | undefined;
	readonly onDeleteItem?: ((id: string, name: string) => void) | undefined;
}

export const MobileStockCardMenu: React.FC<MobileStockCardMenuProps> = ({
	item,
	isMenuOpen,
	onCloseMenu,
	onOpenWarehouseManager,
	onOpenInventoryAudit,
	onEditItem,
	onDeleteItem,
}) => {
	if (!isMenuOpen) return null;

	return (
		<div className="absolute right-0 top-full mt-1 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xl p-1.5 z-40 min-w-[200px] flex flex-col gap-1 text-xs">
			{onEditItem && (
				<button
					type="button"
					onClick={() => {
						onCloseMenu();
						onEditItem(item);
					}}
					className="min-h-[44px] w-full px-2.5 py-1.5 rounded-lg text-left text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer font-medium"
				>
					<Edit2 size={14} className="text-teal-600" />
					<span>Редактировать</span>
				</button>
			)}
			{onOpenWarehouseManager && (
				<button
					type="button"
					onClick={() => {
						onCloseMenu();
						onOpenWarehouseManager();
					}}
					className="min-h-[44px] w-full px-2.5 py-1.5 rounded-lg text-left text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer font-medium"
				>
					<Zap size={14} className="text-blue-600" />
					<span>История движений</span>
				</button>
			)}
			{onOpenInventoryAudit && (
				<button
					type="button"
					onClick={() => {
						onCloseMenu();
						onOpenInventoryAudit();
					}}
					className="min-h-[44px] w-full px-2.5 py-1.5 rounded-lg text-left text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer font-medium"
				>
					<ShieldCheck size={14} className="text-emerald-600" />
					<span>Инвентаризация</span>
				</button>
			)}
			{onDeleteItem && (
				<button
					type="button"
					onClick={() => {
						onCloseMenu();
						onDeleteItem(item.id, item.name);
					}}
					className="min-h-[44px] w-full px-2.5 py-1.5 rounded-lg text-left text-rose-600 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer font-medium border-t border-[var(--line)] mt-0.5"
				>
					<Trash2 size={14} />
					<span>Удалить позицию</span>
				</button>
			)}
		</div>
	);
};
