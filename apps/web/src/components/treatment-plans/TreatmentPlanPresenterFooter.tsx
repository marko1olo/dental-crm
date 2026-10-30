/**
 * TreatmentPlanPresenterFooter.tsx — прикрепленный подвал модального окна презентации планов лечения
 * с кнопками фиксации выбора пациента, печати и подписания.
 */

import { Check, CheckCircle2, FileSignature, Printer } from "lucide-react";
import React from "react";
import type { TreatmentPlanTier, TreatmentPlanTierId } from "./types";
import { getTierShortLabel } from "./TreatmentPlan3TierComparison";

export interface TreatmentPlanPresenterFooterProps {
	readonly selectedTier: TreatmentPlanTier;
	readonly getTierLetter: (tierId: TreatmentPlanTierId) => string;
	readonly onPrintAppendix: () => void;
	readonly onConfirmPatientChoice: (tier: TreatmentPlanTier) => void;
	readonly onApproveAndSign?: ((tier: TreatmentPlanTier) => void) | undefined;
	readonly isChoiceConfirmed: boolean;
	readonly patientChoiceBtnText: string;
	readonly choiceConfirmedBtnText: string;
}

export const TreatmentPlanPresenterFooter: React.FC<
	TreatmentPlanPresenterFooterProps
> = ({
	selectedTier,
	getTierLetter,
	onPrintAppendix,
	onConfirmPatientChoice,
	onApproveAndSign,
	isChoiceConfirmed,
	patientChoiceBtnText,
	choiceConfirmedBtnText,
}) => {
	const shortTierLabel = getTierShortLabel(selectedTier);
	const tierPriceFormatted = (selectedTier.totalRub || 0).toLocaleString("ru-RU");

	return (
		<footer className="treatment-presenter-footer no-print">
			<div className="treatment-footer-summary">
				<div className="treatment-footer-price-col">
					<span className="treatment-footer-label">
						Текущий выбор: <strong>{getTierLetter(selectedTier.tierId)}</strong>
					</span>
					<span className="treatment-footer-amount">
						{tierPriceFormatted} ₽
					</span>
				</div>
			</div>

			<div className="treatment-footer-actions">
				{/* Fixate Patient Choice Action (Primary CTA per Apple HIG) */}
				<button
					type="button"
					onClick={() => onConfirmPatientChoice(selectedTier)}
					className="btn-treatment-action btn-patient-choice primary-button cursor-pointer"
					data-testid="confirm-patient-choice-btn"
				>
					{isChoiceConfirmed ? (
						<>
							<CheckCircle2 size={18} className="shrink-0" />
							<span>{choiceConfirmedBtnText}</span>
						</>
					) : (
						<>
							<Check size={18} className="shrink-0" />
							<span className="hidden sm:inline">{patientChoiceBtnText}</span>
							<span className="sm:hidden">
								Выбрать {shortTierLabel} ({tierPriceFormatted} ₽)
							</span>
						</>
					)}
				</button>

				{/* Secondary actions container (side-by-side on mobile, inline on desktop) */}
				<div className="treatment-footer-secondary-actions flex items-center gap-2 w-full sm:w-auto">
					{/* Print Appendix 1 Action */}
					<button
						type="button"
						onClick={onPrintAppendix}
						className="btn-treatment-action btn-treatment-print secondary-button cursor-pointer flex-1 sm:flex-initial"
						data-testid="print-contract-btn"
					>
						<Printer size={16} className="shrink-0" />
						<span>Печать сметы плана</span>
					</button>

					{/* Quick Direct Sign Action (Doctor & Patient Autonomy / Mandate 8e) */}
					{onApproveAndSign && (
						<button
							type="button"
							onClick={() => onApproveAndSign(selectedTier)}
							className="btn-treatment-action btn-treatment-sign secondary-button cursor-pointer flex-1 sm:flex-initial"
							data-testid="approve-and-sign-btn"
						>
							<FileSignature size={18} className="shrink-0" />
							<span>Подписать план лечения</span>
						</button>
					)}
				</div>
			</div>
		</footer>
	);
};
