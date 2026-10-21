/**
 * DENTE Dental CRM — Leads Mobile Feed State Hook
 * Mandate 8b (<= 120 lines)
 */

import { useMemo, useState } from "react";
import type { Lead, LeadStatus } from "../../../store/leadsStore";
import { getLeadSlaStatus } from "../leadsKanbanTypes";

export function useLeadsMobileFeedState(leads: Lead[]) {
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

	return {
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
	};
}
