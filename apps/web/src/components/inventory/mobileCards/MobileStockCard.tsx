import { ArrowDownToLine, Trash2 } from "lucide-react";
import React from "react";
import type { InventoryItem } from "../inventoryDataMappers.js";
import {
	getCategoryBadge,
	getExpiryTrafficLight,
	getWarehouseFefoTrafficLight,
	type ExpiryTrafficLightInfo,
	type FefoTrafficLightInfo,
} from "../InventoryStockTable.js";
import { MobileStockCardHeader } from "./MobileStockCardHeader.js";
import { MobileStockCardStats } from "./MobileStockCardStats.js";

export interface MobileStockCardProps {
	readonly item: InventoryItem;
	readonly now: Date;
	readonly isMenuOpen: boolean;
	readonly onToggleMenu: () => void;
	readonly onCloseMenu: () => void;
	readonly onSelectItem?: ((item: InventoryItem) => void) | undefined;
	readonly onOpenSheet: (item: InventoryItem) => void;
	readonly onOpenDisposalModal?: ((item: InventoryItem) => void) | undefined;
	readonly onOpenWarehouseManager?: (() => void) | undefined;
	readonly onOpenInventoryAudit?: (() => void) | undefined;
	readonly onEditItem?: ((item: InventoryItem) => void) | undefined;
	readonly onDeleteItem?: ((id: string, name: string) => void) | undefined;
}

export const MobileStockCard: React.FC<MobileStockCardProps> = ({
	item,
	now,
	isMenuOpen,
	onToggleMenu,
	onCloseMenu,
	onSelectItem,
	onOpenSheet,
	onOpenDisposalModal,
	onOpenWarehouseManager,
	onOpenInventoryAudit,
	onEditItem,
	onDeleteItem,
}) => {
	const stock = Number(item.stockQuantity ?? 0);
	const isLowStock = stock <= (item.criticalThreshold ?? 5);
	const isOverdraft = stock <= 0;
	const unitCostRaw = Number(item.unitCostRub);
	const unitCost = Number.isFinite(unitCostRaw) ? unitCostRaw : null;
	const catInfo = getCategoryBadge(item.category);

	const expiryTraffic: ExpiryTrafficLightInfo = getExpiryTrafficLight(item.expirationDate, now);
	const fefoInfo: FefoTrafficLightInfo | null = item.expirationDate
		? getWarehouseFefoTrafficLight(item.expirationDate, now)
		: null;

	return (
		<div
			className={`rounded-2xl border p-3.5 transition-all bg-[var(--paper)] flex flex-col gap-2.5 ${
				expiryTraffic.isBlocked
					? "border-rose-500/40 bg-rose-500/5 dark:bg-rose-950/20 shadow-xs"
					: isOverdraft
					? "border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/20 shadow-xs"
					: "border-[var(--line)] shadow-xs"
			}`}
			data-testid={`mobile-stock-card-${item.id}`}
		>
			<MobileStockCardHeader
				item={item}
				catInfo={catInfo}
				isMenuOpen={isMenuOpen}
				onToggleMenu={onToggleMenu}
				onCloseMenu={onCloseMenu}
				onSelectItem={onSelectItem}
				onOpenSheet={onOpenSheet}
				onOpenWarehouseManager={onOpenWarehouseManager}
				onOpenInventoryAudit={onOpenInventoryAudit}
				onEditItem={onEditItem}
				onDeleteItem={onDeleteItem}
			/>

			<MobileStockCardStats
				item={item}
				stock={stock}
				isLowStock={isLowStock}
				isOverdraft={isOverdraft}
				unitCost={unitCost}
				expiryTraffic={expiryTraffic}
				fefoInfo={fefoInfo}
			/>

			<div className="pt-0.5">
				{expiryTraffic.isBlocked ? (
					<button
						type="button"
						onClick={() => (onOpenDisposalModal ? onOpenDisposalModal(item) : onOpenSheet(item))}
						className="min-h-[44px] w-full px-3 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98 transition-all"
					>
						<Trash2 size={15} className="shrink-0" />
						<span>Оформить акт утилизации СанПиН 3.3686-21</span>
					</button>
				) : (
					<button
						type="button"
						onClick={() => onOpenSheet(item)}
						className="min-h-[44px] w-full px-3 py-2.5 rounded-xl bg-[var(--teal-surface)] hover:bg-[var(--teal-soft)] border border-[var(--teal)] text-[var(--teal-dark,#0f766e)] font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all shadow-xs"
						data-testid={`btn-mobile-sheet-open-${item.id}`}
					>
						<ArrowDownToLine size={15} className="shrink-0" />
						<span>Списание / Приход партии (FEFO)</span>
					</button>
				)}
			</div>
		</div>
	);
};

export default MobileStockCard;
