/**
 * DENTE Dental CRM — Sovereign Mobile Leads CRM & Feed per Apple iOS HIG
 * Mandate 8b (<= 120 lines), Anti-Desktop-Squeeze, 0px parasitic horizontal drift
 */

import { Plus } from "lucide-react";
import React from "react";
import { LeadMobileBottomSheet } from "./LeadMobileBottomSheet";
import type { LeadsMobileFeedViewProps } from "./mobile/mobileFeedTypes";
import { LeadsMobileCardsSection } from "./mobile/LeadsMobileCardsSection";
import { LeadsMobileSegmentedBar } from "./mobile/LeadsMobileSegmentedBar";
import { LeadsMobileTopBar } from "./mobile/LeadsMobileTopBar";
import { useLeadsMobileFeedState } from "./mobile/useLeadsMobileFeedState";
import "./leadsMobileFeed.css";

export type { LeadsMobileFeedViewProps };

export const LeadsMobileFeedView: React.FC<LeadsMobileFeedViewProps> = ({
	leads,
	onNewLead,
	onStatusChange,
	onSchedule,
	onQuickSchedule,
	onCreatePatient,
	onUpdateLeadDetails,
	onOpenPatientCard,
	creatingPatientLeadId,
	onOpenAnalytics,
	onOpenLeakDetector,
}) => {
	const {
		activeTab,
		setActiveTab,
		searchQuery,
		setSearchQuery,
		isSearchOpen,
		setIsSearchOpen,
		selectedLeadId,
		setSelectedLeadId,
		counts,
		breachedLeadsCount,
		visibleLeads,
		selectedLead,
	} = useLeadsMobileFeedState(leads);

	return (
		<div className="leads-mobile-feed" data-testid="leads-mobile-feed">
			<LeadsMobileTopBar
				isSearchOpen={isSearchOpen}
				setIsSearchOpen={setIsSearchOpen}
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				onOpenAnalytics={onOpenAnalytics}
				onOpenLeakDetector={onOpenLeakDetector}
			/>

			<LeadsMobileSegmentedBar
				activeTab={activeTab}
				setActiveTab={setActiveTab}
				counts={counts}
				breachedCount={breachedLeadsCount}
			/>

			<LeadsMobileCardsSection
				leads={visibleLeads}
				onSelect={(id) => setSelectedLeadId(id)}
				onSchedule={onSchedule}
				onQuickSchedule={onQuickSchedule}
				onOpenPatientCard={onOpenPatientCard}
				onNewLead={onNewLead}
				searchQuery={searchQuery}
				activeTab={activeTab}
			/>

			<LeadMobileBottomSheet
				lead={selectedLead}
				isOpen={Boolean(selectedLead)}
				onClose={() => setSelectedLeadId(null)}
				onStatusChange={onStatusChange}
				onSchedule={onSchedule}
				onQuickSchedule={onQuickSchedule}
				onCreatePatient={onCreatePatient}
				onUpdateNotes={async (id, notes) => {
					if (onUpdateLeadDetails) await onUpdateLeadDetails(id, { notes });
				}}
				onOpenPatientCard={onOpenPatientCard}
				creatingPatientLeadId={creatingPatientLeadId}
			/>

			<div
				className="leads-mobile-floating-bar"
				data-testid="mobile-floating-bottom-bar"
			>
				<button
					type="button"
					onClick={onNewLead}
					className="leads-mobile-floating-cta"
					data-testid="mobile-leads-add-btn"
					aria-label="Создать новое обращение"
				>
					<Plus size={20} />
					<span>Новое обращение</span>
				</button>
			</div>
		</div>
	);
};
