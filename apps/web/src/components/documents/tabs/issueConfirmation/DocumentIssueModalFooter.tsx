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
					onClick={() => {
						if (saving) return;
						onClose();
					}}
					className="inline-flex items-center justify-center min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3.5 text-sm font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shrink-0"
				>
					Вернуться
				</button>
				<button
					type="button"
					aria-busy={saving || undefined}
					onClick={() => {
						if (saving) return;
						onConfirm();
					}}
					data-testid="btn-confirm-issue-primary"
					className="inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-4 text-sm font-medium rounded-lg bg-[var(--primary)] text-white shadow-xs hover:bg-[var(--primary-hover)] transition-colors cursor-pointer shrink-0 border-none"
				>
					<CheckCircle2 className="w-4 h-4 shrink-0" />
					<span>{saving ? "Выдаю документ..." : "Выдать / Подтвердить"}</span>
				</button>
			</div>
		);
	},
);
