/**
 * DENTE Dental CRM — Column Focus Lead Selection State
 * Mandate 8b (<= 120 lines)
 */

import { useState } from "react";
import type { Lead } from "../../../store/leadsStore";

export function useColumnFocusSelection(displayLeads: Lead[]) {
	const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

	const toggleSelectLead = (id: string, e?: React.MouseEvent) => {
		if (e) e.stopPropagation();
		setSelectedLeadIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const toggleSelectAll = () => {
		if (selectedLeadIds.size >= displayLeads.length && displayLeads.length > 0) {
			setSelectedLeadIds(new Set());
		} else {
			setSelectedLeadIds(new Set(displayLeads.map((l) => l.id)));
		}
	};

	return {
		selectedLeadIds,
		setSelectedLeadIds,
		toggleSelectLead,
		toggleSelectAll,
	};
}
