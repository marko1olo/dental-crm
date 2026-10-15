import React from 'react';

export interface AnesthesiaSegmentedDoseButtonsProps {
	disabled: boolean;
	selectedCarpulesCount?: number;
	onApplyCarpules: (count: number) => void;
}

export function AnesthesiaSegmentedDoseButtons({
	disabled,
	selectedCarpulesCount = 1.0,
	onApplyCarpules,
}: AnesthesiaSegmentedDoseButtonsProps) {
	return (
		<div className="inline-flex items-center p-0.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] shadow-2xs" role="group" aria-label="Выбор дозы карпул">
			<button
				type="button"
				disabled={disabled}
				onClick={() => onApplyCarpules(1.0)}
				className={`px-2.5 py-1 min-h-[44px] sm:min-h-[32px] sm:h-7.5 rounded-md text-xs font-bold transition-all cursor-pointer active:scale-98 ${
					selectedCarpulesCount === 1.0
						? "bg-[var(--teal-surface)] text-[var(--teal)] ring-1 ring-[var(--teal)]"
						: "text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal)]"
				}`}
				title="Ввести 1 карпулу (1.7 мл)"
				data-testid="anesthesia-dose-1carp"
			>
				1 карпула (1.7 мл)
			</button>
			<div className="w-[1px] h-4 bg-[var(--line)] mx-0.5" />
			<button
				type="button"
				disabled={disabled}
				onClick={() => onApplyCarpules(2.0)}
				className={`px-2.5 py-1 min-h-[44px] sm:min-h-[32px] sm:h-7.5 rounded-md text-xs font-bold transition-all cursor-pointer active:scale-98 ${
					selectedCarpulesCount === 2.0
						? "bg-[var(--teal-surface)] text-[var(--teal)] ring-1 ring-[var(--teal)]"
						: "text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal)]"
				}`}
				title="Ввести 2 карпулы (3.4 мл)"
				data-testid="anesthesia-dose-2carp"
			>
				2 карпулы
			</button>
			<div className="w-[1px] h-4 bg-[var(--line)] mx-0.5" />
			<button
				type="button"
				disabled={disabled}
				onClick={() => onApplyCarpules(0.5)}
				className={`px-2.5 py-1 min-h-[44px] sm:min-h-[32px] sm:h-7.5 rounded-md text-xs font-bold transition-all cursor-pointer active:scale-98 ${
					selectedCarpulesCount === 0.5
						? "bg-[var(--teal-surface)] text-[var(--teal)] ring-1 ring-[var(--teal)]"
						: "text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal)]"
				}`}
				title="Ввести 0.5 карпулы (0.85 мл)"
				data-testid="anesthesia-dose-halfcarp"
			>
				0.5 карпулы
			</button>
		</div>
	);
}
