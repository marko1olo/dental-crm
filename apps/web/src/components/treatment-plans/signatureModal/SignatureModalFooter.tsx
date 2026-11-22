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
		<div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 p-4 border-t border-[var(--line)] bg-[var(--paper-soft)] pb-[max(1rem,env(safe-area-inset-bottom))]">
			<button
				type="button"
				onClick={onClose}
				className="w-full sm:w-auto min-h-[44px] sm:h-9 px-4 rounded-xl sm:rounded-lg text-sm font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-[var(--line)] bg-[var(--paper)] transition-colors cursor-pointer"
			>
				Отмена
			</button>

			<button
				type="button"
				onClick={() => {
					if (isSubmitting) return;
					onPaperConfirm();
				}}
				aria-busy={isSubmitting}
				title={conflictTitle}
				className={`w-full sm:w-auto min-h-[44px] sm:h-9 flex items-center justify-center gap-2 px-4 rounded-xl sm:rounded-lg text-sm font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer ${
					isSubmitting ? "opacity-75" : ""
				}`}
				data-testid="paper-signature-confirm-btn"
			>
				<ShieldCheck className="w-4 h-4 shrink-0 text-current" />
				<span>Бумажный оригинал подписан пациентом</span>
			</button>

			<button
				type="button"
				onClick={() => {
					if (isSubmitting) return;
					onConfirmAgreement();
				}}
				aria-busy={isSubmitting}
				title={conflictTitle}
				className={`w-full sm:w-auto min-h-[44px] sm:h-9 flex items-center justify-center gap-2 px-5 rounded-xl sm:rounded-lg text-sm font-medium text-white transition-all bg-[var(--primary)] hover:bg-[var(--primary-hover)] shadow-sm cursor-pointer ${
					isSubmitting ? "opacity-75" : ""
				}`}
				data-testid="confirm-sign-plan-btn"
			>
				<Lock className="w-4 h-4 shrink-0 text-current" />
				<span>{isSubmitting ? "Сохранение..." : signMethod === "sms" && smsSent ? "Подтвердить СМС-код и утвердить" : "Утвердить и подписать"}</span>
			</button>
		</div>
	);
};
