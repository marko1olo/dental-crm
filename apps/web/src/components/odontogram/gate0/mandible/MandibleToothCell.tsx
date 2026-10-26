/**
 * DENTE Dental CRM — Mandible Single Tooth Cell Component
 * Wheeler Ch. 11 sagittal symmetry (mirror Q3 via scaleX(-1)) (Mandate 8b <= 120 lines).
 */

import type React from "react";
import type { MandibleToothCellProps } from "./mandibleTypes";
import { resolveMandibleToothComponent } from "./mandibleToothResolver";
import { MandibleToothBadge } from "./MandibleToothBadge";

export const MandibleToothCell: React.FC<MandibleToothCellProps> = ({
	toothNumber,
	layers,
	isSelected,
	isDark,
	zoom,
	badgeRadius = 14,
	badgePlacement = "root_apex",
	onClick,
}) => {
	const handleClick = () => onClick(toothNumber);
	const ToothComponent = resolveMandibleToothComponent(toothNumber);
	const isQuadrant3 = toothNumber >= 31 && toothNumber <= 38;
	const transform = isQuadrant3 ? "scaleX(-1)" : "none";

	const statusBadge = (
		<div className="flex items-center justify-center p-0.5">
			<MandibleToothBadge
				toothNumber={toothNumber}
				layers={layers}
				radius={badgeRadius}
				onClick={handleClick}
			/>
		</div>
	);

	const numberBadge = (
		<span
			className={`font-mono font-black text-[11px] sm:text-xs transition-colors px-1.5 py-0.5 rounded leading-none ${
				isSelected
					? "bg-teal-500 text-white shadow-xs"
					: "text-[var(--ink,#0f172a)] opacity-75 hover:opacity-100"
			}`}
		>
			{toothNumber}
		</span>
	);

	const toothSvg = (
		<div
			className="transition-transform duration-150 hover:scale-105 active:scale-95 flex items-start justify-center"
			style={{ transform }}
		>
			<ToothComponent
				isDark={isDark}
				zoom={zoom}
				layers={layers}
				badgeRadius={badgeRadius}
				showBadge={false}
			/>
		</div>
	);

	return (
		<div
			data-testid={`mandible-tooth-cell-${toothNumber}`}
			onClick={handleClick}
			className={`flex flex-col items-center justify-start p-1 rounded-2xl transition-all duration-150 cursor-pointer select-none border w-[62px] sm:w-[68px] shrink-0 ${
				isSelected
					? "border-teal-500 bg-teal-500/10 shadow-md ring-2 ring-teal-500/30"
					: "border-transparent hover:border-slate-200 dark:hover:border-slate-700/60 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
			}`}
		>
			{badgePlacement === "occlusal" && statusBadge}
			{toothSvg}
			<div className="flex flex-col items-center gap-0.5 mt-1">
				{numberBadge}
				{badgePlacement === "root_apex" && statusBadge}
			</div>
		</div>
	);
};
