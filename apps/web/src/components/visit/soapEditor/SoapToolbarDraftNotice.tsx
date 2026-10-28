import { Check, Clock, X } from "lucide-react";
import React from "react";

export interface SoapToolbarDraftNoticeProps {
	readonly unsavedDraftNotice: { timeStr: string } | null;
	readonly onRestoreDraft: () => void;
	readonly onDiscardDraft: () => void;
}

export const SoapToolbarDraftNotice: React.FC<SoapToolbarDraftNoticeProps> = ({
	unsavedDraftNotice,
	onRestoreDraft,
	onDiscardDraft,
}) => {
	if (!unsavedDraftNotice) return null;

	return (
		<div
			data-testid="banner-draft-recovery"
			role="alert"
			className="flex items-center justify-between gap-3 px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs shrink-0"
		>
			<div className="flex items-center gap-2 min-w-0">
				<Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
				<span className="font-medium truncate">
					Обнаружен несохранённый черновик от {unsavedDraftNotice.timeStr}
				</span>
			</div>
			<div className="flex items-center gap-1.5 shrink-0">
				<button
					type="button"
					onClick={onRestoreDraft}
					data-testid="btn-restore-draft"
					className="min-h-[26px] h-[26px] px-2.5 text-xs font-bold rounded-md bg-teal-600 hover:bg-teal-700 text-white cursor-pointer transition-colors shadow-2xs inline-flex items-center gap-1"
					aria-label="Восстановить черновик"
				>
					<Check className="w-3 h-3" />
					<span>Восстановить</span>
				</button>
				<button
					type="button"
					onClick={onDiscardDraft}
					data-testid="btn-discard-draft"
					className="min-h-[26px] h-[26px] px-2 text-xs font-semibold rounded-md bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] cursor-pointer transition-colors inline-flex items-center gap-1"
					aria-label="Сбросить черновик"
				>
					<X className="w-3 h-3 text-[var(--muted)]" />
					<span>Сбросить</span>
				</button>
			</div>
		</div>
	);
};
