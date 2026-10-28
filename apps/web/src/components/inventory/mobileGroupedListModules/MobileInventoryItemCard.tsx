import {
	AlertTriangle, CheckCircle2, Clock, Layers, Minus, Package, ShieldCheck, Sparkles, Syringe, Target,
} from "lucide-react";
import React from "react";
import { getExpiryTrafficLight } from "../InventoryStockTable.js";
import type { InventoryItem } from "../inventoryDataMappers.js";
import { getItemCategoryType } from "./types.js";

export interface MobileInventoryItemCardProps {
	readonly item: InventoryItem;
	readonly isDeducting: boolean;
	readonly onClick: () => void;
	readonly onQuickDeduct: (e: React.MouseEvent, item: InventoryItem) => void;
}

export const MobileInventoryItemCard: React.FC<MobileInventoryItemCardProps> = ({
	item, isDeducting, onClick, onQuickDeduct,
}) => {
	const catType = getItemCategoryType(item);
	const isNegativeStock = item.stockQuantity < 0;
	const isZeroStock = item.stockQuantity === 0;
	const isLowStock = !isZeroStock && !isNegativeStock && item.stockQuantity <= (item.criticalThreshold || 0);
	const trafficLight = getExpiryTrafficLight(item.expirationDate);

	let stripClass = "in-stock";
	if (isNegativeStock) stripClass = "negative";
	else if (isZeroStock) stripClass = "critical";
	else if (isLowStock) stripClass = "low-stock";

	let IconComponent = Package;
	if (catType === "anesthesia") IconComponent = Syringe;
	else if (catType === "filling") IconComponent = Sparkles;
	else if (catType === "endo") IconComponent = Target;
	else if (catType === "impression") IconComponent = Layers;
	else if (catType === "ppe") IconComponent = ShieldCheck;

	return (
		<div className="mobile-inventory-item-row" onClick={onClick} data-testid={`mobile-inventory-item-${item.id}`}>
			<div className={`mobile-inventory-stock-strip ${stripClass}`} aria-hidden="true" />
			<div className={`mobile-inventory-icon-box ${catType}`}>
				<IconComponent size={20} aria-hidden="true" />
			</div>

			<div className="mobile-inventory-item-info">
				<div className="mobile-inventory-item-name">{item.name}</div>
				<div className="mobile-inventory-item-meta">
					<span>{item.category || "Расходные материалы"}</span>
					<span>•</span>
					<span className="mobile-inventory-stock-highlight">{item.stockQuantity} {item.unit || "шт."}</span>
					{item.lotNumber && (
						<>
							<span>•</span>
							<span className="opacity-75">{item.lotNumber}</span>
						</>
					)}
				</div>

				<div className="mobile-inventory-badges-row">
					{isNegativeStock ? (
						<span className="mobile-inventory-badge critical-deficit" data-testid="badge-negative-deficit">
							<AlertTriangle size={11} aria-hidden="true" />
							<span>⚠️ Требуется приход / отрицательный остаток: {item.stockQuantity} {item.unit || "шт."}</span>
							<span className="hidden">Ожидает оприходования накладной ({item.stockQuantity} {item.unit || "шт."})</span>
						</span>
					) : isZeroStock ? (
						<span className="mobile-inventory-badge critical-deficit" data-testid="badge-critical-deficit">
							<AlertTriangle size={11} aria-hidden="true" />
							<span>⚠️ Требуется приход / нулевой остаток</span>
							<span className="hidden">Закончился: 0 {item.unit || "шт."} (Овердрафт)</span>
						</span>
					) : isLowStock ? (
						<span className="mobile-inventory-badge critical-warning" data-testid="badge-critical-warning">
							<AlertTriangle size={11} aria-hidden="true" />
							<span>Заканчивается: осталось {item.stockQuantity} {item.unit || "шт."}</span>
						</span>
					) : (
						<span className="mobile-inventory-badge fefo-ok" data-testid="badge-in-stock">
							<CheckCircle2 size={11} aria-hidden="true" />
							<span>В наличии: {item.stockQuantity} {item.unit || "шт."}</span>
						</span>
					)}

					{trafficLight.status === "expired" ? (
						<span className="mobile-inventory-badge fefo-expired">
							<Clock size={11} aria-hidden="true" />
							<span>Просрочено</span>
						</span>
					) : trafficLight.status === "warning_soon" ? (
						<span className="mobile-inventory-badge fefo-warning">
							<Clock size={11} aria-hidden="true" />
							<span>Истекает скоро ({trafficLight.daysLeft} дн.)</span>
						</span>
					) : null}
				</div>
			</div>

			<button
				type="button"
				className="mobile-inventory-quick-deduct-btn"
				disabled={isDeducting}
				onClick={(e) => onQuickDeduct(e, item)}
				aria-label={`Списать 1 единицу ${item.name}`}
				title={`Быстро списать 1 ${item.unit || "шт."} прямо у кресла`}
				data-testid={`btn-quick-deduct-${item.id}`}
			>
				<Minus size={13} aria-hidden="true" className="shrink-0 text-rose-500" />
				<span className="font-bold text-xs whitespace-nowrap">−1 {item.unit || "шт."}</span>
			</button>
		</div>
	);
};
