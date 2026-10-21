import { Edit2, Trash2 } from "lucide-react";
import React from "react";
import type { InventoryItem } from "../inventoryDataMappers.js";

export interface StockRowEditDeleteButtonsProps {
	readonly item: InventoryItem;
	readonly onCloseMenu: () => void;
	readonly onEditItem?: ((item: InventoryItem) => void) | undefined;
	readonly onDeleteItem?: ((id: string, name: string) => void) | undefined;
}

export const StockRowEditDeleteButtons: React.FC<StockRowEditDeleteButtonsProps> = ({
	item,
	onCloseMenu,
	onEditItem,
	onDeleteItem,
}) => {
	return (
		<>
			{onEditItem && (
				<button
					type="button"
					onClick={() => {
						onCloseMenu();
						onEditItem(item);
					}}
					className="w-full px-2.5 py-1.5 rounded-lg text-xs text-left font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
					role="menuitem"
				>
					<Edit2 size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span>Редактировать</span>
				</button>
			)}

			{onDeleteItem && (
				<>
					<div className="h-px bg-[var(--line)] my-0.5" />
					<button
						type="button"
						onClick={() => {
							onCloseMenu();
							onDeleteItem(item.id, item.name);
						}}
						className="w-full px-2.5 py-1.5 rounded-lg text-xs text-left font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer transition-colors"
						role="menuitem"
					>
						<Trash2 size={13} className="shrink-0" />
						<span>Удалить позицию</span>
					</button>
				</>
			)}
		</>
	);
};
