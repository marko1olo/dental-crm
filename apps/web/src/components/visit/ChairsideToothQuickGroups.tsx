/**
 * ChairsideToothQuickGroups.tsx
 * Quick anatomical groups for multi-tooth selection.
 */

import React from "react";
import { FDI_LOWER_TEETH, FDI_UPPER_TEETH } from "./completedServicesPlan.js";

interface ChairsideToothQuickGroupsProps {
	onSelectGroup: (teeth: readonly number[]) => void;
	onClear: () => void;
	hasSelectedTeeth: boolean;
}

export const ChairsideToothQuickGroups: React.FC<ChairsideToothQuickGroupsProps> = ({
	onSelectGroup,
	onClear,
	hasSelectedTeeth,
}) => {
	return (
		<div className="mb-2.5 p-2 rounded-md bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 flex flex-wrap items-center gap-1.5 text-xs">
			<span className="text-[11px] font-semibold text-indigo-900 dark:text-indigo-300 mr-1">
				Быстрые группы:
			</span>
			<button
				type="button"
				onClick={() => onSelectGroup([13, 12, 11, 21, 22, 23])}
				className="min-h-[44px] px-3 py-1.5 rounded-md bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 cursor-pointer text-xs font-medium"
			>
				Фронт в/ч (13–23)
			</button>
			<button
				type="button"
				onClick={() => onSelectGroup([43, 42, 41, 31, 32, 33])}
				className="min-h-[44px] px-3 py-1.5 rounded-md bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 cursor-pointer text-xs font-medium"
			>
				Фронт н/ч (33–43)
			</button>
			<button
				type="button"
				onClick={() => onSelectGroup(FDI_UPPER_TEETH)}
				className="min-h-[44px] px-3 py-1.5 rounded-md bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 cursor-pointer text-xs font-medium"
			>
				Вся в/ч (18–28)
			</button>
			<button
				type="button"
				onClick={() => onSelectGroup(FDI_LOWER_TEETH)}
				className="min-h-[44px] px-3 py-1.5 rounded-md bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 cursor-pointer text-xs font-medium"
			>
				Вся н/ч (48–38)
			</button>
			{hasSelectedTeeth && (
				<button
					type="button"
					onClick={onClear}
					className="min-h-[44px] px-3 py-1.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 cursor-pointer text-xs font-medium ml-auto"
				>
					Сбросить
				</button>
			)}
		</div>
	);
};
