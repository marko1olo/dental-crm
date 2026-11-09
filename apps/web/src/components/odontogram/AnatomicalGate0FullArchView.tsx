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
	readonly dentitionMode?: "adult" | "pediatric" | "mixed" | undefined;
	readonly isPediatric?: boolean | undefined;
	readonly isMixed?: boolean | undefined;
	readonly pediatricMode?: boolean | undefined;
	readonly mixedDentition?: boolean | undefined;
}

const UPPER_Q1 = [18, 17, 16, 15, 14, 13, 12, 11] as const;
const UPPER_Q2 = [21, 22, 23, 24, 25, 26, 27, 28] as const;
const LOWER_Q4 = [48, 47, 46, 45, 44, 43, 42, 41] as const;
const LOWER_Q3 = [31, 32, 33, 34, 35, 36, 37, 38] as const;

const PED_Q5 = [55, 54, 53, 52, 51] as const;
const PED_Q6 = [61, 62, 63, 64, 65] as const;
const PED_Q8 = [85, 84, 83, 82, 81] as const;
const PED_Q7 = [71, 72, 73, 74, 75] as const;

const MIX_UR = [16, 55, 54, 53, 52, 51] as const;
const MIX_UL = [61, 62, 63, 64, 65, 26] as const;
const MIX_LR = [46, 85, 84, 83, 82, 81] as const;
const MIX_LL = [71, 72, 73, 74, 75, 36] as const;

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
	dentitionMode,
	isPediatric,
	isMixed,
	pediatricMode,
	mixedDentition,
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

	const effectiveMode = dentitionMode ?? (
		(isPediatric || pediatricMode) ? "pediatric" :
		(isMixed || mixedDentition) ? "mixed" :
		"adult"
	);

	const { q1, q2, q4, q3 } = useMemo(() => {
		if (effectiveMode === "pediatric") {
			return { q1: PED_Q5, q2: PED_Q6, q4: PED_Q8, q3: PED_Q7 };
		}
		if (effectiveMode === "mixed") {
			return { q1: MIX_UR, q2: MIX_UL, q4: MIX_LR, q3: MIX_LL };
		}
		return {
			q1: showWisdomTeeth ? UPPER_Q1 : UPPER_Q1.filter((n) => n !== 18),
			q2: showWisdomTeeth ? UPPER_Q2 : UPPER_Q2.filter((n) => n !== 28),
			q4: showWisdomTeeth ? LOWER_Q4 : LOWER_Q4.filter((n) => n !== 48),
			q3: showWisdomTeeth ? LOWER_Q3 : LOWER_Q3.filter((n) => n !== 38),
		};
	}, [effectiveMode, showWisdomTeeth]);

	return (
		<div
			className={`anatomical-gate0-full-arch-view w-full overflow-x-auto touch-pan-x select-none py-2 px-1 ${className ?? ""}`}
			data-testid="anatomical-gate0-full-arch-view"
		>
			<div className="w-full max-w-[960px] flex flex-col items-center justify-center gap-1 mx-auto">
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
				<div className="w-full max-w-4xl flex items-center justify-center gap-3 my-0.5" title="Окклюзионная плоскость">
					<div className="flex-1 h-px bg-slate-200/70 dark:bg-slate-700/50" />
					<span className="text-[10px] uppercase font-bold tracking-widest text-slate-400/80 dark:text-slate-500/80 select-none">
						Окклюзия
					</span>
					<div className="flex-1 h-px bg-slate-200/70 dark:bg-slate-700/50" />
				</div>
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
