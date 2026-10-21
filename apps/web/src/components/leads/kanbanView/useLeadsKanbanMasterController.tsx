/**
 * DENTE Dental CRM — Leads Kanban Master Controller Hook
 * Mandate 8b (<= 120 lines)
 */

import React from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { useIsMobile } from "../../../hooks/useIsMobile";
import { useLeadsStore } from "../../../store/leadsStore";
import { LeadsKanbanMasterModals } from "./LeadsKanbanMasterModals";
import { useLeadAppointmentConversionBridge } from "./useLeadAppointmentConversionBridge";
import { useLeadBookingNavigation } from "./useLeadBookingNavigation";
import { useLeadDragAndDrop } from "./useLeadDragAndDrop";
import { useLeadFormState } from "./useLeadFormState";
import { useLeadPatientCreator } from "./useLeadPatientCreator";
import { useLeadStaffChairs } from "./useLeadStaffChairs";
import { useLeadsKanbanViewState } from "./useLeadsKanbanViewState";

export function useLeadsKanbanMasterController() {
	const {
		leads,
		fetchLeads,
		updateLeadStatus,
		batchUpdateStage,
		updateLeadDetails,
		addLead,
		deleteLead,
		convertLeadToAppointment,
		createPatientFromLead,
		isLoading,
		error: loadError,
	} = useLeadsStore();
	const { dashboard } = useAppLogicContext();
	const isMobile = useIsMobile(768);
	const visitMinutes = dashboard?.clinicSettings?.profile?.defaultVisitMinutes ?? null;
	const clinicTimeZone = dashboard?.clinicSettings?.profile?.timezone ?? null;

	const { navigateToScheduleWithBooking, handleOpenPatientCard } = useLeadBookingNavigation();
	const { creatingPatientLeadId, handleCreatePatientFromLead } = useLeadPatientCreator(
		createPatientFromLead,
		fetchLeads,
		handleOpenPatientCard,
	);
	const {
		staff,
		chairs,
		selectedDoctorId,
		setSelectedDoctorId,
		selectedChairId,
		setSelectedChairId,
	} = useLeadStaffChairs(dashboard);
	const v = useLeadsKanbanViewState(leads, fetchLeads, clinicTimeZone);

	const { handleQuickSchedule, handleConvertSubmit } = useLeadAppointmentConversionBridge({
		leads,
		staff,
		chairs,
		selectedDoctorId,
		selectedChairId,
		v,
		visitMinutes,
		clinicTimeZone,
		convertLeadToAppointment,
		fetchLeads,
		navigateToScheduleWithBooking,
	});
	const form = useLeadFormState({ addLead, updateLeadDetails, deleteLead });
	const dnd = useLeadDragAndDrop(updateLeadStatus);

	const modals = (
		<LeadsKanbanMasterModals
			v={v}
			form={form}
			leads={leads}
			staff={staff}
			chairs={chairs}
			selectedDoctorId={selectedDoctorId}
			setSelectedDoctorId={setSelectedDoctorId}
			selectedChairId={selectedChairId}
			setSelectedChairId={setSelectedChairId}
			creatingPatientLeadId={creatingPatientLeadId}
			handleCreatePatientFromLead={handleCreatePatientFromLead}
			handleConvertSubmit={handleConvertSubmit}
		/>
	);

	return {
		leads,
		isLoading,
		loadError,
		isMobile,
		v,
		form,
		dnd,
		staff,
		creatingPatientLeadId,
		handleCreatePatientFromLead,
		handleQuickSchedule,
		handleOpenPatientCard,
		updateLeadDetails,
		updateLeadStatus,
		batchUpdateStage,
		fetchLeads,
		modals,
	};
}
