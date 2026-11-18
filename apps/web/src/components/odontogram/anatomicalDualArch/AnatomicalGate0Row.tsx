/**
 * DENTE Dental CRM — Gate 0 Anatomical Arch Row (Maxilla / Mandible)
 * Renders left & right quadrants separated by Facial Midline Guide.
 * Mandate 8b <= 120 lines.
 */

import React from "react";
import type { ToothData } from "../ToothChart";
import { AnatomicalGate0Cell } from "./AnatomicalGate0Cell";

export interface AnatomicalGate0RowProps {
	readonly isUpper: boolean;
	readonly leftTeeth: readonly number[];
	readonly rightTeeth: readonly number[];
	readonly teethDataMap?: Map<number, ToothData> | undefined;
	readonly selectedTeeth?: readonly number[] | undefined;
	readonly isDark: boolean;
	readonly zoom: number;
	readonly onToothClick?: ((e: React.MouseEvent<HTMLElement>, num: number) => void) | undefined;
	readonly archTitle?: string | undefined;
}

const EMPTY_MAP = new Map<number, ToothData>();
const EMPTY_SELECTED: readonly number[] = [];

export const AnatomicalGate0Row: React.FC<AnatomicalGate0RowProps> = React.memo(({
	isUpper,
	leftTeeth,
	rightTeeth,
	teethDataMap = EMPTY_MAP,
	selectedTeeth = EMPTY_SELECTED,
	isDark,
	zoom,
	onToothClick,
	archTitle,
}) => {
	const selectedSet = React.useMemo(() => new Set(selectedTeeth), [selectedTeeth]);

	const renderQuadrant = (teeth: readonly number[], testId: string) => (
		<div className="flex items-start gap-0.5 sm:gap-1" data-testid={testId}>
			{teeth.map((num) => (
				<AnatomicalGate0Cell
					key={num}
					toothNumber={num}
					toothData={teethDataMap.get(num)}
					isSelected={selectedSet.has(num)}
					isDark={isDark}
					zoom={zoom}
					onClick={onToothClick}
				/>
			))}
		</div>
	);

	return (
		<div
			className={`flex flex-col items-center w-full ${isUpper ? "order-1" : "order-3"}`}
			data-testid={isUpper ? "anatomical-arch-upper" : "anatomical-arch-lower"}
		>
			{archTitle && isUpper && (
				<div className="text-[11px] font-bold text-[var(--ink-muted)] tracking-wider mb-0.5">
					{archTitle}
				</div>
			)}
			<div className="flex items-start justify-center gap-1 sm:gap-2 w-full">
				{renderQuadrant(leftTeeth, isUpper ? "quadrant-1" : "quadrant-4")}
				<div
					className="flex flex-col items-center justify-center mx-1 sm:mx-2 self-stretch select-none"
					title="Сагиттальная линия (Facial Midline Guide)"
				>
					<div className="w-[2px] h-full min-h-[90px] bg-gradient-to-b from-transparent via-[var(--primary)]/50 to-transparent relative flex items-center justify-center">
						<div className="w-2 h-2 rounded-full bg-[var(--primary)] shadow-xs" />
					</div>
				</div>
				{renderQuadrant(rightTeeth, isUpper ? "quadrant-2" : "quadrant-3")}
			</div>
			{archTitle && !isUpper && (
				<div className="text-[11px] font-bold text-[var(--ink-muted)] tracking-wider mt-0.5">
					{archTitle}
				</div>
			)}
		</div>
	);
});

AnatomicalGate0Row.displayName = "AnatomicalGate0Row";
