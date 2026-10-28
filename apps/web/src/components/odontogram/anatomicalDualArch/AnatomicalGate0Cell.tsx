/**
 * DENTE Dental CRM — Gate 0 Anatomical Tooth Single Cell
 * Renders Wheeler 2.5D tooth with selection ring & status badge.
 * Mandate 8b <= 120 lines.
 */

import React, { useCallback } from "react";
import type { ToothData } from "../ToothChart";
import { AnatomicalTooth } from "../gate0/AnatomicalTooth";
import { toothDataToGate0Flags } from "../gate0/gate0ToothAdapter";

export interface AnatomicalGate0CellProps {
	readonly toothNumber: number;
	readonly toothData?: ToothData | undefined;
	readonly isSelected: boolean;
	readonly isDark: boolean;
	readonly zoom: number;
	readonly onClick?: ((e: React.MouseEvent<HTMLElement>, toothNumber: number) => void) | undefined;
}

export const AnatomicalGate0Cell: React.FC<AnatomicalGate0CellProps> = React.memo(({
	toothNumber,
	toothData,
	isSelected,
	isDark,
	zoom,
	onClick,
}) => {
	const flags = toothDataToGate0Flags(toothData ?? { toothNumber, state: "Healthy" });

	const handleClick = useCallback(
		(e: React.MouseEvent<HTMLElement>) => {
			onClick?.(e, toothNumber);
		},
		[onClick, toothNumber],
	);

	return (
		<div
			data-testid={`anatomical-tooth-cell-${toothNumber}`}
			data-tooth-number={toothNumber}
			onClick={handleClick}
			className={`group relative flex flex-col items-center justify-center p-0.5 rounded-xl transition-all duration-150 cursor-pointer select-none min-w-[48px] sm:min-w-[54px] min-h-[110px] ${
				isSelected
					? "ring-2 ring-teal-500 bg-teal-500/10 dark:bg-teal-500/20 shadow-md shadow-teal-500/15"
					: "hover:bg-slate-100/80 dark:hover:bg-slate-800/60 active:scale-95"
			}`}
		>
			<AnatomicalTooth
				toothNumber={toothNumber}
				layers={flags}
				isDark={isDark}
				zoom={zoom}
				badgeRadius={18.5}
			/>
		</div>
	);
});

AnatomicalGate0Cell.displayName = "AnatomicalGate0Cell";
