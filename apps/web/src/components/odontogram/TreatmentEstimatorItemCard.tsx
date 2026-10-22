import { ShieldCheck, Trash2 } from "lucide-react";
import type React from "react";
import { useState } from "react";
import {
	calculateTreatmentWarranty,
	type EstimatorContract,
	estimatorRowMoney,
	type GhostToothConflict,
	isDeciduousFdiToothNumber,
	type PlanItem,
	type PlanItemCollision,
} from "./treatmentEstimatorPricing";
import { ItemCardCollisionBadge } from "./itemCard/ItemCardCollisionBadge";
import { ItemCardFooter } from "./itemCard/ItemCardFooter";
import { ItemCardGhostWarning } from "./itemCard/ItemCardGhostWarning";
import { ItemCardPriceQuantity } from "./itemCard/ItemCardPriceQuantity";

export interface TreatmentEstimatorItemCardProps {
	readonly item: PlanItem;
	readonly globalIdx: number;
	readonly contract: EstimatorContract;
	readonly onRemove: (idx: number) => void;
	readonly onSetPhase: (idx: number, phase: number) => void;
	readonly formatRub: (kopecks: number) => string;
	readonly ghostConflict?: GhostToothConflict | null | undefined;
	readonly collision?: PlanItemCollision | null | undefined;
	readonly onReplaceWithImplant?: ((toothNumber: number) => void) | undefined;
	readonly onRestoreToothStatus?: ((toothNumber: number) => void) | undefined;
	readonly onPriceChange?: ((idx: number, newPrice: number | null) => void) | undefined;
}

export const TreatmentEstimatorItemCard: React.FC<TreatmentEstimatorItemCardProps> = ({
	item, globalIdx, contract, onRemove, onSetPhase, formatRub,
	ghostConflict, collision, onReplaceWithImplant, onRestoreToothStatus, onPriceChange,
}) => {
	const [isCollapsing, setIsCollapsing] = useState(false);
	const [isEditingPrice, setIsEditingPrice] = useState(false);
	const [customPriceInput, setCustomPriceInput] = useState("");
	const warranty = calculateTreatmentWarranty(item);
	const rowMoney = estimatorRowMoney(item, contract);

	const handleSaveCustomPrice = () => {
		const parsed = parseFloat(customPriceInput);
		if (!Number.isNaN(parsed) && parsed >= 0) {
			onPriceChange?.(globalIdx, parsed);
		}
		setIsEditingPrice(false);
	};

	const handleRemoveClick = () => {
		if (isCollapsing) return;
		setIsCollapsing(true);
		setTimeout(() => onRemove(globalIdx), 180);
	};

	return (
		<div className={`plan-item-card ${isCollapsing ? "animate-collapse" : ""}`}>
			<div className="plan-item-row">
				<div className="plan-item-info">
					<div className="plan-item-header flex items-center justify-between gap-2 flex-wrap">
						<div className="flex items-center gap-1.5 flex-wrap">
							{item.toothNumber && (
								<span className={`tooth-badge ${isDeciduousFdiToothNumber(item.toothNumber) ? "baby" : "adult"}`}>
									[{item.toothNumber}]
								</span>
							)}
							<span className="plan-item-name font-bold">{item.name}</span>
						</div>
						<span
							className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 shrink-0 flex items-center gap-1"
							title={warranty.termsDescription}
						>
							<ShieldCheck size={12} className="text-blue-500 shrink-0" />
							<span>Гарантия {warranty.warrantyMonths} мес.</span>
						</span>
					</div>
					<div className="plan-item-price-quantity">
						<ItemCardPriceQuantity
							item={item}
							globalIdx={globalIdx}
							rowMoney={rowMoney}
							formatRub={formatRub}
							isEditingPrice={isEditingPrice}
							customPriceInput={customPriceInput}
							setCustomPriceInput={setCustomPriceInput}
							setIsEditingPrice={setIsEditingPrice}
							handleSaveCustomPrice={handleSaveCustomPrice}
							onPriceChange={onPriceChange}
						/>
					</div>
					<ItemCardGhostWarning
						item={item}
						ghostConflict={ghostConflict}
						onReplaceWithImplant={onReplaceWithImplant}
						onRestoreToothStatus={onRestoreToothStatus}
						onRemoveClick={handleRemoveClick}
					/>
					<ItemCardCollisionBadge collision={collision} toothNumber={item.toothNumber} />
				</div>
				<button type="button" onClick={handleRemoveClick} className="btn-remove-item" title="Удалить">
					<Trash2 size={14} />
				</button>
			</div>
			<ItemCardFooter
				item={item}
				globalIdx={globalIdx}
				rowMoney={rowMoney}
				formatRub={formatRub}
				onSetPhase={onSetPhase}
			/>
		</div>
	);
};
