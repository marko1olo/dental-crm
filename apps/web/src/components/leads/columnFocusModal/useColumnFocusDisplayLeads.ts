/**
 * DENTE Dental CRM — Column Focus Display Leads Filtering & Sorting
 * Mandate 8b (<= 120 lines)
 */

import { useMemo } from "react";
import type { Lead } from "../../../store/leadsStore";
import {
	getLeadSlaStatus,
	type LeadSlaUrgency,
	type LeadSortOption,
	sortLeads,
} from "../leadsKanbanTypes";

export function useColumnFocusDisplayLeads(
	columnLeads: Lead[],
	searchQuery: string,
	urgencyFilter: "all" | LeadSlaUrgency,
	sortOption: LeadSortOption,
) {
	return useMemo(() => {
		const result = columnLeads.filter((lead) => {
			const q = searchQuery.toLowerCase().trim();
			const matches =
				!q ||
				lead.name?.toLowerCase().includes(q) ||
				lead.phone?.includes(q) ||
				lead.notes?.toLowerCase().includes(q) ||
				lead.source?.toLowerCase().includes(q);
			if (!matches) return false;
			if (
				urgencyFilter !== "all" &&
				getLeadSlaStatus(lead).urgency !== urgencyFilter
			)
				return false;
			return true;
		});
		return sortLeads(result, sortOption);
	}, [columnLeads, searchQuery, urgencyFilter, sortOption]);
}
