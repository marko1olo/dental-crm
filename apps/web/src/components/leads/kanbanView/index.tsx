/**
 * DENTE Dental CRM — Leads Kanban Master Coordinator
 * Mandate 8s (Modular Architecture), Mandate 8b (<= 120 lines)
 */

import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { useIsMobile } from "../../../hooks/useIsMobile";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { useLeadsStore } from "../../../store/leadsStore";
import { LeadsMobileFeedView } from "../LeadsMobileFeedView";
import { COLUMNS } from "../leadsKanbanConstants";
import { LeadsKanbanHeaderToolbar } from "./LeadsKanbanHeaderToolbar";
import { LeadsKanbanSharedModals } from "./LeadsKanbanSharedModals";
import { LeadsKanbanBoardGrid } from "./LeadsKanbanBoardGrid";
import { LeadsKanbanExpandedModal } from "./LeadsKanbanExpandedModal";
import { useLeadBookingNavigation } from "./useLeadBookingNavigation";
import { useLeadPatientCreator } from "./useLeadPatientCreator";
import { useLeadStaffChairs } from "./useLeadStaffChairs";
import { useLeadScheduleHandlers } from "./useLeadScheduleHandlers";
import { useLeadConvertModalSubmit } from "./useLeadConvertModalSubmit";
import { useLeadFormState } from "./useLeadFormState";
import { useLeadDragAndDrop } from "./useLeadDragAndDrop";
import { useLeadsKanbanViewState } from "./useLeadsKanbanViewState";
import "../leadsKanban.css";


export * from "../leadsKanbanTypes";
export * from "./LeadKanbanCard";
export * from "./LeadKanbanColumn";
export * from "./LeadsKanbanHeaderToolbar";
export * from "./types";

export function LeadsKanbanView() {
	const { leads, fetchLeads, updateLeadStatus, batchUpdateStage, updateLeadDetails, addLead, deleteLead, convertLeadToAppointment, createPatientFromLead, isLoading, error: loadError } = useLeadsStore();
	const { dashboard } = useAppLogicContext();
	const isMobile = useIsMobile(768);
	const visitMinutes = dashboard?.clinicSettings?.profile?.defaultVisitMinutes ?? null;
	const clinicTimeZone = dashboard?.clinicSettings?.profile?.timezone ?? null;

	const { navigateToScheduleWithBooking, handleOpenPatientCard } = useLeadBookingNavigation();
	const { creatingPatientLeadId, handleCreatePatientFromLead } = useLeadPatientCreator(createPatientFromLead, fetchLeads, handleOpenPatientCard);
	const { staff, chairs, selectedDoctorId, setSelectedDoctorId, selectedChairId, setSelectedChairId } = useLeadStaffChairs(dashboard);
	const v = useLeadsKanbanViewState(leads, fetchLeads, clinicTimeZone);

	const { handleQuickSchedule } = useLeadScheduleHandlers({
		leads, staff, chairs, selectedDoctorId, selectedChairId, appointmentDate: v.appointmentDate,
		appointmentTime: v.appointmentTime, visitMinutes, clinicTimeZone, convertLeadToAppointment, fetchLeads, navigateToScheduleWithBooking,
	});
	const { handleConvertSubmit } = useLeadConvertModalSubmit({
		convertingLeadId: v.convertingLeadId, isBooking: v.isBooking, setIsBooking: v.setIsBooking,
		leads, staff, chairs, selectedDoctorId, selectedChairId, appointmentDate: v.appointmentDate,
		appointmentTime: v.appointmentTime, visitMinutes, clinicTimeZone, convertLeadToAppointment, fetchLeads,
		setIsConvertOpen: v.setIsConvertOpen, setConvertingLeadId: v.setConvertingLeadId, navigateToScheduleWithBooking,
	});
	const form = useLeadFormState({ addLead, updateLeadDetails, deleteLead });
	const dnd = useLeadDragAndDrop(updateLeadStatus);

	const modals = (
		<LeadsKanbanSharedModals
			isConvertOpen={v.isConvertOpen} onCloseConvert={() => v.setIsConvertOpen(false)} onConvertSubmit={handleConvertSubmit}
			staff={staff} chairs={chairs} selectedDoctorId={selectedDoctorId} setSelectedDoctorId={setSelectedDoctorId}
			selectedChairId={selectedChairId} setSelectedChairId={setSelectedChairId} appointmentDate={v.appointmentDate}
			setAppointmentDate={v.setAppointmentDate} appointmentTime={v.appointmentTime} setAppointmentTime={v.setAppointmentTime}
			isBooking={v.isBooking} convertingLead={leads.find((l) => l.id === v.convertingLeadId) || null}
			isEditOpen={form.isEditOpen} onCloseEdit={() => form.setIsEditOpen(false)} editingLeadId={form.editingLeadId}
			editForm={form.editForm} setEditForm={form.setEditForm} onEditSubmit={form.handleEditSubmit}
			isDeleting={form.isDeleting} onDeleteLead={() => void form.handleDeleteLead()}
			creatingPatientLeadId={creatingPatientLeadId} onCreatePatient={(lead) => void handleCreatePatientFromLead(lead)}
			leads={leads} isAnalyticsOpen={v.isAnalyticsOpen} onCloseAnalytics={() => v.setIsAnalyticsOpen(false)}
			isLeakDetectorOpen={v.isLeakDetectorOpen} onCloseLeakDetector={() => v.setIsLeakDetectorOpen(false)}
			onOpenLeakDetector={() => v.setIsLeakDetectorOpen(true)} cardBg="var(--paper)" colBg="var(--paper-soft)" borderColor="var(--line)"
		/>
	);

	if (isLoading && leads.length === 0 && !isDemoShowcaseMode()) return <div className="leads-loading-state">Загрузка конвейера...</div>;
	if (isMobile) {
		return (
			<div className="leads-mobile-container" style={{ width: "100%", maxWidth: "100vw", overflowX: "clip" }}>
				{loadError && !isDemoShowcaseMode() && <div role="alert" className="leads-error-banner">{loadError}</div>}
				<LeadsMobileFeedView
					leads={leads} onNewLead={() => form.openEditModal()} onEditLead={(l) => form.openEditModal(l)}
					onStatusChange={dnd.handleQuickStatusChange} onSchedule={(id) => { v.setConvertingLeadId(id); v.setIsConvertOpen(true); }}
					onQuickSchedule={handleQuickSchedule} onCreatePatient={handleCreatePatientFromLead}
					onUpdateLeadDetails={updateLeadDetails} onOpenPatientCard={handleOpenPatientCard}
					creatingPatientLeadId={creatingPatientLeadId} onOpenAnalytics={() => v.setIsAnalyticsOpen(true)}
					onOpenLeakDetector={() => v.setIsLeakDetectorOpen(true)}
				/>
				{modals}
			</div>
		);
	}

	return (
		<div className="leads-board-container">
			<LeadsKanbanHeaderToolbar
				searchQuery={v.searchQuery} setSearchQuery={v.setSearchQuery} sourceFilter={v.sourceFilter} setSourceFilter={v.setSourceFilter}
				uniqueSources={v.uniqueSources as string[]} viewMode={v.viewMode} setViewMode={v.setViewMode} secondaryLeadsCount={v.secondaryLeadsCount}
				totalLeadsCount={leads.length} onNewLead={() => form.openEditModal()} onOpenAnalytics={() => v.setIsAnalyticsOpen(true)}
				onOpenLeakDetector={() => v.setIsLeakDetectorOpen(true)} borderColor="var(--line)" colBg="var(--paper-soft)"
			/>
			{loadError && <div role="alert" className="leads-error-banner">{loadError}</div>}
			<LeadsKanbanBoardGrid
				activeColumns={COLUMNS} filteredLeads={v.filteredLeads} draggedLeadId={dnd.draggedLeadId}
				creatingPatientLeadId={creatingPatientLeadId} borderColor="var(--line)" cardBg="var(--paper)"
				onDragOver={dnd.handleDragOver} onDrop={dnd.handleDrop} onExpandColumn={(id) => v.setExpandedColumnId(id)}
				onDragStart={dnd.handleDragStart} onEditLead={form.openEditModal} onStatusChange={dnd.handleQuickStatusChange}
				onCreatePatient={handleCreatePatientFromLead} onSchedule={(id) => { v.setConvertingLeadId(id); v.setIsConvertOpen(true); }}
				onQuickSchedule={handleQuickSchedule} onOpenPatientCard={handleOpenPatientCard}
			/>
			{modals}
			<LeadsKanbanExpandedModal
				expandedColumnId={v.expandedColumnId} onClose={() => v.setExpandedColumnId(null)} leads={leads}
				staff={staff} updateLeadStatus={updateLeadStatus} batchUpdateStage={batchUpdateStage}
				updateLeadDetails={updateLeadDetails} fetchLeads={fetchLeads} onEditLead={form.openEditModal}
				onScheduleLead={(id) => { v.setConvertingLeadId(id); v.setIsConvertOpen(true); }}
				onCreatePatient={handleCreatePatientFromLead} onQuickSchedule={handleQuickSchedule}
			/>
		</div>
	);
}
