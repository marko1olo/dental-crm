/**
 * DENTE Dental CRM — Mandible Single Tooth Cell Component
 * Wheeler Ch. 11 sagittal symmetry (mirror Q3 via scaleX(-1)) (Mandate 8b <= 120 lines).
 */

import React from "react";
import type { MandibleToothCellProps } from "./mandibleTypes";
import { resolveMandibleToothComponent } from "./mandibleToothResolver";
import { MandibleToothBadge } from "./MandibleToothBadge";

export const MandibleToothCell: React.FC<MandibleToothCellProps> = ({
	toothNumber,
	layers,
	isSelected,
	isDark,
	zoom,
	badgeRadius,
	onClick,
}) => {
	const handleClick = () => onClick(toothNumber);
	const ToothComponent = resolveMandibleToothComponent(toothNumber);
	const isQuadrant3 = toothNumber >= 31 && toothNumber <= 38;
	const transform = isQuadrant3 ? "scaleX(-1)" : "none";

	return (
		<div
			data-testid={`mandible-tooth-cell-${toothNumber}`}
			onClick={handleClick}
			className={`flex flex-col items-center justify-between p-1 sm:p-1.5 rounded-2xl transition-all duration-150 cursor-pointer select-none border min-w-[52px] sm:min-w-[64px] ${
				isSelected
					? "border-teal-500 bg-teal-500/10 shadow-md ring-2 ring-teal-500/30"
					: "border-transparent hover:border-slate-200 dark:hover:border-slate-700/60 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
			}`}
		>
			{/* Status Badge over tooth */}
			<div className="flex items-center justify-center min-h-[36px] sm:min-h-[44px]">
				<MandibleToothBadge
					toothNumber={toothNumber}
					layers={layers}
					radius={badgeRadius}
					onClick={handleClick}
				/>
			</div>

			{/* Tooth Vector SVG (Mirrored strictly for Quadrant 3) */}
			<div
				className="transition-transform duration-150 hover:scale-105 active:scale-95 flex items-center justify-center my-0.5"
				style={{ transform }}
			>
				<ToothComponent
					isDark={isDark}
					zoom={zoom}
					layers={layers}
					showBadge={false}
				/>
			</div>

			{/* Tooth FDI Number Badge */}
			<span
				className={`font-mono font-black text-[11px] sm:text-xs transition-colors px-1.5 py-0.5 rounded leading-none mt-1 ${
					isSelected
						? "bg-teal-500 text-white shadow-xs"
						: "text-[var(--ink,#0f172a)] opacity-75 hover:opacity-100"
				}`}
			>
				{toothNumber}
			</span>
		</div>
	);
};
