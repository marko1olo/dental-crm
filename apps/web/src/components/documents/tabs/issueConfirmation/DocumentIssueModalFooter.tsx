import React from "react";
import { CheckCircle2 } from "lucide-react";

export interface DocumentIssueModalFooterProps {
	saving: boolean;
	onClose: () => void;
	onConfirm: () => void;
}

export const DocumentIssueModalFooter: React.FC<DocumentIssueModalFooterProps> = React.memo(
	function DocumentIssueModalFooter({ saving, onClose, onConfirm }) {
		return (
			<div className="flex items-center justify-between p-3 px-4 border-t border-[var(--line)] bg-[var(--paper-soft)]">
				<button
					type="button"
					disabled={saving}
					onClick={onClose}
					className="min-h-[38px] px-3.5 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xs hover:border-[var(--teal)] transition-colors cursor-pointer"
				>
					Вернуться
				</button>
				<button
					type="button"
					disabled={saving}
					aria-busy={saving || undefined}
					onClick={onConfirm}
					data-testid="btn-confirm-issue-primary"
					className="min-h-[38px] px-4 text-xs font-bold rounded-lg bg-[var(--teal)] text-white shadow-2xs hover:bg-[var(--teal-hover,var(--teal))] transition-colors inline-flex items-center gap-1.5 cursor-pointer border-none"
				>
					<CheckCircle2 className="w-4 h-4" />
					<span>{saving ? "Выдаю документ..." : "Выдать после проверки"}</span>
				</button>
			</div>
		);
	},
);
