/**
 * DENTE Dental CRM — Lead Card Primary & Secondary Action Buttons
 * Mandate 8n (Anti-Landfill & Solo Doctor Autonomy), Mandate 8b (<= 120 lines)
 */

import React from "react";
import { Calendar, UserCheck, UserPlus } from "lucide-react";
import type { Lead } from "../../../store/leadsStore";

interface LeadCardActionButtonsProps {
	lead: Lead;
	creatingPatientLeadId: string | null;
	onSchedule: (leadId: string) => void;
	onCreatePatient: (lead: Lead) => Promise<void> | void;
	onOpenPatient: (e: React.MouseEvent, patientId: string) => void;
}

export const LeadCardActionButtons: React.FC<LeadCardActionButtonsProps> = ({
	lead,
	creatingPatientLeadId,
	onSchedule,
	onCreatePatient,
	onOpenPatient,
}) => {
	return (
		<div
			className="flex flex-col gap-1.5 mt-2"
			onClick={(e) => e.stopPropagation()}
		>
			{/* Действие 1: Записать в сетку расписания (Primary CTA) */}
			{lead.status !== "trash" && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onSchedule(lead.id);
					}}
					className="primary-button w-full h-8 min-h-[32px] text-[12.5px] font-bold px-2.5 rounded-lg bg-[var(--teal)] text-white shadow-2xs hover:opacity-90 active:scale-[0.98] transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
					data-testid={`schedule-lead-btn-${lead.id}`}
					title="Записать в сетку расписания"
				>
					<Calendar size={13} className="shrink-0" />
					<span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
						Записать на приём
					</span>
				</button>
			)}

			{/* Действие 2: Создать амбулаторную карту пациента или открыть существующую (Secondary CTA) */}
			{lead.existingPatient ? (
				<button
					type="button"
					onClick={(e) => onOpenPatient(e, lead.existingPatient!.id)}
					className="secondary-button w-full h-8 min-h-[32px] text-[12.5px] font-bold px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xs hover:border-[var(--teal)] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
					data-testid={`open-patient-btn-${lead.id}`}
					title={`Открыть амбулаторную карту пациента ${lead.existingPatient.fullName}`}
				>
					<UserCheck size={13} className="shrink-0 text-[var(--teal)]" />
					<span className="truncate">Карточка пациента</span>
				</button>
			) : (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						void onCreatePatient(lead);
					}}
					disabled={creatingPatientLeadId === lead.id}
					className="secondary-button w-full h-8 min-h-[32px] text-[12.5px] font-bold px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xs hover:border-[var(--teal)] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
					data-testid={`create-patient-btn-${lead.id}`}
					title="Создать карту пациента из обращения"
				>
					<UserPlus size={13} className="shrink-0 text-[var(--teal)]" />
					<span className="truncate">
						{creatingPatientLeadId === lead.id ? "Создаём карту…" : "Создать карту пациента"}
					</span>
				</button>
			)}
		</div>
	);
};
