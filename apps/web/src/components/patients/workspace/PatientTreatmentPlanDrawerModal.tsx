import React, { useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Layers, X } from "lucide-react";
import { TreatmentPlanModule } from "../../treatment-plans/TreatmentPlanModule";
import { loadStoredTeethData } from "../../odontogram/odontogramStorage";

export interface PatientTreatmentPlanDrawerModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId: string;
	readonly activePatient?: any;
	readonly organizationId?: string;
	readonly initialPlanId?: string | null;
	readonly onPlanSaved?: (planId: string) => void;
}

export const PatientTreatmentPlanDrawerModal: React.FC<PatientTreatmentPlanDrawerModalProps> = React.memo(
	function PatientTreatmentPlanDrawerModal({ isOpen, onClose, patientId, activePatient, initialPlanId, onPlanSaved }) {
		useEffect(() => {
			if (!isOpen) return;
			const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
			window.addEventListener("keydown", handleKeyDown);
			return () => window.removeEventListener("keydown", handleKeyDown);
		}, [isOpen, onClose]);

		const teethData = useMemo(() => (!patientId ? [] : loadStoredTeethData(patientId) || []), [patientId]);
		const patientDisplayName = useMemo(() => activePatient?.fullName || activePatient?.name || "Пациент", [activePatient]);
		const handleBackdrop = useCallback((e: React.MouseEvent<HTMLDivElement>) => { if (e.target === e.currentTarget) onClose(); }, [onClose]);
		const handlePlanSaved = useCallback((savedId: string) => { onPlanSaved?.(savedId); window.dispatchEvent(new CustomEvent("dente-treatment-plans-reload")); }, [onPlanSaved]);

		if (!isOpen) return null;

		const modalContent = (
			<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-black/60 backdrop-blur-md transition-opacity animate-fadeIn" onClick={handleBackdrop} role="dialog" aria-modal="true" aria-labelledby="plan-drawer-modal-title" data-testid="patient-treatment-plan-drawer-modal">
				<div className="w-full sm:max-w-7xl max-h-[96vh] sm:max-h-[92vh] bg-[var(--paper,var(--background,#ffffff))] text-[var(--ink,#0f172a)] rounded-t-[24px] sm:rounded-2xl border border-[var(--line,#e2e8f0)] shadow-2xl flex flex-col overflow-hidden animate-slideUp" onClick={(e) => e.stopPropagation()}>
					<div className="w-full pt-2 pb-1 flex justify-center sm:hidden" aria-hidden="true"><div className="w-9 h-1 rounded-full bg-[var(--line-strong,rgba(150,150,150,0.4))]" /></div>
					<div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,var(--card,#f8fafc))] shrink-0">
						<div className="flex items-center gap-2.5 min-w-0">
							<div className="w-8 h-8 rounded-lg bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0"><Layers className="w-4 h-4" /></div>
							<div className="flex flex-col min-w-0">
								<div className="flex items-center gap-2 flex-wrap">
									<h3 id="plan-drawer-modal-title" className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] m-0 leading-tight">{initialPlanId ? "Редактирование плана лечения" : "Конструктор планов лечения"}</h3>
									<span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/20 shrink-0">{initialPlanId ? "Текущий план" : "Новый план"}</span>
								</div>
								<p className="text-xs text-[var(--muted,#64748b)] m-0 truncate mt-0.5">Пациент: <span className="font-semibold text-[var(--ink,#0f172a)]">{patientDisplayName}</span></p>
							</div>
						</div>
						<button type="button" onClick={onClose} className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl flex items-center justify-center bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] transition-colors cursor-pointer shrink-0 shadow-xs" aria-label="Закрыть план лечения" title="Закрыть (Esc)" data-testid="btn-close-plan-modal"><X className="w-5 h-5" /></button>
					</div>
					<div className="flex-1 overflow-y-auto p-3 sm:p-5">
						<TreatmentPlanModule patientId={patientId} patientName={patientDisplayName} teethData={teethData} initialPlanId={initialPlanId} onPlanSaved={handlePlanSaved} />
					</div>
				</div>
			</div>
		);
		return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
	},
);
PatientTreatmentPlanDrawerModal.displayName = "PatientTreatmentPlanDrawerModal";
