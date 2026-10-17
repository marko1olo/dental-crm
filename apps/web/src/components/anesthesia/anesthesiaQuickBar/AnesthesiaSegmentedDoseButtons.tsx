import React from 'react';

export interface AnesthesiaSegmentedDoseButtonsProps {
	disabled: boolean;
	selectedCarpulesCount?: number;
	onApplyCarpules: (count: number) => void;
	onChangeSelectedCarpulesCount?: (count: number) => void;
}

const CARPULE_CHIPS: readonly { count: number; label: string; testId: string; title: string }[] = [
	{ count: 0.5, label: "0.5 карп. (0.85 мл)", testId: "anesthesia-dose-halfcarp", title: "0.5 карпулы (0.85 мл)" },
	{ count: 1.0, label: "1 карп. (1.7 мл)", testId: "anesthesia-dose-1carp", title: "1 карпула (1.7 мл)" },
	{ count: 1.5, label: "1.5 карп. (2.55 мл)", testId: "anesthesia-dose-1-5carp", title: "1.5 карпулы (2.55 мл)" },
	{ count: 2.0, label: "2 карп. (3.4 мл)", testId: "anesthesia-dose-2carp", title: "2 карпулы (3.4 мл)" },
	{ count: 3.0, label: "3 карп. (5.1 мл)", testId: "anesthesia-dose-3carp", title: "3 карпулы (5.1 мл)" },
];

export function AnesthesiaSegmentedDoseButtons({
	disabled,
	selectedCarpulesCount = 1.0,
	onApplyCarpules,
	onChangeSelectedCarpulesCount,
}: AnesthesiaSegmentedDoseButtonsProps) {
	return (
		<div className="inline-flex items-center gap-1 p-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] shadow-2xs flex-wrap" role="group" aria-label="Выбор дозы карпул">
			{CARPULE_CHIPS.map((chip) => {
				const isSelected = selectedCarpulesCount === chip.count;
				return (
					<button
						key={chip.count}
						type="button"
						disabled={disabled}
						onClick={() => {
							onChangeSelectedCarpulesCount?.(chip.count);
							onApplyCarpules(chip.count);
						}}
						className={`secondary-button px-2.5 py-1 min-h-[44px] sm:min-h-[32px] sm:h-7.5 rounded-md text-xs font-bold transition-all cursor-pointer active:scale-98 border touch-manipulation whitespace-nowrap ${
							isSelected
								? "is-selected bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--teal)] ring-1 ring-[var(--teal)]"
								: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal)]"
						}`}
						title={chip.title}
						data-testid={chip.testId}
					>
						{chip.label}
					</button>
				);
			})}
		</div>
	);
}
