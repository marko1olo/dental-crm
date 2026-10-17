/**
 * ChairsideToothQuickChips.tsx
 * Quick 1-tap tooth chips (11, 16, 21, 26, 31, 36, 41, 46) + "Без зуба".
 */

import React from "react";
import { getToothBadgeColor } from "./chairsideToothColors.js";
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
				className={`dente-filter-chip min-h-[44px] px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer inline-flex items-center justify-center ${
					selectedTeethList.length === 0
						? "bg-teal-600 text-white border-teal-600 shadow-xs font-bold"
						: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-teal-600"
				}`}
			>
				Без зуба
			</button>
			{[11, 16, 21, 26, 31, 36, 41, 46].map((t) => {
				const active = selectedTeethList.includes(String(t));
				const state = toothStateByCode[String(t)];
				const badgeColor = getToothBadgeColor(state);
				return (
					<button
						key={t}
						type="button"
						onClick={() => onToothClick(t)}
						className={`dente-filter-chip min-w-[44px] min-h-[44px] px-2.5 py-1 rounded-md text-xs font-mono font-semibold border transition-all cursor-pointer inline-flex items-center justify-center gap-1 ${
							active
								? "bg-teal-600 text-white border-teal-600 shadow-xs font-bold"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-teal-600"
						}`}
					>
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
