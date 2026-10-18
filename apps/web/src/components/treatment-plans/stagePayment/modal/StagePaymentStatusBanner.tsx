import React from "react";
import { Sparkles } from "lucide-react";

export interface StagePaymentStatusBannerProps {
	readonly message: string | null;
	readonly onClose: () => void;
}

export const StagePaymentStatusBanner: React.FC<StagePaymentStatusBannerProps> = ({ message, onClose }) => {
	if (!message) return null;

	return (
		<div className="bg-[var(--teal-soft,var(--paper-soft))] border-b border-[var(--teal,var(--brand-primary))]/20 px-6 py-2.5 flex items-center justify-between text-xs text-[var(--teal-dark,var(--teal))] no-print">
			<div className="flex items-center gap-2">
				<Sparkles className="h-4 w-4 shrink-0 text-[var(--teal,var(--brand-primary))]" />
				<span>{message}</span>
			</div>
			<button
				type="button"
				onClick={onClose}
				className="text-[var(--teal,var(--brand-primary))] hover:text-[var(--teal-dark,var(--teal))] font-semibold"
			>
				Закрыть
			</button>
		</div>
	);
};
