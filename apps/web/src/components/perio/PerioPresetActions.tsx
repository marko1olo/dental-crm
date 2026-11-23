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
	const secondaryPresetClass =
		"touch-manipulation min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:h-9 sm:min-w-0 px-3 sm:px-2.5 rounded-xl bg-[var(--paper)] text-[var(--ink)] font-medium text-xs sm:text-[11.5px] lg:text-xs border border-[var(--line)] hover:border-[var(--primary)] hover:bg-[var(--paper-soft)] flex items-center justify-start sm:justify-center gap-1.5 cursor-pointer transition-colors w-full sm:w-auto";
	const pillClass =
		"dente-btn-pill touch-manipulation min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-0 px-3 sm:px-2.5 rounded-full bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--primary)] font-medium text-xs sm:text-[11px] lg:text-xs cursor-pointer transition-colors flex items-center justify-center w-full sm:w-auto";

	return (
		<div className="flex flex-col gap-2 p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
			<div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-1.5">
				<button
					type="button"
					onClick={onSetAllIntact}
					data-testid="perio-toolbar-norm-btn"
					data-preset-card="perio-preset-norm-card"
					className="touch-manipulation min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:h-9 sm:min-w-0 px-3 sm:px-2.5 rounded-xl bg-[var(--paper)] text-[var(--ink)] font-semibold text-xs sm:text-[11.5px] lg:text-xs border border-[var(--line)] hover:border-[var(--primary)] hover:bg-[var(--paper-soft)] flex items-center justify-start sm:justify-center gap-1.5 cursor-pointer transition-colors w-full sm:w-auto"
				>
					<span data-testid="psr-all-intact-btn" className="flex items-center gap-1.5">
						<Check className="w-4 h-4 shrink-0" /> Здоровый пародонт (Норма)
						<span className="sr-only">Норма (PSR 0) Пародонт в норме</span>
					</span>
				</button>
				<button
					type="button"
					onClick={() => onApplyPreset("gingivitis_express")}
					data-testid="psr-gingivitis-preset-btn"
					className={secondaryPresetClass}
				>
					Гингивит (PSR 1–2)
				</button>
				<button
					type="button"
					onClick={() => onApplyPreset("pro_hygiene_express")}
					data-testid="perio-toolbar-prophy-btn"
					className={secondaryPresetClass}
				>
					<span data-testid="psr-hygiene-preset-btn" className="flex items-center gap-1.5">
						<Sparkles className="w-4 h-4 shrink-0" /> Профгигиена AirFlow + УЗ
					</span>
				</button>
				<button
					type="button"
					onClick={() => onApplyPreset("periodontitis_mild_express")}
					data-testid="psr-periodontitis-preset-btn"
					className={secondaryPresetClass}
				>
					Пародонтит легкий (PSR 2–3)
				</button>
				<button
					type="button"
					onClick={() => onApplyPreset("periodontitis_severe_express")}
					data-testid="perio-preset-severe-btn"
					className={secondaryPresetClass}
				>
					Пародонтит тяжелый (6-8 мм)
				</button>
			</div>
			<div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 pt-2 border-t border-[var(--line)]/60 text-xs">
				<span className="col-span-2 sm:col-span-1 text-[11px] text-[var(--muted)] font-semibold shrink-0">Быстрый выбор:</span>
				<button
					type="button"
					onClick={onApplyUpperJawNorm}
					data-testid="perio-macro-upper-jaw-btn"
					className={pillClass}
				>
					✓ ВЧ 1–2 мм
				</button>
				<button
					type="button"
					onClick={onApplyLowerJawNorm}
					data-testid="perio-macro-lower-jaw-btn"
					className={pillClass}
				>
					✓ НЧ 1–2 мм
				</button>
				<button
					type="button"
					onClick={onApplyZeroBop}
					data-testid="perio-macro-zero-bop-btn"
					className={pillClass}
				>
					✓ BOP 0%
				</button>
				<button
					type="button"
					onClick={onApplyZeroCalculus}
					data-testid="perio-macro-zero-calculus-btn"
					className={pillClass}
				>
					✓ Без налета и камня
				</button>
			</div>
		</div>
	);
});

PerioPresetActions.displayName = "PerioPresetActions";
