/**
 * DENTE Dental CRM — Sovereign Mobile Leads CRM & Feed per Apple iOS HIG
 * Mandate 8b (<= 120 lines), Anti-Desktop-Squeeze, 0px parasitic horizontal drift
 */

import { Plus } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import type { Lead, LeadStatus } from "../../store/leadsStore";
import { LeadMobileBottomSheet } from "./LeadMobileBottomSheet";
import { getLeadSlaStatus } from "./leadsKanbanTypes";
import { LeadsMobileCardsSection } from "./mobile/LeadsMobileCardsSection";
import { LeadsMobileSegmentedBar } from "./mobile/LeadsMobileSegmentedBar";
import { LeadsMobileTopBar } from "./mobile/LeadsMobileTopBar";
import "./leadsMobileFeed.css";

export interface LeadsMobileFeedViewProps {
	leads: Lead[];
	onNewLead: () => void;
	onEditLead: (lead: Lead) => void;
	onStatusChange: (
		e: React.MouseEvent,
		leadId: string,
		nextStatus: LeadStatus,
		options?: { reason?: string; dropReason?: string },
	) => void;
	onSchedule: (leadId: string) => void;
	onQuickSchedule?: (leadId: string) => Promise<void> | void;
	onCreatePatient?: (lead: Lead) => Promise<void> | void;
	onUpdateLeadDetails?: (
		id: string,
		details: Partial<Omit<Lead, "id">>,
	) => Promise<void> | void;
	onOpenPatientCard?: (patientId: string) => void;
	creatingPatientLeadId?: string | null;
	onOpenAnalytics?: () => void;
	onOpenLeakDetector?: () => void;
}

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
	const [activeTab, setActiveTab] = useState<LeadStatus | "all">("new");
	const [searchQuery, setSearchQuery] = useState("");
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

	const counts = useMemo(() => {
		const c: Record<string, number> = {
			all: leads.length,
			new: 0,
			consult_booked: 0,
			showed_up: 0,
			trash: 0,
		};
		for (const l of leads) {
			if (l.status === "new" || l.status === "contacted") {
				c.new = (c.new || 0) + 1;
			} else if (l.status === "consult_booked") {
				c.consult_booked = (c.consult_booked || 0) + 1;
			} else if (l.status === "showed_up" || l.status === "converted") {
				c.showed_up = (c.showed_up || 0) + 1;
			} else {
				c.trash = (c.trash || 0) + 1;
			}
		}
		return c;
	}, [leads]);

	const breachedLeadsCount = useMemo(
		() =>
			leads.filter(
				(l) =>
					(l.status === "new" || l.status === "contacted") &&
					getLeadSlaStatus(l).isBreached,
			).length,
		[leads],
	);

	const visibleLeads = useMemo(
		() =>
			leads.filter((l) => {
				if (
					activeTab === "new" &&
					l.status !== "new" &&
					l.status !== "contacted"
				)
					return false;
				if (activeTab === "consult_booked" && l.status !== "consult_booked")
					return false;
				if (
					activeTab === "showed_up" &&
					l.status !== "showed_up" &&
					l.status !== "converted"
				)
					return false;
				if (
					activeTab === "trash" &&
					l.status !== "trash" &&
					l.status !== "no_answer"
				)
					return false;
				if (
					activeTab !== "all" &&
					activeTab !== "new" &&
					activeTab !== "consult_booked" &&
					activeTab !== "showed_up" &&
					activeTab !== "trash"
				) {
					if (l.status !== activeTab) return false;
				}
				if (!searchQuery.trim()) return true;
				const q = searchQuery.toLowerCase();
				return Boolean(
					l.name?.toLowerCase().includes(q) ||
						l.phone?.includes(q) ||
						l.notes?.toLowerCase().includes(q) ||
						l.clinicalTags?.some((t) => t.toLowerCase().includes(q)),
				);
			}),
		[leads, activeTab, searchQuery],
	);

	const selectedLead = useMemo(
		() => leads.find((l) => l.id === selectedLeadId) || null,
		[leads, selectedLeadId],
	);

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
