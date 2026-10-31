/**
 * @dental/web/components/anesthesia/quickBar/AnesthesiaDosageStepper.tsx
 * Carpule Dosage Stepper & Aspiration Guard for Chairside Anesthesia (Mandates 8e, 8am, 8ze)
 * 1-click dose presets, min-h-[44px] touch target, zero cartoon emojis.
 */

import React from "react";
import { CARPULE_PRESETS } from "../anesthesiaCatalogData";

export interface AnesthesiaDosageStepperProps {
	readonly carpulesCount: number;
	readonly onSelectCount: (count: number) => void;
	readonly onDecrease: () => void;
	readonly onIncrease: () => void;
	readonly isAspirationNegative: boolean;
	readonly onToggleAspiration: () => void;
}

export function AnesthesiaDosageStepper({
	carpulesCount,
	onSelectCount,
	onDecrease,
	onIncrease,
	isAspirationNegative,
	onToggleAspiration,
}: AnesthesiaDosageStepperProps) {
	return (
		<div className="flex items-center gap-1.5 flex-wrap min-w-0" data-testid="anesthesia-dosage-stepper-container">
			<fieldset className="inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 shrink-0 m-0" aria-label="Быстрый выбор карпул">
				{CARPULE_PRESETS.map((cp) => (
					<button
						key={cp.count}
						type="button"
						onClick={() => onSelectCount(cp.count)}
						data-testid={cp.id}
						className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer min-h-[44px] min-w-[44px] inline-flex items-center justify-center ${carpulesCount === cp.count ? "bg-[var(--teal-surface)] text-[var(--teal-strong)] font-bold border border-[var(--teal)] shadow-2xs" : "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"}`}
					>
						{cp.label}
					</button>
				))}
			</fieldset>

			<div className="inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 shrink-0" aria-label="Счётчик карпул">
				<button
					type="button"
					onClick={onDecrease}
					className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-xs font-black text-[var(--ink)] bg-[var(--paper)] border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer"
					data-testid="btn-decrease-carpules"
					aria-label="Уменьшить дозу"
				>
					−
				</button>
				<span className="px-2 text-xs font-bold font-mono text-[var(--ink)] select-none whitespace-nowrap" data-testid="selected-carpules-display">
					{carpulesCount} карп. ({(carpulesCount * 1.7).toFixed(1)} мл)
				</span>
				<button
					type="button"
					onClick={onIncrease}
					className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-xs font-black text-[var(--ink)] bg-[var(--paper)] border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer"
					data-testid="btn-increase-carpules"
					aria-label="Увеличить дозу"
				>
					+
				</button>
			</div>

			<label data-testid="label-aspiration-negative-norm" className="inline-flex items-center gap-1 px-2 py-1 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors select-none shrink-0">
				<input
					type="checkbox"
					checked={isAspirationNegative}
					onChange={onToggleAspiration}
					data-testid="checkbox-aspiration-negative-norm"
					className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
				/>
				<span className="text-[11px] text-[var(--muted)]">Аспирация (−)</span>
			</label>
		</div>
	);
}
