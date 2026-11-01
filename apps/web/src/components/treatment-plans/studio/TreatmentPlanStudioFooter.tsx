/**
 * TreatmentPlanStudioFooter.tsx — Подвал интерактивной студии планов лечения.
 * Мандаты 8am, 8e, Apple HIG:
 * - Ровно 1 Primary CTA кнопка (#0d9488 / var(--teal)) на видимый экран
 * - Кнопка НИКОГДА не блокируется (disabled={false}, Мандат 8e)
 * - Учет безопасной зоны iPhone Home Bar (safe-area-inset-bottom)
 * - Сенсорная высота CTA 52px (Natural Thumb Zone)
 */

import React from "react";
import { CheckCircle2 } from "lucide-react";
import type { TreatmentPlanTier } from "../treatmentPlanTypes";
import { formatRubles } from "../treatmentPlanTypes";

export interface TreatmentPlanStudioFooterProps {
	readonly activeTier: TreatmentPlanTier;
	readonly onApprove: () => void;
}

export const TreatmentPlanStudioFooter: React.FC<TreatmentPlanStudioFooterProps> = ({
	activeTier,
	onApprove,
}) => {
	const sanitizedTitle = activeTier.title.replace("★ ", "");

	return (
		<footer className="tp-studio-footer sticky bottom-0 z-10 flex items-center justify-between flex-wrap gap-3 px-4 sm:px-6 py-3 pb-[max(12px,env(safe-area-inset-bottom))] bg-[var(--paper)]/95 backdrop-blur-md border-t border-[var(--line)] shrink-0">
			<div className="flex flex-col min-w-0">
				<span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">
					Выбранный вариант:
				</span>
				<span className="text-sm sm:text-lg font-black text-[var(--ink)] truncate">
					«{sanitizedTitle}» — {formatRubles(activeTier.totalRub)}
				</span>
			</div>

			<div className="flex items-center gap-2 w-full sm:w-auto">
				<button
					type="button"
					onClick={onApprove}
					className="tp-primary-cta-btn min-h-[52px] sm:min-h-[48px] w-full sm:w-auto px-6 sm:px-8 py-2.5 text-xs sm:text-sm font-black rounded-xl inline-flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer bg-[var(--teal,#0d9488)] hover:bg-[#0f766e] text-white"
					data-testid="approve-treatment-plan-btn"
				>
					<CheckCircle2 className="w-5 h-5 shrink-0" />
					<span className="hidden sm:inline">{`✓ Утвердить выбранный план («${sanitizedTitle}»)`}</span>
					<span className="sm:hidden">{`✓ Утвердить план (${formatRubles(activeTier.totalRub)})`}</span>
				</button>
			</div>
		</footer>
	);
};

export default TreatmentPlanStudioFooter;
