/**
 * DENTE Dental CRM — Canonical CRM View Coordinator
 *
 * Mandate 8s (Modular Architecture & SSOT Pipeline):
 * Canonical CRM View orchestrating LeadsKanbanView with SSOT event listeners,
 * routing integrations, and unified workspace analytics.
 */

import type React from "react";
import { useEffect } from "react";
import { LeadsKanbanView } from "../leads/LeadsKanbanView";

export interface CrmViewProps {
	readonly initialViewMode?: "funnel" | "all";
	readonly onNavigatePatient?: (patientId: string) => void;
}

export function CrmView({ initialViewMode, onNavigatePatient }: CrmViewProps) {
	useEffect(() => {
		const handlePatientOpen = (e: Event) => {
			const customEvent = e as CustomEvent<{ patientId: string }>;
			if (customEvent.detail?.patientId && onNavigatePatient) {
				onNavigatePatient(customEvent.detail.patientId);
			}
		};

		window.addEventListener("dente:patient:open", handlePatientOpen);
		return () => {
			window.removeEventListener("dente:patient:open", handlePatientOpen);
		};
	}, [onNavigatePatient]);

	return (
		<div
			className="crm-view-container"
			data-testid="crm-view"
			style={{ width: "100%", height: "100%" }}
		>
			<LeadsKanbanView />
		</div>
	);
}

export default CrmView;
