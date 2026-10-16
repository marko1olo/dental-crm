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
		<div className="inline-flex items-center gap-1 p-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] shadow-2xs" role="group" aria-label="Выбор дозы карпул">
			<button
				type="button"
				disabled={disabled}
				onClick={() => onApplyCarpules(1.0)}
				className={`secondary-button px-2.5 py-1 min-h-[44px] sm:min-h-[32px] sm:h-7.5 rounded-md text-xs font-bold transition-all cursor-pointer active:scale-98 border ${
					selectedCarpulesCount === 1.0
						? "is-selected bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--teal)] ring-1 ring-[var(--teal)]"
						: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal)]"
				}`}
				title="Ввести 1 карпулу (1.7 мл)"
				data-testid="anesthesia-dose-1carp"
			>
				1 карпула (1.7 мл)
			</button>
			<button
				type="button"
				disabled={disabled}
				onClick={() => onApplyCarpules(2.0)}
				className={`secondary-button px-2.5 py-1 min-h-[44px] sm:min-h-[32px] sm:h-7.5 rounded-md text-xs font-bold transition-all cursor-pointer active:scale-98 border ${
					selectedCarpulesCount === 2.0
						? "is-selected bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--teal)] ring-1 ring-[var(--teal)]"
						: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal)]"
				}`}
				title="Ввести 2 карпулы (3.4 мл)"
				data-testid="anesthesia-dose-2carp"
			>
				2 карпулы
			</button>
			<button
				type="button"
				disabled={disabled}
				onClick={() => onApplyCarpules(0.5)}
				className={`secondary-button px-2.5 py-1 min-h-[44px] sm:min-h-[32px] sm:h-7.5 rounded-md text-xs font-bold transition-all cursor-pointer active:scale-98 border ${
					selectedCarpulesCount === 0.5
						? "is-selected bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--teal)] ring-1 ring-[var(--teal)]"
						: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal)]"
				}`}
				title="Ввести 0.5 карпулы (0.85 мл)"
				data-testid="anesthesia-dose-halfcarp"
			>
				0.5 карпулы
			</button>
		</div>
	);
}
