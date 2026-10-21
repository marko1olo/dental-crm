import React from "react";
import { Lock, ShieldCheck } from "lucide-react";
import type { TreatmentPlanSignMethod } from "./types";

export interface SignatureModalFooterProps {
	readonly isSubmitting: boolean;
	readonly signMethod: TreatmentPlanSignMethod;
	readonly smsSent: boolean;
	readonly hasConflicts: boolean;
	readonly onClose: () => void;
	readonly onPaperConfirm: () => void;
	readonly onConfirmAgreement: () => void;
}

export const SignatureModalFooter: React.FC<SignatureModalFooterProps> = ({
	isSubmitting,
	signMethod,
	smsSent,
	hasConflicts,
	onClose,
	onPaperConfirm,
	onConfirmAgreement,
}) => {
	const conflictTitle = hasConflicts
		? "Внимание: в плане имеются клинические предупреждения. План будет утверждён под клиническую ответственность врача."
		: undefined;

	return (
		<div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 p-4 border-t border-[var(--border)] bg-[var(--paper-soft)]">
			<button
				type="button"
				onClick={onClose}
				className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-strong)] border border-[var(--border)] transition-colors cursor-pointer"
			>
				Отмена
			</button>

			<button
				type="button"
				onClick={onPaperConfirm}
				aria-busy={isSubmitting}
				disabled={isSubmitting}
				title={conflictTitle}
				className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
				data-testid="paper-signature-confirm-btn"
			>
				<ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
				<span>Утвердить и подписать на бумаге</span>
			</button>

			<button
				type="button"
				onClick={onConfirmAgreement}
				aria-busy={isSubmitting}
				disabled={isSubmitting}
				title={conflictTitle}
				className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-extrabold text-white transition-all bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
				data-testid="confirm-sign-plan-btn"
			>
				<Lock size={14} />
				<span>{isSubmitting ? "Сохранение..." : signMethod === "sms" && smsSent ? "Подтвердить СМС-код и утвердить" : "Утвердить и подписать"}</span>
			</button>
		</div>
	);
};
