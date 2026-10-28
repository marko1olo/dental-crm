/**
 * PresenterFooter.tsx — Нижний липкий футер презентера с ровно 1 Primary CTA (SSOT).
 * Мандат 8b: Золотой стандарт modularity (80–110 строк).
 * Мандат 8am: Ровно 1 Primary CTA кнопка var(--teal) («Пациент выбрал...»). Все остальные — нейтральные.
 * Мандат 8e: Автономия врача — кнопки никогда не блокируются (zero disabled).
 * Apple HIG: Сенсорная зона >= 44px, natural thumb zone в нижней трети экрана.
 */

import React from "react";
import { Printer, FileSignature, CheckCircle2 } from "lucide-react";
import type { TreatmentPlanTier, TreatmentPlanTierId } from "../treatmentPlanTypes";
import { formatRubles } from "../treatmentPlanTypes";

export interface PresenterFooterProps {
	readonly activeTier: TreatmentPlanTier | null;
	readonly selectedTierId: TreatmentPlanTierId;
	readonly getTierLetter: (tierId: TreatmentPlanTierId) => string;
	readonly onPrint: () => void;
	readonly onApproveAndSign?: ((tier: TreatmentPlanTier) => void) | undefined;
	readonly onConfirmChoice: () => void;
}

export const PresenterFooter: React.FC<PresenterFooterProps> = ({
	activeTier,
	selectedTierId,
	getTierLetter,
	onPrint,
	onApproveAndSign,
	onConfirmChoice,
}) => {
	const tierTitle = activeTier?.title || "План";
	const tierPrice = formatRubles(activeTier?.totalRub || 0);

	return (
		<footer className="flex items-center justify-between flex-wrap gap-4 px-4 sm:px-6 py-3.5 bg-[var(--paper-soft)] border-t border-[var(--line)] shrink-0">
			<div>
				<span className="text-xs text-[var(--muted)] block">Выбранный вариант:</span>
				<span className="text-lg font-black text-[var(--ink)]">
					«{tierTitle}» — {tierPrice}
				</span>
			</div>

			<div className="flex items-center gap-2 w-full sm:w-auto">
				{/* Вторичное действие: печать */}
				<button
					type="button"
					onClick={onPrint}
					className="min-h-[44px] flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer"
					data-testid="print-contract-btn"
				>
					<Printer className="w-4 h-4 text-[var(--muted)] shrink-0" />
					<span className="hidden sm:inline">Печать сметы плана</span>
					<span className="sm:hidden">Печать</span>
				</button>

				{/* Вторичное действие: подписание */}
				{onApproveAndSign && (
					<button
						type="button"
						onClick={() => activeTier && onApproveAndSign(activeTier)}
						className="min-h-[44px] flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer"
						data-testid="approve-and-sign-btn"
					>
						<FileSignature className="w-4 h-4 text-[var(--muted)] shrink-0" />
						<span className="hidden sm:inline">Подписать план лечения</span>
						<span className="sm:hidden">Подписать</span>
					</button>
				)}

				{/* ЕДИНСТВЕННЫЙ PRIMARY CTA КНОПКА БЛОКА (Мандат 8am) */}
				<button
					type="button"
					onClick={onConfirmChoice}
					className="primary-button min-h-[44px] flex-1 sm:flex-initial px-4 sm:px-6 py-2.5 text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
					data-testid="confirm-patient-choice-btn"
				>
					<CheckCircle2 className="w-4 h-4 shrink-0" />
					<span className="hidden sm:inline">{`Пациент выбрал ${getTierLetter(selectedTierId)}`}</span>
					<span className="sm:hidden">Выбрать</span>
				</button>
			</div>
		</footer>
	);
};

export default PresenterFooter;
