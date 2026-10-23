/**
 * DENTE Dental CRM — 32-Tooth Single Tooth Cell Component
 * Anatomical 2.5D Wheeler orientation & status badge (Mandate 8b <= 120 lines).
 */

import React from "react";
import { Tooth47Container } from "../teeth/tooth47/index";
import { Tooth46Container } from "../Tooth46Container";
import { ArchToothBadge } from "./ArchToothBadge";
import type { BadgePlacement, MockupToothItem } from "./archMockupTypes";

export interface ArchToothCellProps {
	readonly item: MockupToothItem;
	readonly radius: number;
	readonly zoom?: number | undefined;
	readonly isDark: boolean;
	readonly placement: BadgePlacement;
	readonly isSelected?: boolean | undefined;
	readonly onClick?: ((item: MockupToothItem) => void) | undefined;
}

export const ArchToothCell: React.FC<ArchToothCellProps> = ({
	item,
	radius,
	zoom = 0.52,
	isDark,
	placement,
	isSelected = false,
	onClick,
}) => {
	const { toothNumber, presetId, isUpper } = item;
	const handleClick = () => onClick?.(item);

	// Number pill badge
	const numberBadge = (
		<span
			className={`font-mono font-black text-[11px] sm:text-xs transition-colors px-1 py-0.5 rounded leading-none ${
				isSelected
					? "bg-teal-500 text-white shadow-xs"
					: "text-[var(--ink,#0f172a)] opacity-75 hover:opacity-100"
			}`}
		>
			{toothNumber}
		</span>
	);

	// Status badge component
	const statusBadge = (
		<div className="flex items-center justify-center p-0.5 min-h-[40px]">
			<ArchToothBadge presetId={presetId} radius={radius} onClick={handleClick} />
		</div>
	);

	// Anatomical 2.5D SVG tooth container (upper flipped roots-up; 47/37 dedicated 4-cusp anatomy)
	const isTooth47 = toothNumber === 47 || toothNumber === 37;

	const toothSvg = (
		<div
			className="transition-transform duration-150 hover:scale-105 active:scale-95 flex items-center justify-center"
			style={{ transform: isUpper ? "scaleY(-1)" : "none" }}
		>
			{isTooth47 ? (
				<Tooth47Container
					isDark={isDark}
					zoom={zoom}
					presetId={presetId}
					showBadge={false}
				/>
			) : (
				<Tooth46Container
					isDark={isDark}
					zoom={zoom}
					presetId={presetId}
					showBadge={false}
				/>
			)}
		</div>
	);

	return (
		<div
			data-testid={`arch-tooth-cell-${toothNumber}`}
			onClick={handleClick}
			className={`flex flex-col items-center justify-between p-1 rounded-xl transition-all duration-150 cursor-pointer select-none border min-w-[56px] sm:min-w-[68px] ${
				isSelected
					? "border-teal-500 bg-teal-500/10 shadow-md ring-2 ring-teal-500/30"
					: "border-transparent hover:border-slate-200 dark:hover:border-slate-700/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
			}`}
		>
			{isUpper ? (
				<>
					{placement === "root_apex" && statusBadge}
					{numberBadge}
					{toothSvg}
					{placement === "occlusal" && statusBadge}
				</>
			) : (
				<>
					{placement === "occlusal" && statusBadge}
					{toothSvg}
					{numberBadge}
					{placement === "root_apex" && statusBadge}
				</>
			)}
		</div>
	);
};
