import React from "react";
import { ShieldCheck, X } from "lucide-react";

export interface DoctorShiftCloseHeaderProps {
	readonly doctorFullName: string;
	readonly doctorSpecialtyRu: string;
	readonly todayLabel: string;
	readonly onClose: () => void;
}

export const DoctorShiftCloseHeader: React.FC<DoctorShiftCloseHeaderProps> = ({
	doctorFullName,
	doctorSpecialtyRu,
	todayLabel,
	onClose,
}) => {
	return (
		<div className="shrink-0 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]">
			{/* Mobile Drag Handle (Apple HIG Bottom Sheet standard: 36x5px) */}
			<div className="sm:hidden flex items-center justify-center pt-2.5 pb-1">
				<div
					className="w-9 h-1.25 rounded-full bg-[var(--line,#cbd5e1)] opacity-70"
					aria-hidden="true"
				/>
			</div>

			<div className="px-4 sm:px-5 py-3.5 flex items-center justify-between">
				<div className="flex items-center gap-3 min-w-0">
					<div className="w-10 h-10 rounded-xl bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] flex items-center justify-center border border-[var(--teal,#0d9488)]/20 shrink-0">
						<ShieldCheck className="w-5 h-5" />
					</div>
					<div className="min-w-0">
						<h2
							id="shift-close-modal-title"
							className="text-sm sm:text-base font-bold leading-tight truncate text-[var(--ink,#0f172a)]"
						>
							Завершение рабочей смены врача
						</h2>
						<p className="text-xs text-[var(--muted,#64748b)] mt-0.5 truncate">
							{doctorFullName} · {doctorSpecialtyRu} · {todayLabel}
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={onClose}
					className="icon-button min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] shrink-0"
					aria-label="Закрыть модальное окно"
					data-testid="shift-close-modal-close-btn"
				>
					<X className="w-5 h-5" />
				</button>
			</div>
		</div>
	);
};
