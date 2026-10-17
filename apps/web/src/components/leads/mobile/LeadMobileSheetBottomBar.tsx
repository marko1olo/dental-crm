/**
 * DENTE Dental CRM — Leads Mobile Bottom Sheet Bottom Action Bar
 * Sticky Primary CTA (Schedule Appointment) & Secondary (Create Patient Only)
 * Mandate 8b (<= 120 lines), Natural Thumb Zone
 */

import React from "react";
import { Calendar, UserPlus } from "lucide-react";
import type { Lead } from "../../../store/leadsStore";

interface LeadMobileSheetBottomBarProps {
	lead: Lead;
	onClose: () => void;
	onSchedule?: ((id: string) => void) | undefined;
	onQuickSchedule?: ((id: string) => Promise<void> | void) | undefined;
	onCreatePatient?: ((lead: Lead) => Promise<void> | void) | undefined;
	creatingPatientLeadId?: string | null | undefined;
}

export const LeadMobileSheetBottomBar: React.FC<LeadMobileSheetBottomBarProps> = ({
	lead, onClose, onSchedule, onQuickSchedule, onCreatePatient, creatingPatientLeadId,
}) => {
	const handleScheduleClick = () => {
		onClose();
		if (onQuickSchedule) onQuickSchedule(lead.id);
		else if (onSchedule) onSchedule(lead.id);
	};

	return (
		<div className="p-4 border-t border-[var(--line)] bg-[var(--paper)] space-y-2 pb-[max(16px,env(safe-area-inset-bottom))] shrink-0">
			<button
				type="button"
				onClick={handleScheduleClick}
				className="w-full min-h-[50px] rounded-[14px] font-bold text-[15px] flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all cursor-pointer"
				style={{
					background: "linear-gradient(135deg, var(--teal-fill, #0d9488), var(--teal-dark, #0f766e))",
					color: "#ffffff",
				}}
				data-testid="bottom-sheet-schedule-cta"
			>
				<Calendar size={18} />
				<span>Записать на приём в расписание</span>
			</button>

			{!lead.existingPatient && onCreatePatient && (
				<button
					type="button"
					onClick={() => onCreatePatient(lead)}
					disabled={creatingPatientLeadId === lead.id}
					className="w-full min-h-[44px] rounded-[12px] bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] font-semibold text-[13.5px] flex items-center justify-center gap-2 active:bg-[var(--paper)] transition-all cursor-pointer disabled:opacity-50"
					data-testid="bottom-sheet-create-patient-btn"
				>
					<UserPlus size={16} />
					<span>
						{creatingPatientLeadId === lead.id ? "Создание карты..." : "Создать карту пациента (без записи)"}
					</span>
				</button>
			)}
		</div>
	);
};
