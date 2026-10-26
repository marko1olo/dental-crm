/**
 * DENTE Dental CRM — 32-Tooth Single Tooth Cell Component
 * Anatomical 2.5D Wheeler orientation & status badge (Mandate 8b <= 120 lines).
 */

import React from "react";
import { Tooth41Container } from "../teeth/tooth41/index";
import { Tooth42Container } from "../teeth/tooth42/index";
import { Tooth43Container } from "../teeth/tooth43/index";
import { Tooth44Container } from "../teeth/tooth44/index";
import { Tooth45Container } from "../teeth/tooth45/index";
import { Tooth47Container } from "../teeth/tooth47/index";
import { Tooth48Container } from "../teeth/tooth48/index";
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

function resolveToothComponent(num: number) {
	if (num === 48 || num === 38) return Tooth48Container;
	if (num === 47 || num === 37) return Tooth47Container;
	if (num === 45 || num === 35) return Tooth45Container;
	if (num === 44 || num === 34) return Tooth44Container;
	if (num === 43 || num === 33) return Tooth43Container;
	if (num === 42 || num === 32) return Tooth42Container;
	if (num === 41 || num === 31) return Tooth41Container;
	return Tooth46Container;
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

	const statusBadge = (
		<div className="flex items-center justify-center p-0.5 min-h-[44px]">
			<ArchToothBadge presetId={presetId} radius={radius} onClick={handleClick} />
		</div>
	);

	const ToothComponent = resolveToothComponent(toothNumber);
	const isLeft = (toothNumber >= 31 && toothNumber <= 38) || (toothNumber >= 21 && toothNumber <= 28);
	const transform = [
		isUpper ? "scaleY(-1)" : "",
		isLeft ? "scaleX(-1)" : "",
	].filter(Boolean).join(" ") || "none";

	const toothSvg = (
		<div
			className="transition-transform duration-150 hover:scale-105 active:scale-95 flex items-center justify-center"
			style={{ transform }}
		>
			<ToothComponent isDark={isDark} zoom={zoom} presetId={presetId} showBadge={false} />
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
