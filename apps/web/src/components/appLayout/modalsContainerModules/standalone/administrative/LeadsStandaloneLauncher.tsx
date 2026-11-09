/**
 * apps/web/src/components/appLayout/modalsContainerModules/standalone/administrative/LeadsStandaloneLauncher.tsx
 *
 * Standalone лончер воронки первичных обращений и лидов CRM (?leads=1, #leads, #crm-leads, #kanban).
 * Мандат 8aq: Монтирование в живой UI. Мандат 8b: строго <= 50 строк.
 */

import React from "react";
import { LeadsKanbanView } from "../../../../leads/LeadsKanbanView";

export function evaluateLeadsDeepLink(): boolean {
	if (typeof window === "undefined") return false;
	const h = window.location.hash.toLowerCase();
	const s = window.location.search.toLowerCase();
	return (
		h.includes("leads") || h.includes("crm-leads") || h.includes("kanban") ||
		s.includes("leads=1") || s.includes("crm_leads=1") || s.includes("standalone=leads")
	);
}

export function renderLeadsStandaloneLauncher(): React.ReactElement | null {
	if (!evaluateLeadsDeepLink()) return null;
	return (
		<div className="fixed inset-0 z-50 bg-[var(--paper)] flex flex-col overflow-hidden">
			<LeadsKanbanView />
		</div>
	);
}

export const DirectLeadsStandaloneLauncher: React.FC = () => {
	return renderLeadsStandaloneLauncher();
};

export default DirectLeadsStandaloneLauncher;
