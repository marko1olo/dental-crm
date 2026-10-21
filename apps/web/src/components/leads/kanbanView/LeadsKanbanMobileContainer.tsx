/**
 * DENTE Dental CRM — Leads Kanban Mobile Container
 * Mandate 8b (<= 120 lines)
 */

import React from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import type { Lead } from "../../../store/leadsStore";
import { LeadsMobileFeedView } from "../LeadsMobileFeedView";

interface LeadsKanbanMobileContainerProps {
	leads: Lead[];
	loadError: string | null;
	creatingPatientLeadId: string | null;
	modals: React.ReactNode;
	onNewLead: () => void;
	onEditLead: (lead: Lead) => void;
	onStatusChange: (id: string, status: Lead["status"]) => void;
	onSchedule: (id: string) => void;
	onQuickSchedule: (id: string) => void;
	onCreatePatient: (lead: Lead) => void;
	onUpdateLeadDetails: (id: string, updates: Partial<Lead>) => Promise<void>;
	onOpenPatientCard: (patientId: string) => void;
	onOpenAnalytics: () => void;
	onOpenLeakDetector: () => void;
}

export const LeadsKanbanMobileContainer: React.FC<LeadsKanbanMobileContainerProps> = ({
	leads,
	loadError,
	creatingPatientLeadId,
	modals,
	onNewLead,
	onEditLead,
	onStatusChange,
	onSchedule,
	onQuickSchedule,
	onCreatePatient,
	onUpdateLeadDetails,
	onOpenPatientCard,
	onOpenAnalytics,
	onOpenLeakDetector,
}) => {
	return (
		<div
			className="leads-mobile-container"
			style={{ width: "100%", maxWidth: "100vw", overflowX: "clip" }}
		>
			{loadError && !isDemoShowcaseMode() && (
				<div role="alert" className="leads-error-banner">
					{loadError}
				</div>
			)}
			<LeadsMobileFeedView
				leads={leads}
				onNewLead={onNewLead}
				onEditLead={onEditLead}
				onStatusChange={onStatusChange}
				onSchedule={onSchedule}
				onQuickSchedule={onQuickSchedule}
				onCreatePatient={onCreatePatient}
				onUpdateLeadDetails={onUpdateLeadDetails}
				onOpenPatientCard={onOpenPatientCard}
				creatingPatientLeadId={creatingPatientLeadId}
				onOpenAnalytics={onOpenAnalytics}
				onOpenLeakDetector={onOpenLeakDetector}
			/>
			{modals}
		</div>
	);
};
