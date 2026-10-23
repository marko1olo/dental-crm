/**
 * DENTE Dental CRM — Sovereign Tier 2 Drawer for Clinical CRM Leak Detector
 * Mandate 8s (SSOT & Modular Drawer), Mandate 8n (Solo Doctor Ergonomics), Apple HIG
 * Mandate 8b (<= 120 lines Facade), No nested modals (Anti-Matryoshka, depth <= 1).
 */

import type React from "react";
import { createPortal } from "react-dom";
import { CrmLeakActiveSections } from "./crmLeakDetector/CrmLeakActiveSections";
import { CrmLeakFilterBar } from "./crmLeakDetector/CrmLeakFilterBar";
import { CrmLeakHeader } from "./crmLeakDetector/CrmLeakHeader";
import { CrmLeakKpiBar } from "./crmLeakDetector/CrmLeakKpiBar";
import { CrmLeakTable } from "./crmLeakDetector/CrmLeakTable";
import type { CrmLeakDetectorDrawerProps } from "./crmLeakDetector/types";
import { useCrmLeakData } from "./crmLeakDetector/useCrmLeakData";
import { useCrmLeakNavigation } from "./crmLeakDetector/useCrmLeakNavigation";
import { useCrmLeakSubDrawers } from "./crmLeakDetector/useCrmLeakSubDrawers";
import "./CrmLeakDetectorModal.css";

export type { CrmLeakDetectorDrawerProps };
// Workspace highway selectors: lead-patient-link- / btn-open-workspace- (rendered in CrmLeakTableRow)

export const CrmLeakDetectorDrawer: React.FC<CrmLeakDetectorDrawerProps> = (props) => {
	const {
		isOpen = false,
		onClose,
		onOpenPatientWorkspace,
		activeScriptLead: pScript,
		copiedScript: pCopied,
		onCopyScript: pOnCopy,
		onCloseScript: pOnCloseScript,
		contactModalLead: pContact,
		contactChannel: pChannel,
		onSetContactChannel: pSetChannel,
		contactNotes: pNotes,
		onSetContactNotes: pSetNotes,
		onSaveContact: pSaveContact,
		onCloseContact: pCloseContact,
		declineModalLead: pDecline,
		declineReason: pReason,
		onSetDeclineReason: pSetReason,
		declineComment: pComment,
		onSetDeclineComment: pSetComment,
		onSaveDecline: pSaveDecline,
		onCloseDecline: pCloseDecline,
		selectedLeakLead: pSelected,
		onCloseLeakLead: pCloseSelected,
	} = props;

	const isStandaloneTest = !isOpen && Boolean(pScript || pContact || pDecline || pSelected);
	const data = useCrmLeakData(isOpen);
	const nav = useCrmLeakNavigation(onClose, onOpenPatientWorkspace);
	const sub = useCrmLeakSubDrawers(data.loadData);

	if (!isOpen && !isStandaloneTest) return null;

	const drawerContent = (
		<div className="cld-drawer-backdrop" role="region" aria-label="Детектор оттока и реактивация">
			<div className="cld-drawer-card cld-drawer-main" data-testid="cld-drawer-main-panel">
				<CrmLeakHeader minDays={data.minDays} syncing={data.syncing} onSync={data.handleSync} onClose={onClose} />
				<CrmLeakActiveSections
					activeScript={pScript || sub.internalScriptLead}
					copied={Boolean(pCopied || sub.internalCopied)}
					onCopy={pOnCopy || sub.handleCopyScript}
					onCloseScript={() => { pOnCloseScript?.(); sub.setInternalScriptLead(null); }}
					contactLead={pContact || sub.internalContactLead}
					contactChannel={pChannel || sub.internalContactChannel}
					onChannelChange={(ch) => { pSetChannel?.(ch); sub.setInternalContactChannel(ch); }}
					contactNotes={pNotes ?? sub.internalContactNotes}
					onNotesChange={(n) => { pSetNotes?.(n); sub.setInternalContactNotes(n); }}
					onSaveContact={pSaveContact || sub.handleSaveContact}
					onCloseContact={() => { pCloseContact?.(); sub.setInternalContactLead(null); }}
					declineLead={pDecline || sub.internalDeclineLead}
					declineReason={pReason || sub.internalDeclineReason}
					onReasonChange={(r) => { pSetReason?.(r); sub.setInternalDeclineReason(r); }}
					declineComment={pComment ?? sub.internalDeclineComment}
					onCommentChange={(c) => { pSetComment?.(c); sub.setInternalDeclineComment(c); }}
					onSaveDecline={pSaveDecline || sub.handleSaveDecline}
					onCloseDecline={() => { pCloseDecline?.(); sub.setInternalDeclineLead(null); }}
					selectedLead={pSelected || sub.internalSelectedLead}
					onCloseSelected={() => { pCloseSelected?.(); sub.setInternalSelectedLead(null); }}
					onOpenPatientWorkspace={nav.handleOpenPatient}
				/>
				<CrmLeakKpiBar metrics={data.metrics} totalIdentified={data.allLeadsCount} />
				<CrmLeakFilterBar
					minDays={data.minDays}
					onMinDaysChange={data.setMinDays}
					statusFilter={data.statusFilter}
					onStatusFilterChange={data.setStatusFilter}
					onlyUncompletedPlans={data.onlyUncompletedPlans}
					onOnlyUncompletedPlansChange={data.setOnlyUncompletedPlans}
					searchQuery={data.searchQuery}
					onSearchQueryChange={data.setSearchQuery}
				/>
				<div className="cld-content flex-1 overflow-y-auto p-4">
					<CrmLeakTable
						loading={data.loading}
						leads={data.leads}
						onSelectLead={sub.setInternalSelectedLead}
						onOpenWhatsApp={nav.handleOpenWhatsApp}
						onBookAppointment={nav.handleBookAppointment}
						onOpenPatientWorkspace={nav.handleOpenPatient}
						onOpenScript={sub.setInternalScriptLead}
						onOpenContact={(lead) => {
							sub.setInternalContactLead(lead);
							sub.setInternalContactNotes(lead.lastContactNotes || "");
						}}
					/>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(drawerContent, document.body) : drawerContent;
};

export default CrmLeakDetectorDrawer;
