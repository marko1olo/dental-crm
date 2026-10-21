/**
 * DENTE Dental CRM — Leads Kanban Master Modals
 * Mandate 8b (<= 120 lines)
 */

import React from "react";
import type { Lead } from "../../../store/leadsStore";
import { LeadsKanbanSharedModals } from "./LeadsKanbanSharedModals";
import type { useLeadFormState } from "./useLeadFormState";
import type { useLeadsKanbanViewState } from "./useLeadsKanbanViewState";

interface LeadsKanbanMasterModalsProps {
	v: ReturnType<typeof useLeadsKanbanViewState>;
	form: ReturnType<typeof useLeadFormState>;
	leads: Lead[];
	staff: Array<{ id: string; fullName: string; role?: string }>;
	chairs: Array<{ id: string; name: string }>;
	selectedDoctorId: string;
	setSelectedDoctorId: (id: string) => void;
	selectedChairId: string;
	setSelectedChairId: (id: string) => void;
	creatingPatientLeadId: string | null;
	handleCreatePatientFromLead: (lead: Lead) => void;
	handleConvertSubmit: () => Promise<void>;
}

export const LeadsKanbanMasterModals: React.FC<LeadsKanbanMasterModalsProps> = ({
	v,
	form,
	leads,
	staff,
	chairs,
	selectedDoctorId,
	setSelectedDoctorId,
	selectedChairId,
	setSelectedChairId,
	creatingPatientLeadId,
	handleCreatePatientFromLead,
	handleConvertSubmit,
}) => {
	return (
		<LeadsKanbanSharedModals
			isConvertOpen={v.isConvertOpen}
			onCloseConvert={() => v.setIsConvertOpen(false)}
			onConvertSubmit={handleConvertSubmit}
			staff={staff}
			chairs={chairs}
			selectedDoctorId={selectedDoctorId}
			setSelectedDoctorId={setSelectedDoctorId}
			selectedChairId={selectedChairId}
			setSelectedChairId={setSelectedChairId}
			appointmentDate={v.appointmentDate}
			setAppointmentDate={v.setAppointmentDate}
			appointmentTime={v.appointmentTime}
			setAppointmentTime={v.setAppointmentTime}
			isBooking={v.isBooking}
			convertingLead={leads.find((l) => l.id === v.convertingLeadId) || null}
			isEditOpen={form.isEditOpen}
			onCloseEdit={() => form.setIsEditOpen(false)}
			editingLeadId={form.editingLeadId}
			editForm={form.editForm}
			setEditForm={form.setEditForm}
			onEditSubmit={form.handleEditSubmit}
			isDeleting={form.isDeleting}
			onDeleteLead={() => void form.handleDeleteLead()}
			creatingPatientLeadId={creatingPatientLeadId}
			onCreatePatient={(lead) => void handleCreatePatientFromLead(lead)}
			leads={leads}
			isAnalyticsOpen={v.isAnalyticsOpen}
			onCloseAnalytics={() => v.setIsAnalyticsOpen(false)}
			isLeakDetectorOpen={v.isLeakDetectorOpen}
			onCloseLeakDetector={() => v.setIsLeakDetectorOpen(false)}
			onOpenLeakDetector={() => v.setIsLeakDetectorOpen(true)}
			cardBg="var(--paper)"
			colBg="var(--paper-soft)"
			borderColor="var(--line)"
		/>
	);
};
