import React from 'react';
import { Plus } from 'lucide-react';
import { DentalSyringe } from '../../icons/DentalIcons';

export interface AnesthesiaDoseStepperProps {
	disabled: boolean;
	selectedCarpulesCount: number;
	onChangeSelectedCarpulesCount: (count: number) => void;
	onApplyCarpules: (count: number) => void;
}

export function AnesthesiaDoseStepper({
	disabled,
	selectedCarpulesCount,
	onChangeSelectedCarpulesCount,
	onApplyCarpules,
}: AnesthesiaDoseStepperProps) {
	return (
		<>
			<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1 shrink-0">
				<Plus size={13} className="text-[var(--teal)]" />
				Доза:
			</span>

			{/* Stepper [-] 1.0 карп. [+] */}
			<div className="anesthesia-quick-stepper inline-flex items-center rounded-lg border border-[var(--line)] bg-[var(--paper)] p-0.5 shadow-2xs" role="group" aria-label="Счетчик карпул">
				<button
					type="button"
					disabled={disabled || selectedCarpulesCount <= 0.5}
					onClick={() =>
						onChangeSelectedCarpulesCount(Math.max(0.5, Math.round((selectedCarpulesCount - 0.5) * 10) / 10))
					}
					className="anesthesia-stepper-btn inline-flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-[30px] sm:min-w-[30px] sm:h-7.5 sm:w-7.5 rounded-md text-xs font-black text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal)] cursor-pointer disabled:opacity-40"
					title="Уменьшить дозу на 0.5 карпулы"
					data-testid="btn-decrease-carpules"
				>
					−
				</button>
				<span
					className="anesthesia-stepper-val px-2.5 text-xs font-bold font-mono text-[var(--ink)] select-none whitespace-nowrap"
					data-testid="selected-carpules-display"
					title={`${selectedCarpulesCount} карпула (${(selectedCarpulesCount * 1.7).toFixed(1)} мл)`}
				>
					{selectedCarpulesCount} карп. ({(selectedCarpulesCount * 1.7).toFixed(1)} мл)
				</span>
				<button
					type="button"
					disabled={disabled || selectedCarpulesCount >= 6.0}
					onClick={() =>
						onChangeSelectedCarpulesCount(Math.min(6.0, Math.round((selectedCarpulesCount + 0.5) * 10) / 10))
					}
					className="anesthesia-stepper-btn inline-flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-[30px] sm:min-w-[30px] sm:h-7.5 sm:w-7.5 rounded-md text-xs font-black text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal)] cursor-pointer disabled:opacity-40"
					title="Увеличить дозу на 0.5 карпулы"
					data-testid="btn-increase-carpules"
				>
					+
				</button>
			</div>

			{/* Primary CTA: В карту */}
			<button
				type="button"
				disabled={disabled}
				onClick={() => onApplyCarpules(selectedCarpulesCount)}
				className="anesthesia-primary-cta-btn inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] sm:min-h-[34px] sm:h-8.5 rounded-lg border border-teal-600 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer active:scale-98 shrink-0 whitespace-nowrap"
				title={`Ввести ${selectedCarpulesCount} карп. в медицинскую карту`}
				data-testid="btn-apply-anesthesia-to-card"
			>
				<DentalSyringe size={14} className="shrink-0" />
				<span>В карту</span>
			</button>
		</>
	);
}
