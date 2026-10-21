/**
 * TreatmentPlanDiscountsModal.tsx — модальное окно управления скидками врача и списания бонусов/депозита.
 * Вынесено из тулбара для соблюдения лимита высоты экрана (y <= 140px для 3-Tier карточек).
 */

import React, { useMemo } from "react";
import { Percent, X } from "lucide-react";
import type { Kopecks } from "@dental/shared";
import { calculateLoyaltyBonusDeduction } from "./treatmentPlanPricingEngine.js";
import { DoctorDiscountsSelector } from "./discountsModal/DoctorDiscountsSelector.js";
import { PatientLoyaltySection } from "./discountsModal/PatientLoyaltySection.js";
import { DiscountsSummaryBox } from "./discountsModal/DiscountsSummaryBox.js";

export interface TreatmentPlanDiscountsModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly discountPercent: number;
	readonly setDiscountPercent: (pct: number) => void;
	readonly bonusPointsToUseRub: number;
	readonly setBonusPointsToUseRub: (rub: number) => void;
	readonly patientBalanceRub: number;
	readonly planGrossKopecks?: Kopecks | number | undefined;
}

export const TreatmentPlanDiscountsModal: React.FC<TreatmentPlanDiscountsModalProps> = ({
	isOpen,
	onClose,
	discountPercent,
	setDiscountPercent,
	bonusPointsToUseRub,
	setBonusPointsToUseRub,
	patientBalanceRub,
	planGrossKopecks,
}) => {
	const summary = useMemo(() => {
		if (!planGrossKopecks || Number(planGrossKopecks) <= 0) return null;
		return calculateLoyaltyBonusDeduction(
			Number(planGrossKopecks) as Kopecks,
			discountPercent,
			patientBalanceRub,
			bonusPointsToUseRub,
		);
	}, [planGrossKopecks, discountPercent, patientBalanceRub, bonusPointsToUseRub]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="tp-discounts-title"
			data-testid="treatment-plan-discounts-modal"
		>
			<div className="relative w-full max-w-lg p-5 rounded-3xl bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] border border-[var(--line,var(--border,#cbd5e1))] shadow-2xl space-y-4">
				{/* Header */}
				<div className="flex items-center justify-between pb-3 border-b border-[var(--line,var(--border,#cbd5e1))]">
					<div className="flex items-center gap-2">
						<div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
							<Percent size={18} />
						</div>
						<div>
							<h3 id="tp-discounts-title" className="text-sm font-black m-0">
								Скидки и бонусы пациента
							</h3>
							<p className="text-xs text-[var(--muted,#64748b)] m-0">
								Врачебная автономия: скидки от 0 до 100% без согласований
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-1.5 rounded-xl hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer"
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				<DoctorDiscountsSelector
					discountPercent={discountPercent}
					setDiscountPercent={setDiscountPercent}
				/>

				<PatientLoyaltySection
					patientBalanceRub={patientBalanceRub}
					bonusPointsToUseRub={bonusPointsToUseRub}
					setBonusPointsToUseRub={setBonusPointsToUseRub}
				/>

				{summary && (
					<DiscountsSummaryBox summary={summary} discountPercent={discountPercent} />
				)}

				<div className="pt-3 border-t border-[var(--line,var(--border,#cbd5e1))] flex justify-end">
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--teal,var(--brand-primary))] text-white hover:bg-[var(--teal-dark,var(--teal))] cursor-pointer shadow-xs"
					>
						Готово
					</button>
				</div>
			</div>
		</div>
	);
};

export default TreatmentPlanDiscountsModal;
