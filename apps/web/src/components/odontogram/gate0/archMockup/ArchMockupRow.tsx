/**
 * DENTE Dental CRM — 32-Tooth Mockup Dental Arch Row (16 Teeth)
 * Mandate 8b <= 120 lines.
 */

import React from "react";
import { ArchToothCell } from "./ArchToothCell";
import {
	type BadgePlacement,
	type BadgeSizeOption,
	getEffectiveBadgeRadius,
	type MockupToothItem,
} from "./archMockupTypes";

export interface ArchMockupRowProps {
	readonly teeth: readonly MockupToothItem[];
	readonly sizeOption: BadgeSizeOption;
	readonly zoom?: number;
	readonly isDark: boolean;
	readonly placement: BadgePlacement;
	readonly selectedTooth: number | null;
	readonly onSelectTooth: (item: MockupToothItem) => void;
	readonly archTitle: string;
}

export const ArchMockupRow: React.FC<ArchMockupRowProps> = ({
	teeth,
	sizeOption,
	zoom,
	isDark,
	placement,
	selectedTooth,
	onSelectTooth,
	archTitle,
}) => {
	const leftQuad = teeth.slice(0, 8);
	const rightQuad = teeth.slice(8, 16);

	const renderQuadrant = (items: readonly MockupToothItem[]) => (
		<div className="flex items-center gap-0.5 sm:gap-1">
			{items.map((item) => {
				const radius = getEffectiveBadgeRadius(sizeOption, item.quadrant);
				return (
					<ArchToothCell
						key={item.toothNumber}
						item={item}
						radius={radius}
						zoom={zoom}
						isDark={isDark}
						placement={placement}
						isSelected={selectedTooth === item.toothNumber}
						onClick={onSelectTooth}
					/>
				);
			})}
		</div>
	);

	return (
		<div className="w-full flex flex-col items-center">
			<div className="text-[11px] font-mono font-semibold tracking-wider opacity-60 mb-1 flex items-center gap-2">
				<span>{archTitle}</span>
			</div>
			<div className="flex items-center justify-center p-1 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-current/5">
				{renderQuadrant(leftQuad)}
				{/* Anatomical Sagittal Midline Divider */}
				<div
					className="h-32 sm:h-40 w-[2px] mx-1 sm:mx-2 bg-gradient-to-b from-transparent via-teal-500/50 to-transparent relative flex items-center justify-center"
					title="Сагиттальная срединная линия"
				>
					<div className="w-2 h-2 rounded-full bg-teal-500 ring-2 ring-white dark:ring-slate-900 shadow-xs" />
				</div>
				{renderQuadrant(rightQuad)}
			</div>
		</div>
	);
};
