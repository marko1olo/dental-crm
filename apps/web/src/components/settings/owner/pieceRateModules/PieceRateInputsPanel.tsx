/**
 * PieceRateInputsPanel.tsx
 *
 * Панель ввода выручки, процентных ставок и удержаний врача по направлениям.
 * Декомпозирован на PieceRateCategoryRevenueInputs и PieceRateDeductionInputs (Мандат 8b, <= 120 строк).
 */

import React from "react";
import {
	PieceRateCategoryRevenueInputs,
	type PieceRateCategoryRevenueInputsProps,
} from "./PieceRateCategoryRevenueInputs";
import {
	PieceRateDeductionInputs,
	type PieceRateDeductionInputsProps,
} from "./PieceRateDeductionInputs";

export type PieceRateInputsPanelProps = PieceRateCategoryRevenueInputsProps &
	PieceRateDeductionInputsProps;

export const PieceRateInputsPanel: React.FC<PieceRateInputsPanelProps> = (props) => {
	return (
		<div className="space-y-4">
			<PieceRateCategoryRevenueInputs {...props} />
			<PieceRateDeductionInputs {...props} />
		</div>
	);
};
