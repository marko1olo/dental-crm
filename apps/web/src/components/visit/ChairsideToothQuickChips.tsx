/**
 * ChairsideToothQuickChips.tsx
 * Quick 1-tap anatomical tooth chips (11, 16, 21, 26, 31, 36, 41, 46) + "Без зуба".
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React from "react";
import { getToothBadgeColor, toAnatomicalToothState } from "./chairsideToothColors.js";
import { AnatomicalToothSVG } from "../odontogram/AnatomicalToothSVG";
import type { ToothState } from "../../store/visitStore";

interface ChairsideToothQuickChipsProps {
	selectedTeethList: string[];
	toothStateByCode: Record<string, ToothState | undefined>;
	onClear: () => void;
	onToothClick: (t: number) => void;
}

export const ChairsideToothQuickChips: React.FC<ChairsideToothQuickChipsProps> = ({
	selectedTeethList,
	toothStateByCode,
	onClear,
	onToothClick,
}) => {
	return (
		<div className="flex flex-wrap items-center gap-1.5">
			<button
				type="button"
				onClick={onClear}
				className={`dente-filter-chip min-h-[32px] sm:min-h-[32px] h-8 sm:h-8 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer inline-flex items-center justify-center ${
					selectedTeethList.length === 0
						? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal-strong,#0f766e)] shadow-xs font-bold"
						: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal)]"
				}`}
			>
				Без зуба
			</button>
			{[11, 16, 21, 26, 31, 36, 41, 46].map((t) => {
				const active = selectedTeethList.includes(String(t));
				const state = toothStateByCode[String(t)];
				const badgeColor = getToothBadgeColor(state);
				const anatomicalState = toAnatomicalToothState(state);
				return (
					<button
						key={t}
						type="button"
						onClick={() => onToothClick(t)}
						className={`dente-filter-chip min-w-[36px] sm:min-w-[36px] min-h-[32px] sm:min-h-[32px] h-8 sm:h-8 px-2 py-1 rounded-lg text-xs font-mono font-semibold border transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 ${
							active
								? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal-strong,#0f766e)] shadow-xs font-bold"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal)]"
						}`}
						title={state ? `Зуб ${t} (${state})` : `Зуб ${t}`}
					>
						<div className="w-4 h-6 flex items-center justify-center overflow-hidden pointer-events-none">
							<AnatomicalToothSVG
								number={t}
								state={anatomicalState}
								scale={0.24}
								showPeriodontalBoneLoss={false}
								showPulpAndCanals={state === "treatment" || state === "pulpitis"}
								showPeriapicalHalos={false}
								onClick={() => {}}
							/>
						</div>
						<span>{t}</span>
						{badgeColor && (
							<span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: badgeColor }} />
						)}
					</button>
				);
			})}
		</div>
	);
};
