/**
 * TreatmentPlanAcceptanceFooter.tsx — Блок фиксации и акцепта плана лечения пациентом
 * (Wave 19 / Chairside Digital Consent & Acceptance).
 */

import React, { useState } from "react";
import type { TreatmentPlanTier } from "./treatmentPlanPresenterTypes.js";
import { AcceptanceSignatureDrawer } from "./acceptanceFooter/AcceptanceSignatureDrawer.js";
import { AcceptanceFooterActions } from "./acceptanceFooter/AcceptanceFooterActions.js";

export interface TreatmentPlanAcceptanceFooterProps {
	readonly selectedTier: TreatmentPlanTier;
	readonly isChoiceConfirmed: boolean;
	readonly onConfirmPatientChoice: (tier: TreatmentPlanTier) => void;
	readonly onPrintAppendix: () => void;
	readonly onApproveAndSign?: (tier: TreatmentPlanTier) => void;
	readonly patientChoiceBtnText?: string;
	readonly choiceConfirmedBtnText?: string;
}

export const TreatmentPlanAcceptanceFooter: React.FC<TreatmentPlanAcceptanceFooterProps> = ({
	selectedTier,
	isChoiceConfirmed,
	onConfirmPatientChoice,
	onPrintAppendix,
	onApproveAndSign,
	patientChoiceBtnText,
	choiceConfirmedBtnText,
}) => {
	const [showSignaturePad, setShowSignaturePad] = useState<boolean>(false);
	const [risksAccepted, setRisksAccepted] = useState<boolean>(true);
	const [hasSigned, setHasSigned] = useState<boolean>(false);

	const handleFinalAccept = () => {
		onConfirmPatientChoice(selectedTier);
		if (onApproveAndSign) {
			onApproveAndSign(selectedTier);
		}
		setShowSignaturePad(false);
	};

	return (
		<footer
			className="treatment-acceptance-footer sticky bottom-0 z-30 p-3 sm:p-4 bg-[var(--paper)]/95 backdrop-blur-md border-t border-[var(--line)] shadow-lg"
			data-testid="treatment-plan-acceptance-footer"
		>
			<div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
				{/* Левая часть: информация о сумме и выбранном плане */}
				<div className="flex items-center gap-3 w-full sm:w-auto">
					<div className="text-left">
						<span className="text-[11px] text-[var(--muted)] block">Выбранный вариант:</span>
						<span className="text-sm font-bold text-[var(--ink)]">
							{selectedTier.title} ({selectedTier.badge})
						</span>
					</div>
					<div className="h-6 w-px bg-[var(--line)] hidden sm:block" />
					<div className="text-left">
						<span className="text-[11px] text-[var(--muted)] block">Сумма к оплате:</span>
						<span className="text-base sm:text-lg font-black text-[var(--teal)] font-mono">
							{selectedTier.totalRub.toLocaleString("ru-RU")} ₽
						</span>
					</div>
				</div>

				<AcceptanceFooterActions
					selectedTier={selectedTier}
					isChoiceConfirmed={isChoiceConfirmed}
					hasSigned={hasSigned}
					onPrintAppendix={onPrintAppendix}
					onToggleSignaturePad={() => setShowSignaturePad((prev) => !prev)}
					onFinalAccept={handleFinalAccept}
					patientChoiceBtnText={patientChoiceBtnText}
					choiceConfirmedBtnText={choiceConfirmedBtnText}
				/>
			</div>

			{showSignaturePad && (
				<AcceptanceSignatureDrawer
					risksAccepted={risksAccepted}
					onRisksChange={setRisksAccepted}
					onSignedChange={setHasSigned}
				/>
			)}
		</footer>
	);
};
