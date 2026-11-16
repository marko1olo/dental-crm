/**
 * StudioModalFooter.tsx — Подвал студии планов лечения (SSOT).
 * Мандат 8am: РОВНО ОДНА Primary CTA кнопка #0d9488 на видимый экран.
 * Мандат 8e: Кнопка сохранения черновика и кнопка утверждения НИКОГДА не disabled.
 */

import React from "react";
import { CheckCircle2, Save } from "lucide-react";
import { formatRubles } from "../treatmentPlanTypes";

export interface StudioModalFooterProps {
	readonly sanitizedActiveTitle: string;
	readonly activeTierTotalRub: number;
	readonly handleSaveDraft: () => void;
	readonly handleApprove: () => void;
}

export const StudioModalFooter: React.FC<StudioModalFooterProps> = ({
	sanitizedActiveTitle,
	activeTierTotalRub,
	handleSaveDraft,
	handleApprove,
}) => {
	return (
		<footer className="tp-studio-footer sticky bottom-0 z-10 flex items-center justify-between flex-wrap gap-3 px-4 sm:px-6 py-3 pb-[max(14px,env(safe-area-inset-bottom))] bg-[var(--paper)] text-[var(--ink)] border-t border-[var(--line)] shrink-0">
			<div className="flex flex-col min-w-0">
				<span className="text-[11px] font-semibold text-[var(--muted)] block">Выбранный вариант:</span>
				<span className="text-sm sm:text-lg font-black text-[var(--ink)] truncate">«{sanitizedActiveTitle}» — {formatRubles(activeTierTotalRub)}</span>
			</div>

			<div className="flex items-center gap-2 w-full sm:w-auto">
				{/* Сохранить черновик в любой момент без блокировок (Мандат 8e) */}
				<button
					type="button"
					onClick={handleSaveDraft}
					className="dente-btn dente-btn-secondary min-h-[44px] px-2.5 sm:px-3.5 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line-subtle)] text-[var(--ink)] text-xs font-bold items-center gap-1.5 transition-colors cursor-pointer inline-flex shrink-0"
					title="Сохранить черновик плана в карту пациента"
					data-testid="save-draft-btn"
				>
					<Save className="w-4 h-4 text-[var(--muted)] shrink-0" />
					<span className="hidden sm:inline">Сохранить черновик</span>
					<span className="sm:hidden">Черновик</span>
				</button>

				{/* ЕДИНСТВЕННЫЙ PRIMARY CTA КНОПКА ПО МАНДАТУ 8am (ВСЕГДА АКТИВНА, ДИЗАБЛИТЬ ЗАПРЕЩЕНО) */}
				<button
					type="button"
					onClick={handleApprove}
					className="tp-primary-cta-btn min-h-[52px] sm:min-h-[48px] flex-1 sm:flex-initial w-full sm:w-auto px-3 sm:px-8 py-2.5 text-xs sm:text-sm font-bold rounded-xl inline-flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer whitespace-nowrap overflow-hidden"
					data-testid="approve-treatment-plan-btn"
				>
					<CheckCircle2 className="w-5 h-5 shrink-0" />
					<span className="hidden sm:inline">{`Утвердить выбранный план («${sanitizedActiveTitle}»)`}</span>
					<span className="sm:hidden whitespace-nowrap">{`Утвердить · ${formatRubles(activeTierTotalRub)}`}</span>
				</button>
			</div>
		</footer>
	);
};
