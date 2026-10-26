/**
 * DENTE Dental CRM — Maxilla Single Tooth Cell Component
 * Wheeler Ch. 8-11 sagittal symmetry (mirror Q2 via scaleX(-1)) (Mandate 8b <= 120 lines).
 */

import type React from "react";
import type { MaxillaToothCellProps } from "./maxillaTypes";
import { resolveMaxillaToothComponent } from "./maxillaToothResolver";
import { MaxillaToothBadge } from "./MaxillaToothBadge";

export const MaxillaToothCell: React.FC<MaxillaToothCellProps> = ({
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
	const ToothComponent = resolveMaxillaToothComponent(toothNumber);
	const isQuadrant2 = toothNumber >= 21 && toothNumber <= 28;
	const transform = isQuadrant2 ? "scaleX(-1)" : "none";

	const statusBadge = (
		<div className="flex items-center justify-center p-0.5">
			<MaxillaToothBadge
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
			className="transition-transform duration-150 hover:scale-105 active:scale-95 flex items-end justify-center"
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

	const widthClass =
		toothNumber === 11 || toothNumber === 21
			? "w-[56px] sm:w-[60px]"
			: toothNumber === 12 || toothNumber === 22
				? "w-[48px] sm:w-[52px]"
				: toothNumber === 13 || toothNumber === 23
					? "w-[52px] sm:w-[56px]"
					: toothNumber === 14 || toothNumber === 15 || toothNumber === 24 || toothNumber === 25
						? "w-[56px] sm:w-[60px]"
						: "w-[64px] sm:w-[68px]";

	return (
		<div
			data-testid={`maxilla-tooth-cell-${toothNumber}`}
			onClick={handleClick}
			className={`flex flex-col items-center justify-end p-1 rounded-2xl transition-all duration-150 cursor-pointer select-none border ${widthClass} shrink-0 ${
				isSelected
					? "border-teal-500 bg-teal-500/10 shadow-md ring-2 ring-teal-500/30"
					: "border-transparent hover:border-slate-200 dark:hover:border-slate-700/60 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
			}`}
		>
			<div className="flex flex-col items-center gap-0.5 mb-1">
				{badgePlacement === "root_apex" && statusBadge}
				{numberBadge}
			</div>
			{toothSvg}
			{badgePlacement === "occlusal" && statusBadge}
		</div>
	);
};
