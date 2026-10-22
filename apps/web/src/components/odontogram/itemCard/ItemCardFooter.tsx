import type React from "react";
import type { EstimatorRowMoney } from "../treatmentEstimatorMoney";
import type { PlanItem } from "../treatmentEstimatorPricing";

export interface ItemCardFooterProps {
	readonly item: PlanItem;
	readonly globalIdx: number;
	readonly rowMoney: EstimatorRowMoney;
	readonly formatRub: (kopecks: number) => string;
	readonly onSetPhase: (idx: number, phase: number) => void;
}

export const ItemCardFooter: React.FC<ItemCardFooterProps> = ({
	item,
	globalIdx,
	rowMoney,
	formatRub,
	onSetPhase,
}) => {
	return (
		<div className="plan-item-footer">
			<select
				value={item.phase}
				onChange={(e) => onSetPhase(globalIdx, parseInt(e.target.value, 10))}
				className="select-phase"
			>
				<option value={1}>Этап I: Терапия</option>
				<option value={2}>Этап II: Хирургия</option>
				<option value={3}>Этап III: Ортопедия</option>
			</select>
			<span className="plan-item-total-price">
				{rowMoney.known ? formatRub(rowMoney.payableKopecks) : "цены нет"}
			</span>
		</div>
	);
};
