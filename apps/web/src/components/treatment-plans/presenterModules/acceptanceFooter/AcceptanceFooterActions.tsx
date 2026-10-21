import React from "react";
import { Printer, PenTool, Check, CheckCircle } from "lucide-react";
import type { TreatmentPlanTier } from "../treatmentPlanPresenterTypes.js";

export interface AcceptanceFooterActionsProps {
	readonly selectedTier: TreatmentPlanTier;
	readonly isChoiceConfirmed: boolean;
	readonly hasSigned: boolean;
	readonly onPrintAppendix: () => void;
	readonly onToggleSignaturePad: () => void;
	readonly onFinalAccept: () => void;
	readonly patientChoiceBtnText?: string | undefined;
	readonly choiceConfirmedBtnText?: string | undefined;
}

export const AcceptanceFooterActions: React.FC<AcceptanceFooterActionsProps> = ({
	selectedTier,
	isChoiceConfirmed,
	hasSigned,
	onPrintAppendix,
	onToggleSignaturePad,
	onFinalAccept,
	patientChoiceBtnText,
	choiceConfirmedBtnText,
}) => {
	return (
		<div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
			<button
				type="button"
				onClick={onPrintAppendix}
				className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer transition-all active:scale-98"
				data-testid="presenter-print-appendix-btn"
			>
				<Printer size={16} />
				<span>Печать формы</span>
			</button>

			<button
				type="button"
				onClick={onToggleSignaturePad}
				className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer transition-all active:scale-98"
				data-testid="toggle-signature-pad-btn"
			>
				<PenTool size={16} />
				<span>{hasSigned ? "Подписано пациентом" : "Подпись на планшете"}</span>
			</button>

			<button
				type="button"
				onClick={onFinalAccept}
				className={`min-h-[44px] px-5 py-2 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 shadow-sm ${
					isChoiceConfirmed
						? "bg-emerald-600 hover:bg-emerald-700 text-white"
						: "bg-[var(--teal)] hover:bg-[var(--teal-strong,var(--teal))] text-white"
				}`}
				data-testid="confirm-patient-plan-btn"
			>
				{isChoiceConfirmed ? <Check size={18} /> : <CheckCircle size={18} />}
				<span>
					{isChoiceConfirmed
						? (choiceConfirmedBtnText || "Выбор утвержден")
						: (patientChoiceBtnText || `Пациент выбрал ${selectedTier.badge}`)}
				</span>
			</button>
		</div>
	);
};
