/**
 * DENTE Dental CRM — Doctor Chair Footer Actions (Layer 4)
 *
 * Unassign chair button, cancel button, and confirm assignment button.
 */

import React from "react";
import { Check, Trash2 } from "lucide-react";

export interface DoctorChairFooterActionsProps {
	hasActiveAssignment: boolean;
	onUnassign: () => void;
	onClose: () => void;
	onConfirm: () => void;
}

export const DoctorChairFooterActions: React.FC<DoctorChairFooterActionsProps> = ({
	hasActiveAssignment,
	onUnassign,
	onClose,
	onConfirm,
}) => {
	return (
		<div className="flex items-center justify-between gap-2 pt-3 border-t border-[var(--line)]">
			{hasActiveAssignment ? (
				<button
					type="button"
					onClick={onUnassign}
					className="min-h-[44px] px-3.5 rounded-xl border border-[var(--danger-line)] bg-[var(--danger-soft)] hover:bg-[var(--danger-soft)]/80 text-[var(--danger)] text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
					data-testid="btn-unassign-chair-doctor"
					title="Снять назначение врача с кресла"
					style={{ minHeight: "44px" }}
				>
					<Trash2 size={15} />
					<span>Снять назначение</span>
				</button>
			) : (
				<div />
			)}
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onClose}
					className="min-h-[44px] px-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink-muted)] hover:text-[var(--ink)] text-xs font-semibold transition-colors cursor-pointer"
					style={{ minHeight: "44px" }}
				>
					Отмена
				</button>
				<button
					type="button"
					onClick={onConfirm}
					className="min-h-[44px] px-5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
					data-testid="btn-confirm-chair-doctor"
					style={{ minHeight: "44px" }}
				>
					<Check size={16} />
					<span>Закрепить за креслом</span>
				</button>
			</div>
		</div>
	);
};
