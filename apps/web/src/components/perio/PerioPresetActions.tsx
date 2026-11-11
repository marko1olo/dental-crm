/**
 * PerioPresetActions.tsx — Быстрые клинические пресеты и макро-батчи челюстей пародонтологии.
 * Вынесено из PerioStudioModal в рамках декомпозиции по Мандату 8b (Sweet Spot 200–300 строк).
 */

import React from "react";
import { Check, Sparkles } from "lucide-react";

export interface PerioPresetActionsProps {
	readonly onSetAllIntact: () => void;
	readonly onApplyPreset: (presetId: string) => void;
	readonly onApplyUpperJawNorm: () => void;
	readonly onApplyLowerJawNorm: () => void;
	readonly onApplyZeroBop: () => void;
	readonly onApplyZeroCalculus: () => void;
}

export const PerioPresetActions: React.FC<PerioPresetActionsProps> = React.memo(({
	onSetAllIntact,
	onApplyPreset,
	onApplyUpperJawNorm,
	onApplyLowerJawNorm,
	onApplyZeroBop,
	onApplyZeroCalculus,
}) => {
	return (
		<div className="flex flex-col gap-1.5 p-2 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
			<div className="flex flex-wrap items-center gap-2">
				<button
					type="button"
					onClick={onSetAllIntact}
					data-testid="perio-toolbar-norm-1click-btn"
					data-preset-card="perio-preset-norm-card"
					className="min-h-[44px] px-3 rounded-lg bg-[var(--paper)] text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-[var(--line)] hover:border-emerald-500 flex items-center gap-1.5 cursor-pointer transition-colors"
				>
					<span data-testid="psr-all-intact-btn" className="flex items-center gap-1.5">
						<Check className="w-3.5 h-3.5" /> Здоровый пародонт (Норма)
						<span className="sr-only">Норма (PSR 0) Пародонт в норме</span>
					</span>
				</button>
				<button
					type="button"
					onClick={() => onApplyPreset("gingivitis_express")}
					data-testid="psr-gingivitis-preset-btn"
					className="min-h-[36px] sm:h-8 px-3 rounded-lg bg-[var(--paper)] text-amber-600 dark:text-amber-400 font-semibold text-xs border border-[var(--line)] hover:border-amber-500 flex items-center gap-1.5 cursor-pointer transition-colors"
				>
					Гингивит (PSR 1–2)
				</button>
				<button
					type="button"
					onClick={() => onApplyPreset("pro_hygiene_express")}
					data-testid="perio-toolbar-prophy-1click-btn"
					className="min-h-[36px] sm:h-8 px-3 rounded-lg bg-[var(--paper)] text-sky-600 dark:text-sky-400 font-semibold text-xs border border-[var(--line)] hover:border-sky-500 flex items-center gap-1.5 cursor-pointer transition-colors"
				>
					<span data-testid="psr-hygiene-preset-btn" className="flex items-center gap-1.5">
						<Sparkles className="w-3.5 h-3.5" /> Профгигиена AirFlow + УЗ
					</span>
				</button>
				<button
					type="button"
					onClick={() => onApplyPreset("periodontitis_mild_express")}
					data-testid="psr-periodontitis-preset-btn"
					className="min-h-[36px] sm:h-8 px-3 rounded-lg bg-[var(--paper)] text-orange-600 dark:text-orange-400 font-semibold text-xs border border-[var(--line)] hover:border-orange-500 flex items-center gap-1.5 cursor-pointer transition-colors"
				>
					Пародонтит легкий (PSR 2–3)
				</button>
				<button
					type="button"
					onClick={() => onApplyPreset("periodontitis_severe_express")}
					data-testid="perio-preset-severe-btn"
					className="min-h-[36px] sm:h-8 px-3 rounded-lg bg-[var(--paper)] text-rose-600 dark:text-rose-400 font-semibold text-xs border border-[var(--line)] hover:border-rose-500 flex items-center gap-1.5 cursor-pointer transition-colors"
				>
					Пародонтит тяжелый (6-8 мм)
				</button>
			</div>
			<div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-[var(--line)]/60 text-xs">
				<span className="text-[11px] text-[var(--muted)] font-bold shrink-0">Быстрый выбор:</span>
				<button
					type="button"
					onClick={onApplyUpperJawNorm}
					data-testid="perio-macro-upper-jaw-btn"
					className="min-h-[30px] px-2 rounded-md bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[#0d9488] font-medium cursor-pointer transition-colors"
				>
					✓ ВЧ 1–2 мм
				</button>
				<button
					type="button"
					onClick={onApplyLowerJawNorm}
					data-testid="perio-macro-lower-jaw-btn"
					className="min-h-[30px] px-2 rounded-md bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[#0d9488] font-medium cursor-pointer transition-colors"
				>
					✓ НЧ 1–2 мм
				</button>
				<button
					type="button"
					onClick={onApplyZeroBop}
					data-testid="perio-macro-zero-bop-btn"
					className="min-h-[30px] px-2 rounded-md bg-[var(--paper)] text-emerald-600 dark:text-emerald-400 border border-[var(--line)] hover:border-emerald-500 font-medium cursor-pointer transition-colors"
				>
					✓ BOP 0%
				</button>
				<button
					type="button"
					onClick={onApplyZeroCalculus}
					data-testid="perio-macro-zero-calculus-btn"
					className="min-h-[30px] px-2 rounded-md bg-[var(--paper)] text-sky-600 dark:text-sky-400 border border-[var(--line)] hover:border-sky-500 font-medium cursor-pointer transition-colors"
				>
					✓ Без налета и камня
				</button>
			</div>
		</div>
	);
});

PerioPresetActions.displayName = "PerioPresetActions";
