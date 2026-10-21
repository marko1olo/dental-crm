import { ArrowDownToLine, ArrowUpFromLine, Trash2 } from "lucide-react";
import React from "react";
import type { InventoryItem } from "../inventoryDataMappers.js";
import type { ExpiryTrafficLightInfo } from "../inventoryExpiryUtils.js";
import { StockRowActionsMenu } from "./StockRowActionsMenu.js";
import { StockRowStepper } from "./StockRowStepper.js";

export interface StockRowActionsCellProps {
	readonly item: InventoryItem;
	readonly writeQty: number;
	readonly isOverdraft: boolean;
	readonly expiryTraffic: ExpiryTrafficLightInfo;
	readonly isMenuOpen: boolean;
	readonly menuRef?: React.RefObject<HTMLDivElement | null> | undefined;
	readonly onStepQuantity?: ((delta: number) => void) | undefined;
	readonly onChangeQuantity?: ((val: number) => void) | undefined;
	readonly onToggleMenu: () => void;
	readonly onCloseMenu: () => void;
	readonly onDeductItem: (item: InventoryItem, qty: number, isOverdraft: boolean) => void;
	readonly onReceiveItem: (item: InventoryItem, qty: number) => void;
	readonly onOpenDisposalModal: (item: InventoryItem) => void;
	readonly onOpenWarehouseManager?: (() => void) | undefined;
	readonly onOpenInventoryAudit?: (() => void) | undefined;
	readonly onEditItem?: ((item: InventoryItem) => void) | undefined;
	readonly onDeleteItem?: ((id: string, name: string) => void) | undefined;
}

export const StockRowActionsCell: React.FC<StockRowActionsCellProps> = ({
	item, writeQty, isOverdraft, expiryTraffic, isMenuOpen, menuRef,
	onStepQuantity, onChangeQuantity, onToggleMenu, onCloseMenu,
	onDeductItem, onReceiveItem, onOpenDisposalModal, onOpenWarehouseManager,
	onOpenInventoryAudit, onEditItem, onDeleteItem,
}) => {
	return (
		<td
			className="inventory-col-actions"
			style={{
				padding: "8px 10px 8px 4px",
				verticalAlign: "middle",
				textAlign: "right",
				whiteSpace: "nowrap",
				width: 280,
				minWidth: 280,
			}}
		>
			<div className="flex items-center justify-end gap-1 whitespace-nowrap shrink-0">
				{expiryTraffic.isBlocked ? (
					<button
						type="button"
						onClick={() => onOpenDisposalModal(item)}
						className="h-7 px-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-98"
						style={{ height: 28, minHeight: 28, borderRadius: 8 }}
						title="Срок годности истек: сформировать Акт утилизации СанПиН 3.3686-21"
						data-testid={`btn-sanpin-disposal-act-${item.id}`}
					>
						<Trash2 size={12} className="shrink-0" />
						<span>Акт утилизации</span>
					</button>
				) : (
					<>
						<StockRowStepper
							itemId={item.id}
							writeQty={writeQty}
							onStepQuantity={onStepQuantity}
							onChangeQuantity={onChangeQuantity}
						/>

						<button
							type="button"
							onClick={() => onDeductItem(item, writeQty, isOverdraft)}
							className="h-7 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer inline-flex items-center gap-1 whitespace-nowrap shrink-0 border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] shadow-xs"
							title={
								isOverdraft
									? "Списать расход сверх остатка (мягкий овердрафт): клинический процесс не блокируется"
									: "Списать расход материала по FEFO"
							}
							data-testid={`btn-item-writeoff-${item.id}`}
						>
							<span className="hidden" data-testid={`btn-deduct-fefo-${item.id}`}>
								{isOverdraft ? "Списать (с дефицитом)" : "Списать"}
							</span>
							<ArrowUpFromLine size={12} className="shrink-0 text-[var(--ink-muted)]" />
							<span>Списание</span>
						</button>

						<button
							type="button"
							onClick={() => onReceiveItem(item, writeQty)}
							className="h-7 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer inline-flex items-center gap-1 whitespace-nowrap shrink-0 border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] shadow-xs"
							title="Оприходовать материал на склад"
							data-testid={`btn-item-arrival-${item.id}`}
						>
							<ArrowDownToLine size={12} className="shrink-0 text-[var(--ink-muted)]" />
							<span>Приход</span>
						</button>
					</>
				)}

				<StockRowActionsMenu
					item={item}
					isMenuOpen={isMenuOpen}
					menuRef={menuRef}
					onToggleMenu={onToggleMenu}
					onCloseMenu={onCloseMenu}
					onOpenWarehouseManager={onOpenWarehouseManager}
					onOpenInventoryAudit={onOpenInventoryAudit}
					onEditItem={onEditItem}
					onDeleteItem={onDeleteItem}
				/>
			</div>
		</td>
	);
};

export default StockRowActionsCell;
