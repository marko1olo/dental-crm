/**
 * DENTE Dental CRM — Gate 0 Anatomical 32-Tooth Full Arch View
 * Complete Wheeler Maxillary and Mandibular Arches with Midline Guide.
 * Mandate 8b <= 120 lines.
 */

import React, { useCallback, useMemo } from "react";
import type { ToothData, ToothState } from "./ToothChart";
import { AnatomicalGate0Row } from "./anatomicalDualArch/AnatomicalGate0Row";

export interface AnatomicalGate0FullArchViewProps {
	readonly teethData?: readonly ToothData[] | undefined;
	readonly teethDataMap?: Map<number, ToothData> | undefined;
	readonly selectedTeeth?: number[] | undefined;
	readonly onToothClick?: ((e: React.MouseEvent<HTMLElement> | number, toothNumber?: number) => void) | undefined;
	readonly handleToothClick?: ((e: React.MouseEvent<HTMLElement> | number, toothNumber?: number) => void) | undefined;
	readonly onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[]) => void) | undefined;
	readonly activeStamp?: ToothState | null | undefined;
	readonly activeStampTool?: ToothState | null | undefined;
	readonly isDark?: boolean | undefined;
	readonly zoom?: number | undefined;
	readonly showWisdomTeeth?: boolean | undefined;
	readonly className?: string | undefined;
}

const UPPER_Q1 = [18, 17, 16, 15, 14, 13, 12, 11] as const;
const UPPER_Q2 = [21, 22, 23, 24, 25, 26, 27, 28] as const;
const LOWER_Q4 = [48, 47, 46, 45, 44, 43, 42, 41] as const;
const LOWER_Q3 = [31, 32, 33, 34, 35, 36, 37, 38] as const;

export const AnatomicalGate0FullArchView: React.FC<AnatomicalGate0FullArchViewProps> = React.memo(({
	teethData = [],
	teethDataMap,
	selectedTeeth = [],
	onToothClick,
	handleToothClick,
	onQuickStateChange,
	activeStamp,
	activeStampTool,
	isDark,
	zoom = 0.55,
	showWisdomTeeth = true,
	className,
}) => {
	const map = useMemo(() => {
		if (teethDataMap) return teethDataMap;
		const m = new Map<number, ToothData>();
		for (const t of teethData) m.set(t.toothNumber, t);
		return m;
	}, [teethData, teethDataMap]);

	const dark = isDark ?? (typeof document !== "undefined" && document.documentElement.classList.contains("dark"));

	const handleToothClickInternal = useCallback(
		(e: React.MouseEvent<HTMLElement>, num: number) => {
			const stamp = activeStamp ?? activeStampTool;
			if (stamp && onQuickStateChange) {
				onQuickStateChange([num], stamp, []);
				return;
			}
			const clickFn = onToothClick ?? handleToothClick;
			clickFn?.(e, num);
		},
		[activeStamp, activeStampTool, onQuickStateChange, onToothClick, handleToothClick],
	);

	const q1 = useMemo(() => showWisdomTeeth ? UPPER_Q1 : UPPER_Q1.filter((n) => n !== 18), [showWisdomTeeth]);
	const q2 = useMemo(() => showWisdomTeeth ? UPPER_Q2 : UPPER_Q2.filter((n) => n !== 28), [showWisdomTeeth]);
	const q4 = useMemo(() => showWisdomTeeth ? LOWER_Q4 : LOWER_Q4.filter((n) => n !== 48), [showWisdomTeeth]);
	const q3 = useMemo(() => showWisdomTeeth ? LOWER_Q3 : LOWER_Q3.filter((n) => n !== 38), [showWisdomTeeth]);

	return (
		<div
			className={`anatomical-gate0-full-arch-view w-full overflow-x-auto touch-pan-x select-none py-2 px-1 ${className ?? ""}`}
			data-testid="anatomical-gate0-full-arch-view"
		>
			<div className="min-w-[860px] flex flex-col items-center justify-center gap-2 mx-auto">
				<AnatomicalGate0Row
					isUpper={true}
					leftTeeth={q1}
					rightTeeth={q2}
					teethDataMap={map}
					selectedTeeth={selectedTeeth}
					isDark={dark}
					zoom={zoom}
					onToothClick={handleToothClickInternal}
					archTitle="Верхняя челюсть"
				/>
				<div className="w-full max-w-4xl h-[1px] bg-slate-200/80 dark:bg-slate-700/60 my-0.5" />
				<AnatomicalGate0Row
					isUpper={false}
					leftTeeth={q4}
					rightTeeth={q3}
					teethDataMap={map}
					selectedTeeth={selectedTeeth}
					isDark={dark}
					zoom={zoom}
					onToothClick={handleToothClickInternal}
					archTitle="Нижняя челюсть"
				/>
			</div>
		</div>
	);
});

AnatomicalGate0FullArchView.displayName = "AnatomicalGate0FullArchView";
