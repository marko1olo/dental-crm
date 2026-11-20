/**
 * @dental/web/components/hygiene/HygienePanelPresetsFooter.tsx
 *
 * Нижняя панель быстрых пресетов и Primary CTA («В дневник приёма»)
 * для калькулятора стоматологических индексов гигиены.
 * Мандаты: 8e (Автономия врача, 0 disabled), 8am (Ровно 1 Primary CTA).
 */

import React from "react";

export interface HygienePanelPresetsFooterProps {
	readonly onSetIdealOhis: () => void;
	readonly onSetGingivitisPreset: () => void;
	readonly onSetMildPeriodontitisPreset: () => void;
	readonly onSetPeriodontitisPreset: () => void;
	readonly onSetProHygienePreset: () => void;
	readonly onInsertToProtocol: () => void;
}

export const HygienePanelPresetsFooter: React.FC<HygienePanelPresetsFooterProps> = ({
	onSetIdealOhis,
	onSetGingivitisPreset,
	onSetMildPeriodontitisPreset,
	onSetPeriodontitisPreset,
	onSetProHygienePreset,
	onInsertToProtocol,
}) => {
	return (
		<div className="flex items-center gap-2 pt-1 border-t border-[var(--line-subtle)] text-xs flex-wrap">
			<button
				type="button"
				data-testid="hygiene-preset-norm"
				onClick={onSetIdealOhis}
				className="px-2.5 py-1 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
			>
				Норма (OHI-S 0.0)
			</button>
			<button
				type="button"
				data-testid="hygiene-preset-gingivitis"
				onClick={onSetGingivitisPreset}
				className="px-2.5 py-1 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
			>
				Гингивит
			</button>
			<button
				type="button"
				data-testid="hygiene-preset-mild-periodontitis"
				onClick={onSetMildPeriodontitisPreset}
				className="px-2.5 py-1 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
			>
				Пародонтит легкий
			</button>
			<button
				type="button"
				data-testid="hygiene-preset-periodontitis"
				onClick={onSetPeriodontitisPreset}
				className="px-2.5 py-1 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
			>
				Пародонтит
			</button>
			<button
				type="button"
				data-testid="hygiene-preset-pro-hygiene"
				onClick={onSetProHygienePreset}
				className="px-2.5 py-1 rounded-md border border-teal-500/40 bg-teal-50/50 dark:bg-teal-950/20 text-teal-800 dark:text-teal-300 font-semibold cursor-pointer"
			>
				Профгигиена
			</button>

			{/* Primary CTA (Мандат 8e: НИКОГДА не disabled, Мандат 8am: ровно 1 Primary CTA) */}
			<button
				type="button"
				data-testid="hygiene-insert-to-protocol-btn"
				data-legacy-testid="hygiene-insert-to-043-btn"
				onClick={onInsertToProtocol}
				className="ml-auto px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-[var(--primary-foreground)] shadow-xs transition-all cursor-pointer min-h-[36px]"
			>
				В дневник приёма
			</button>
		</div>
	);
};

HygienePanelPresetsFooter.displayName = "HygienePanelPresetsFooter";
