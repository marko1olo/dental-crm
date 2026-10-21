/**
 * apps/web/src/components/patients/drawer/PatientDrawerFooter.tsx
 * Footer actions for patient slide-over drawer.
 * Mandate 8b: strictly <= 120 lines.
 */
import React from "react";

export interface PatientDrawerFooterProps {
	readonly onClose: () => void;
}

export const PatientDrawerFooter: React.FC<PatientDrawerFooterProps> =
	React.memo(function PatientDrawerFooter({ onClose }) {
		return (
			<div className="px-5 py-3 border-t border-[var(--glass-border)] bg-[var(--paper-strong)] flex items-center justify-between shrink-0">
				<span className="text-[11px] text-[var(--muted)]">
					DENTE Medical Suite
				</span>
				<button
					type="button"
					onClick={onClose}
					className="min-h-[44px] sm:min-h-[36px] h-9 px-3.5 border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] rounded-xl transition-colors cursor-pointer shadow-2xs"
				>
					Закрыть
				</button>
			</div>
		);
	});
