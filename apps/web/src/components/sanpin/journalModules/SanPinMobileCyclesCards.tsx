/**
 * apps/web/src/components/sanpin/journalModules/SanPinMobileCyclesCards.tsx
 *
 * Мобильное представление журнала автоклавирования (Apple iOS HIG 390x844).
 * Сенсорный минимум >= 44px, Floating Bottom Bar для закрытия смены.
 * Мандат 8b: строго <= 120 строк.
 */

import React from "react";
import { CheckCircle2, Layers } from "lucide-react";
import type { SanPinCycleEntry } from "./sanpinJournalTypes";
import { SanPinMobileCycleCard } from "./SanPinMobileCycleCard";

export interface SanPinMobileCyclesCardsProps {
	readonly cycles: readonly SanPinCycleEntry[];
	readonly onAutofillShift?: (() => void) | undefined;
	readonly isAutofilling?: boolean | undefined;
	readonly onQuickBatchNorm?: ((batchSize: number, regime: "134" | "121") => void) | undefined;
	readonly onQuickPsoNorm?: (() => void) | undefined;
}

export const SanPinMobileCyclesCards: React.FC<SanPinMobileCyclesCardsProps> = ({
	cycles,
	onAutofillShift,
	isAutofilling = false,
	onQuickBatchNorm,
}) => {
	return (
		<div className="flex flex-col gap-3 pb-20">
			{cycles.length === 0 ? (
				<div className="p-6 text-center bg-[var(--paper)] rounded-2xl border border-[var(--line)]">
					<p className="font-semibold text-[var(--ink)] mb-3 text-sm">Нет циклов за период</p>
					{onAutofillShift && (
						<button
							type="button"
							onClick={onAutofillShift}
							disabled={isAutofilling}
							className="h-11 min-h-[44px] w-full rounded-xl font-semibold bg-[var(--teal,#0d9488)] text-white shadow-xs px-4 text-sm flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
						>
							<CheckCircle2 size={16} />
							<span>{isAutofilling ? "Заполнение..." : "Заполнить смену по нормам"}</span>
						</button>
					)}
				</div>
			) : (
				cycles.map((cyc) => <SanPinMobileCycleCard key={`mob-${cyc.id}`} cyc={cyc} />)
			)}

			{/* Floating Bottom Bar (Apple HIG Natural Thumb Zone) */}
			{onQuickBatchNorm && (
				<div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-[var(--paper)]/95 backdrop-blur-md border-t border-[var(--line)] shadow-lg flex items-center gap-2 pb-[max(12px,env(safe-area-inset-bottom))]">
					<button
						type="button"
						onClick={() => onQuickBatchNorm(27, "134")}
						disabled={isAutofilling}
						className="flex-1 h-11 min-h-[44px] rounded-xl font-semibold bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-600,#0f766e)] text-white shadow-xs px-3 text-[13px] flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
					>
						<CheckCircle2 size={16} />
						<span className="truncate">Зафиксировать цикл автоклавирования смены</span>
					</button>
					<button
						type="button"
						onClick={() => onQuickBatchNorm(15, "121")}
						disabled={isAutofilling}
						className="h-11 min-h-[44px] px-3.5 rounded-xl font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-[13px] flex items-center justify-center gap-1 cursor-pointer touch-manipulation"
					>
						<Layers size={14} />
						<span>121°C</span>
					</button>
				</div>
			)}
		</div>
	);
};

export default SanPinMobileCyclesCards;
