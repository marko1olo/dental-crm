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
		<div className="mb-2.5 p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex flex-wrap items-center gap-1.5 text-xs">
			<span className="text-[11px] font-semibold text-[var(--ink-muted)] mr-1">
				Быстрые группы:
			</span>
			<button
				type="button"
				onClick={() => onSelectGroup([13, 12, 11, 21, 22, 23])}
				className="min-h-[32px] sm:min-h-[32px] h-8 px-2.5 py-1 rounded-lg bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)] transition-colors cursor-pointer text-xs font-medium"
			>
				Фронт в/ч (13–23)
			</button>
			<button
				type="button"
				onClick={() => onSelectGroup([43, 42, 41, 31, 32, 33])}
				className="min-h-[32px] sm:min-h-[32px] h-8 px-2.5 py-1 rounded-lg bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)] transition-colors cursor-pointer text-xs font-medium"
			>
				Фронт н/ч (33–43)
			</button>
			<button
				type="button"
				onClick={() => onSelectGroup(FDI_UPPER_TEETH)}
				className="min-h-[32px] sm:min-h-[32px] h-8 px-2.5 py-1 rounded-lg bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)] transition-colors cursor-pointer text-xs font-medium"
			>
				Вся в/ч (18–28)
			</button>
			<button
				type="button"
				onClick={() => onSelectGroup(FDI_LOWER_TEETH)}
				className="min-h-[32px] sm:min-h-[32px] h-8 px-2.5 py-1 rounded-lg bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)] transition-colors cursor-pointer text-xs font-medium"
			>
				Вся н/ч (48–38)
			</button>
			{hasSelectedTeeth && (
				<button
					type="button"
					onClick={onClear}
					className="min-h-[32px] sm:min-h-[32px] h-8 px-2.5 py-1 rounded-lg bg-[var(--paper)] text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer text-xs font-medium ml-auto"
				>
					Сбросить
				</button>
			)}
		</div>
	);
};
