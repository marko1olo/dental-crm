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
		<div className="flex items-center justify-between gap-2 pt-3 border-t border-[var(--line,#e2e8f0)]">
			{hasActiveAssignment ? (
				<button
					type="button"
					onClick={onUnassign}
					className="min-h-[44px] px-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
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
					className="min-h-[44px] px-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] text-xs font-bold transition-colors cursor-pointer"
					style={{ minHeight: "44px" }}
				>
					Отмена
				</button>
				<button
					type="button"
					onClick={onConfirm}
					className="min-h-[44px] px-5 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
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
