/**
 * apps/web/src/components/formula/StomxDefectsPalette.tsx
 *
 * Канонический компактный фасад-делегат палитры дефектов по Мандату 8s и Мандату 8k.
 * Делегирует в единую каноническую палитру ToothStatusPalette.
 */

import React from "react";
import { ToothStatusPalette } from "../odontogram/ToothStatusPalette";
import type { ToothFormulaItem } from "./types";

export interface StomxDefectsPaletteProps {
	selectedToothNumber?: number | null | undefined;
	toothData?: ToothFormulaItem | undefined;
	onUpdateTooth?: ((toothNumber: number, updates: Partial<ToothFormulaItem>) => void) | undefined;
	onApplyIntactDentition?: (() => void) | undefined;
	className?: string | undefined;
}

export const StomxDefectsPalette: React.FC<StomxDefectsPaletteProps> = ({
	selectedToothNumber,
	onApplyIntactDentition,
	className = "",
}) => {
	return (
		<ToothStatusPalette
			selectedTooth={selectedToothNumber}
			onMarkIntact={onApplyIntactDentition}
			className={className}
		/>
	);
};
