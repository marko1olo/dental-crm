/**
 * TreatmentPlanPresenterFooter.tsx — прикрепленный подвал модального окна презентации планов лечения
 * с кнопками фиксации выбора пациента, печати и подписания.
 */

import React from "react";
import { Check, CheckCircle2, FileSignature, Printer } from "lucide-react";
import type { TreatmentPlanTier, TreatmentPlanTierId } from "./types";

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

export const TreatmentPlanPresenterFooter: React.FC<TreatmentPlanPresenterFooterProps> = ({
	selectedTier,
	getTierLetter,
	onPrintAppendix,
	onConfirmPatientChoice,
	onApproveAndSign,
	isChoiceConfirmed,
	patientChoiceBtnText,
	choiceConfirmedBtnText,
}) => {
	return (
		<footer className="treatment-presenter-footer no-print">
			<div className="treatment-footer-summary">
				<div className="treatment-footer-price-col">
					<span className="treatment-footer-label">
						Текущий выбор: <strong>{getTierLetter(selectedTier.tierId)}</strong>
					</span>
					<span className="treatment-footer-amount">
						{selectedTier.totalRub.toLocaleString("ru-RU")} ₽
					</span>
				</div>
			</div>

			<div className="treatment-footer-actions">
				{/* Print Appendix 1 Action */}
				<button
					type="button"
					onClick={onPrintAppendix}
					className="btn-treatment-action btn-treatment-print cursor-pointer"
					data-testid="print-contract-btn"
				>
					<Printer size={16} />
					<span>Печать Приложения №1 (ПП РФ № 736)</span>
				</button>

				{/* Fixate Patient Choice Action */}
				<button
					type="button"
					onClick={() => onConfirmPatientChoice(selectedTier)}
					className="btn-treatment-action btn-patient-choice cursor-pointer"
					data-testid="confirm-patient-choice-btn"
				>
					{isChoiceConfirmed ? (
						<>
							<CheckCircle2 size={18} />
							<span>{choiceConfirmedBtnText}</span>
						</>
					) : (
						<>
							<Check size={18} />
							<span>{patientChoiceBtnText}</span>
						</>
					)}
				</button>

				{/* Quick Direct Sign Action (Doctor & Patient Autonomy / Mandate 8e) */}
				{onApproveAndSign && (
					<button
						type="button"
						onClick={() => onApproveAndSign(selectedTier)}
						className="btn-treatment-action btn-treatment-sign cursor-pointer"
						data-testid="approve-and-sign-btn"
					>
						<FileSignature size={18} />
						<span>Подписать план лечения</span>
					</button>
				)}
			</div>
		</footer>
	);
};
