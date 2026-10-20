/**
 * ChairsideToothFdiGrid.tsx
 * Expandable 32 FDI anatomical dual-arch tooth strip (18–11/21–28 and 48–41/31–38).
 * Compliant with Mandate 8b (<= 120 lines) and Apple HIG touch ergonomics.
 */

import React from "react";
import { FDI_LOWER_TEETH, FDI_UPPER_TEETH } from "./completedServicesPlan.js";
import { getToothBadgeColor, toAnatomicalToothState } from "./chairsideToothColors.js";
import { AnatomicalToothSVG } from "../odontogram/AnatomicalToothSVG";
import type { ToothState } from "../../store/visitStore";

interface ChairsideToothFdiGridProps {
	selectedTeethList: string[];
	toothStateByCode: Record<string, ToothState | undefined>;
	onToothClick: (tooth: number) => void;
}

export const ChairsideToothFdiGrid: React.FC<ChairsideToothFdiGridProps> = ({
	selectedTeethList,
	toothStateByCode,
	onToothClick,
}) => {
	const renderRow = (teeth: readonly number[]) => (
		<div className="flex flex-wrap gap-1.5 items-center">
			{teeth.map((t) => {
				const active = selectedTeethList.includes(String(t));
				const state = toothStateByCode[String(t)];
				const badgeColor = getToothBadgeColor(state);
				const anatomicalState = toAnatomicalToothState(state);
				return (
					<button
						key={t}
						type="button"
						onClick={() => onToothClick(t)}
						className={`min-w-[42px] min-h-[50px] px-1 py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer inline-flex flex-col items-center justify-between gap-0.5 ${
							active
								? "bg-teal-500/15 text-teal-800 dark:text-teal-200 border-teal-500 ring-2 ring-teal-500/40 shadow-xs"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-teal-500 hover:bg-teal-50/20"
						}`}
						title={state ? `Зуб ${t} (${state})` : `Зуб ${t}`}
					>
						<span className="text-[11px] leading-none">{t}</span>
						<div className="w-6 h-7 flex items-center justify-center overflow-hidden pointer-events-none">
							<AnatomicalToothSVG
								number={t}
								state={anatomicalState}
								scale={0.32}
								showPeriodontalBoneLoss={false}
								showPulpAndCanals={state === "treatment" || state === "pulpitis"}
								showPeriapicalHalos={false}
								onClick={() => onToothClick(t)}
							/>
						</div>
						<div className="h-1 flex items-center justify-center">
							{badgeColor ? (
								<span
									className="w-1.5 h-1.5 rounded-full shrink-0"
									style={{ backgroundColor: badgeColor }}
								/>
							) : (
								<span className="w-1.5 h-1.5 opacity-0" />
							)}
						</div>
					</button>
				);
			})}
		</div>
	);

	return (
		<div className="mt-3 pt-2.5 border-t border-[var(--line)] space-y-2">
			<div className="text-[11px] text-[var(--muted)] font-semibold flex items-center gap-1.5">
				<span>Верхняя челюсть (18–11, 21–28):</span>
			</div>
			{renderRow(FDI_UPPER_TEETH)}
			<div className="text-[11px] text-[var(--muted)] font-semibold flex items-center gap-1.5 pt-1">
				<span>Нижняя челюсть (48–41, 31–38):</span>
			</div>
			{renderRow(FDI_LOWER_TEETH)}
		</div>
	);
};
