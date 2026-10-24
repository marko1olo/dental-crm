/**
 * @dental/web/components/anesthesia/anesthesiaQuickBar/AnesthesiaStepperAndCtaRow.tsx
 * Carpule Stepper, Aspiration Check & Primary CTA Button (Mandate 8b, <= 120 lines)
 */

import { Share2, Syringe } from "lucide-react";
import React from "react";

const CARPULE_PRESETS = [
	{ count: 0.5, label: "0.5 карп.", id: "anesthesia-dose-05carp" },
	{ count: 1.0, label: "1 карп. (1.7 мл)", id: "anesthesia-dose-1carp" },
	{ count: 2.0, label: "2 карп. (3.4 мл)", id: "anesthesia-dose-2carp" },
	{ count: 3.0, label: "3 карп. (5.1 мл)", id: "anesthesia-dose-3carp" },
];

export interface AnesthesiaStepperAndCtaRowProps {
	readonly carpulesCount: number;
	readonly setCarpulesCount: (count: number) => void;
	readonly stepCarpules: (delta: number) => void;
	readonly isAspirationNegative: boolean;
	readonly setIsAspirationNegative: (updater: (prev: boolean) => boolean) => void;
	readonly copyPatientMemo: () => void;
	readonly memoCopyButtonId: string;
	readonly onApplyToCard: () => void;
	readonly disabled?: boolean | undefined;
}

export function AnesthesiaStepperAndCtaRow(props: AnesthesiaStepperAndCtaRowProps) {
	const { carpulesCount, setCarpulesCount, stepCarpules, isAspirationNegative, setIsAspirationNegative, copyPatientMemo, memoCopyButtonId, onApplyToCard, disabled = false } = props;
	return (
		<div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
			<div className="flex items-center gap-2 flex-wrap">
				<fieldset className="inline-flex items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 shadow-2xs m-0" aria-label="Объём анестезии">
					{CARPULE_PRESETS.map((p) => (
						<button
							key={p.count}
							type="button"
							disabled={disabled}
							onClick={() => setCarpulesCount(p.count)}
							data-testid={p.id}
							className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer min-h-[44px] inline-flex items-center justify-center ${
								carpulesCount === p.count
									? "bg-[var(--teal-surface)] text-[var(--teal-strong)] font-bold border border-[var(--teal)]"
									: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line-subtle)]"
							}`}
						>
							{p.label}
						</button>
					))}
				</fieldset>

				<fieldset className="inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 shadow-2xs shrink-0 m-0" aria-label="Счётчик карпул">
					<button
						type="button"
						disabled={disabled || carpulesCount <= 0.5}
						onClick={() => stepCarpules(-0.5)}
						className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-xs font-black text-[var(--ink)] bg-[var(--paper)] border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer disabled:opacity-30 active:scale-95 transition-all"
						title="Уменьшить дозу на 0.5 карпулы"
						data-testid="btn-decrease-carpules"
					>
						−
					</button>
					<span
						className="px-2 text-xs font-bold font-mono text-[var(--ink)] select-none whitespace-nowrap"
						data-testid="selected-carpules-display"
						title={`${carpulesCount} карпула (${(carpulesCount * 1.7).toFixed(1)} мл)`}
					>
						{carpulesCount} карп. ({(carpulesCount * 1.7).toFixed(1)} мл)
					</span>
					<button
						type="button"
						disabled={disabled || carpulesCount >= 6.0}
						onClick={() => stepCarpules(0.5)}
						className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-xs font-black text-[var(--ink)] bg-[var(--paper)] border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer disabled:opacity-30 active:scale-95 transition-all"
						title="Увеличить дозу на 0.5 карпулы"
						data-testid="btn-increase-carpules"
					>
						+
					</button>
				</fieldset>

				<label data-testid="label-aspiration-negative-norm" className="inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors select-none">
					<input
						type="checkbox"
						checked={isAspirationNegative}
						onChange={() => setIsAspirationNegative((v) => !v)}
						disabled={disabled}
						data-testid="checkbox-aspiration-negative-norm"
						className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
					/>
					<span className="text-[11px] text-[var(--muted)]">Аспирация (−)</span>
				</label>

				<button
					id={memoCopyButtonId}
					type="button"
					disabled={disabled}
					onClick={copyPatientMemo}
					className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] transition-colors cursor-pointer"
					title="Скопировать памятку пациенту для мессенджера"
				>
					<Share2 size={13} className="text-teal-600 shrink-0" />
					<span>Памятка пациенту</span>
				</button>
			</div>

			<button
				type="button"
				disabled={disabled}
				onClick={onApplyToCard}
				className="primary-button inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl border border-teal-600 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ml-auto"
				title={`Применить анестезию (${carpulesCount} карп. в медицинскую карту)`}
				data-testid="btn-apply-anesthesia-to-card"
			>
				<Syringe size={15} className="shrink-0" />
				<span>Применить анестезию</span>
			</button>
		</div>
	);
}
