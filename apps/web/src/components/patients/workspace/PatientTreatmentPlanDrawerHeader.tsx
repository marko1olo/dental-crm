import React from "react";
import { Layers, X } from "lucide-react";

export interface PatientTreatmentPlanDrawerHeaderProps {
	initialPlanId?: string | null | undefined;
	patientDisplayName: string;
	onClose: () => void;
}

export const PatientTreatmentPlanDrawerHeader: React.FC<PatientTreatmentPlanDrawerHeaderProps> = ({
	initialPlanId,
	patientDisplayName,
	onClose,
}) => {
	return (
		<>
			{/* Мобильный Drag Handle (Apple HIG) */}
			<div className="w-full pt-2 pb-1 flex justify-center sm:hidden" aria-hidden="true">
				<div className="w-9 h-1 rounded-full bg-[var(--line-strong,rgba(150,150,150,0.4))]" />
			</div>

			{/* Шапка модального окна */}
			<div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,var(--card,#f8fafc))] shrink-0">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="w-8 h-8 rounded-lg bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
						<Layers className="w-4 h-4" />
					</div>
					<div className="flex flex-col min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<h3
								id="plan-drawer-modal-title"
								className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] m-0 leading-tight"
							>
								{initialPlanId ? "Редактирование плана лечения" : "Конструктор планов лечения"}
							</h3>
							<span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/20 shrink-0">
								{initialPlanId ? "Текущий план" : "Новый план"}
							</span>
						</div>
						<p className="text-xs text-[var(--muted,#64748b)] m-0 truncate mt-0.5">
							Пациент: <span className="font-semibold text-[var(--ink,#0f172a)]">{patientDisplayName}</span>
						</p>
					</div>
				</div>

				{/* Кнопка закрытия по Apple HIG (тач-таргет >= 44x44px) */}
				<button
					type="button"
					onClick={onClose}
					className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl flex items-center justify-center bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] transition-colors cursor-pointer shrink-0 shadow-xs"
					aria-label="Закрыть план лечения"
					title="Закрыть (Esc)"
					data-testid="btn-close-plan-modal"
				>
					<X className="w-5 h-5" />
				</button>
			</div>
		</>
	);
};
