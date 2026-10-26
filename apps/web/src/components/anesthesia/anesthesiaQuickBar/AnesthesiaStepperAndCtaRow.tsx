/**
 * @dental/web/components/anesthesia/anesthesiaQuickBar/AnesthesiaStepperAndCtaRow.tsx
 * Carpule Stepper, Aspiration & 1 Primary CTA (Mandates 8e, 8am, <= 120 lines)
 */

import { CheckCircle2, Share2, SlidersHorizontal } from "lucide-react";
import React from "react";

const CARPULE_PRESETS = [
	{ count: 0.5, label: "0.5", id: "anesthesia-dose-05carp" },
	{ count: 1.0, label: "1.0", id: "anesthesia-dose-1carp" },
	{ count: 2.0, label: "2.0", id: "anesthesia-dose-2carp" },
	{ count: 3.0, label: "3.0", id: "anesthesia-dose-3carp" },
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
	readonly onOpenMobileDrawer: () => void;
	readonly onOpenEmergencyProtocol?: (() => void) | undefined;
	readonly disabled?: boolean | undefined;
}

export function AnesthesiaStepperAndCtaRow(props: AnesthesiaStepperAndCtaRowProps) {
	const {
		carpulesCount,
		setCarpulesCount,
		stepCarpules,
		isAspirationNegative,
		setIsAspirationNegative,
		copyPatientMemo,
		memoCopyButtonId,
		onApplyToCard,
		onOpenMobileDrawer,
	} = props;

	return (
		<div className="flex items-center gap-1.5 flex-wrap min-w-0 ml-auto" data-testid="anesthesia-stepper-cta-group">
			<fieldset className="hidden sm:inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 shrink-0 m-0" aria-label="Быстрый выбор карпул">
				{CARPULE_PRESETS.map((p) => (
					<button
						key={p.count}
						type="button"
						onClick={() => setCarpulesCount(p.count)}
						data-testid={p.id}
						className={`px-2 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer min-h-[44px] inline-flex items-center justify-center ${
							carpulesCount === p.count ? "bg-[var(--teal-surface)] text-[var(--teal-strong)] font-bold border border-[var(--teal)]" : "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						title={`${p.label} карп.`}
					>
						{p.label}
					</button>
				))}
			</fieldset>

			<div className="inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 shrink-0" aria-label="Счётчик карпул">
				<button
					type="button"
					disabled={carpulesCount <= 0.5}
					onClick={() => stepCarpules(-0.5)}
					className="inline-flex items-center justify-center min-h-[44px] min-w-[32px] rounded-lg text-xs font-black text-[var(--ink)] bg-[var(--paper)] border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer disabled:opacity-30 active:scale-95 transition-all"
					title="Уменьшить на 0.5 карпулы"
					data-testid="btn-decrease-carpules"
				>
					−
				</button>
				<span className="px-2 text-xs font-bold font-mono text-[var(--ink)] select-none whitespace-nowrap" data-testid="selected-carpules-display" title={`${carpulesCount} карп. (${(carpulesCount * 1.7).toFixed(1)} мл)`}>
					{carpulesCount} карп. ({(carpulesCount * 1.7).toFixed(1)} мл)
				</span>
				<button
					type="button"
					disabled={carpulesCount >= 10.0}
					onClick={() => stepCarpules(0.5)}
					className="inline-flex items-center justify-center min-h-[44px] min-w-[32px] rounded-lg text-xs font-black text-[var(--ink)] bg-[var(--paper)] border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer disabled:opacity-30 active:scale-95 transition-all"
					title="Увеличить на 0.5 карпулы"
					data-testid="btn-increase-carpules"
				>
					+
				</button>
			</div>

			<label data-testid="label-aspiration-negative-norm" className="inline-flex items-center gap-1 px-2 py-1 min-h-[36px] h-9 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors select-none shrink-0">
				<input type="checkbox" checked={isAspirationNegative} onChange={() => setIsAspirationNegative((v) => !v)} data-testid="checkbox-aspiration-negative-norm" className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer" />
				<span className="text-[11px] text-[var(--muted)]">Аспирация (−)</span>
			</label>

			<button id={memoCopyButtonId} type="button" onClick={copyPatientMemo} className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[36px] h-9 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] transition-colors cursor-pointer shrink-0" title="Скопировать памятку пациенту для мессенджера">
				<Share2 size={12} className="text-teal-600 shrink-0" />
				<span className="hidden xl:inline">Памятка</span>
			</button>

			<button type="button" onClick={onOpenMobileDrawer} className="lg:hidden inline-flex items-center gap-1 px-2.5 py-1 min-h-[36px] h-9 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] shrink-0" title="Открыть мобильную шторку анестезии" data-testid="btn-open-anesthesia-mobile-sheet">
				<SlidersHorizontal size={13} />
				<span>Шторка</span>
			</button>

			<button
				type="button"
				onClick={onApplyToCard}
				className="primary-button inline-flex items-center gap-1.5 px-3.5 py-1.5 h-9 min-h-[36px] rounded-xl border border-[var(--teal-strong,#0f766e)] bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-strong,#0f766e)] text-white text-xs font-bold shadow-2xs transition-all cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ml-auto"
				title={`Применить анестезию (${carpulesCount} карп.) в протокол приёма`}
				data-testid="btn-apply-anesthesia-to-card"
			>
				<CheckCircle2 size={14} className="shrink-0" />
				<span>Применить анестезию в протокол</span>
				<span className="sr-only">Применить анестезию В карту В дневник</span>
			</button>
		</div>
	);
}
