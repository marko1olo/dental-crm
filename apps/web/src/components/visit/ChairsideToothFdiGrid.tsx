/**
 * ChairsideToothFdiGrid.tsx
 * Expandable 32 FDI teeth grid (18–11/21–28 and 48–41/31–38).
 */

import React from "react";
import { FDI_LOWER_TEETH, FDI_UPPER_TEETH } from "./completedServicesPlan.js";
import { getToothBadgeColor } from "./chairsideToothColors.js";
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
		<div className="flex flex-wrap gap-1">
			{teeth.map((t) => {
				const active = selectedTeethList.includes(String(t));
				const state = toothStateByCode[String(t)];
				const badgeColor = getToothBadgeColor(state);
				return (
					<button
						key={t}
						type="button"
						onClick={() => onToothClick(t)}
						className={`min-w-[44px] min-h-[44px] p-1 rounded text-xs font-mono font-bold border transition-all cursor-pointer inline-flex flex-col items-center justify-center gap-0.5 ${
							active
								? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
								: "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
						}`}
						title={state ? `Зуб ${t} (${state})` : `Зуб ${t}`}
					>
						<span>{t}</span>
						{badgeColor && (
							<span
								className="w-1.5 h-1.5 rounded-full shrink-0"
								style={{ backgroundColor: badgeColor }}
							/>
						)}
					</button>
				);
			})}
		</div>
	);

	return (
		<div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700/80 space-y-2">
			<div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
				Верхняя челюсть (18–11, 21–28):
			</div>
			{renderRow(FDI_UPPER_TEETH)}
			<div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium pt-1">
				Нижняя челюсть (48–41, 31–38):
			</div>
			{renderRow(FDI_LOWER_TEETH)}
		</div>
	);
};
