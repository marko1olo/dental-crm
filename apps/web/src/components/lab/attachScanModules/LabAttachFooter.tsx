import React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

export function LabAttachFooter({
	onClose,
	isSubmitting,
	canSubmit,
}: {
	readonly onClose: () => void;
	readonly isSubmitting: boolean;
	readonly canSubmit: boolean;
}) {
	return (
		<div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)]">
			<button
				type="button"
				onClick={onClose}
				aria-busy={isSubmitting}
				className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--line,#e2e8f0)] font-medium text-xs transition-colors cursor-pointer"
			>
				Отмена
			</button>
			<button
				type="submit"
				aria-busy={isSubmitting}
				className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 rounded-lg font-bold text-xs text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
				data-testid="lab-attach-scan-submit-btn"
			>
				{isSubmitting ? (
					<Loader2 className="w-3.5 h-3.5 animate-spin" />
				) : (
					<CheckCircle2 className="w-3.5 h-3.5" />
				)}
				<span>Сохранить файл</span>
			</button>
		</div>
	);
}
