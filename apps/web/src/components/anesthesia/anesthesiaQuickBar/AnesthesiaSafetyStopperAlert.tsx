import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { AnestheticDrugId } from '../anesthesiaCatalog';
import type { SafetyWarningState } from './types';

export interface AnesthesiaSafetyStopperAlertProps {
	disabled: boolean;
	safetyWarning: SafetyWarningState;
	onSelectDrug: (drugId: AnestheticDrugId) => void;
	onDismissWarning: () => void;
	onConfirmWarningOverride: (count: number) => void;
}

/**
 * AnesthesiaSafetyStopperAlert — Passive Clinical Advisory
 * Informs the doctor with zero modal blockage per Mandate 8e/8y.
 */
export function AnesthesiaSafetyStopperAlert({
	safetyWarning,
	onSelectDrug,
	onDismissWarning,
	onConfirmWarningOverride,
}: AnesthesiaSafetyStopperAlertProps) {
	return (
		<div
			className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs shadow-2xs"
			role="alert"
		>
			<div className="flex items-center gap-2 min-w-0">
				<AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
				<div className="truncate">
					<span className="font-bold">{safetyWarning.title}: </span>
					<span className="text-[var(--ink-muted)]">{safetyWarning.text}</span>
				</div>
			</div>
			<div className="flex items-center gap-1.5 shrink-0">
				<button
					type="button"
					className="px-2.5 py-1 min-h-[36px] rounded-lg border border-amber-500/40 bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] cursor-pointer transition-colors"
					onClick={() => {
						onDismissWarning();
						onSelectDrug('mepivacaine_plain');
						onConfirmWarningOverride(1.0);
					}}
					title="Переключиться на Мепивакаин 3% без вазоконстриктора"
				>
					Скандонест 3%
				</button>
				<button
					type="button"
					data-testid="btn-anesthesia-confirm-override"
					className="px-2.5 py-1 min-h-[36px] rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer transition-colors"
					onClick={() => {
						const count = safetyWarning.carpulesCount ?? 1.0;
						onDismissWarning();
						onConfirmWarningOverride(count);
					}}
					title="Подтвердить назначение врача"
				>
					Применить
				</button>
				<button
					type="button"
					className="px-2 py-1 min-h-[36px] rounded-lg text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
					onClick={onDismissWarning}
				>
					&times;
				</button>
			</div>
		</div>
	);
}
