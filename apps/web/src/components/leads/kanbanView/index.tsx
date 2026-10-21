import React from "react";
/**
 * DENTE Dental CRM — Leads Kanban Master Coordinator
 * Mandate 8s (Modular Architecture), Mandate 8b (<= 120 lines)
 */

import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { LeadsKanbanDesktopContainer } from "./LeadsKanbanDesktopContainer";
import { LeadsKanbanMobileContainer } from "./LeadsKanbanMobileContainer";
import { useLeadsKanbanMasterController } from "./useLeadsKanbanMasterController";
import "../leadsKanban.css";

export * from "../leadsKanbanTypes";
export * from "./LeadKanbanCard";
export * from "./LeadKanbanColumn";
export * from "./LeadsKanbanHeaderToolbar";
export * from "./types";

export function LeadsKanbanView() {
	const c = useLeadsKanbanMasterController();

	if (c.isLoading && c.leads.length === 0 && !isDemoShowcaseMode()) {
		return <div className="leads-loading-state">Загрузка конвейера...</div>;
	}
	if (c.isMobile) {
		return (
			<LeadsKanbanMobileContainer
				leads={c.leads}
				loadError={c.loadError}
				creatingPatientLeadId={c.creatingPatientLeadId}
				modals={c.modals}
				onNewLead={() => c.form.openEditModal()}
				onEditLead={(l) => c.form.openEditModal(l)}
				onStatusChange={c.dnd.handleQuickStatusChange}
				onSchedule={(id) => {
					c.v.setConvertingLeadId(id);
					c.v.setIsConvertOpen(true);
				}}
				onQuickSchedule={c.handleQuickSchedule}
				onCreatePatient={c.handleCreatePatientFromLead}
				onUpdateLeadDetails={c.updateLeadDetails}
				onOpenPatientCard={c.handleOpenPatientCard}
				onOpenAnalytics={() => c.v.setIsAnalyticsOpen(true)}
				onOpenLeakDetector={() => c.v.setIsLeakDetectorOpen(true)}
			/>
		);
	}

	return (
		<LeadsKanbanDesktopContainer
			leads={c.leads}
			filteredLeads={c.v.filteredLeads}
			staff={c.staff}
			loadError={c.loadError}
			searchQuery={c.v.searchQuery}
			setSearchQuery={c.v.setSearchQuery}
			sourceFilter={c.v.sourceFilter}
			setSourceFilter={c.v.setSourceFilter}
			uniqueSources={c.v.uniqueSources as string[]}
			viewMode={c.v.viewMode}
			setViewMode={c.v.setViewMode}
			secondaryLeadsCount={c.v.secondaryLeadsCount}
			draggedLeadId={c.dnd.draggedLeadId}
			creatingPatientLeadId={c.creatingPatientLeadId}
			expandedColumnId={c.v.expandedColumnId}
			setExpandedColumnId={c.v.setExpandedColumnId}
			onNewLead={() => c.form.openEditModal()}
			onOpenAnalytics={() => c.v.setIsAnalyticsOpen(true)}
			onOpenLeakDetector={() => c.v.setIsLeakDetectorOpen(true)}
			onDragOver={c.dnd.handleDragOver}
			onDrop={c.dnd.handleDrop}
			onDragStart={c.dnd.handleDragStart}
			onEditLead={c.form.openEditModal}
			onStatusChange={c.dnd.handleQuickStatusChange}
			onCreatePatient={c.handleCreatePatientFromLead}
			onSchedule={(id) => {
				c.v.setConvertingLeadId(id);
				c.v.setIsConvertOpen(true);
			}}
			onQuickSchedule={c.handleQuickSchedule}
			onOpenPatientCard={c.handleOpenPatientCard}
			updateLeadStatus={c.updateLeadStatus}
			batchUpdateStage={c.batchUpdateStage}
			updateLeadDetails={c.updateLeadDetails}
			fetchLeads={c.fetchLeads}
			modals={c.modals}
		/>
	);
}
