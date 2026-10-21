/**
 * DENTE Dental CRM — Leads Kanban Analytics & Leak Modals
 * Mandate 8b (<= 120 lines)
 */

import type React from "react";
import { lazy, Suspense } from "react";
import type { Lead } from "../../../store/leadsStore";

const LeadsFunnelAnalyticsModal = lazy(() =>
	import("../LeadsFunnelAnalyticsModal").then((module) => ({
		default: module.LeadsFunnelAnalyticsModal,
	})),
);

const CrmLeakDetectorDrawer = lazy(() =>
	import("../../crm/CrmLeakDetectorDrawer").then((module) => ({
		default: module.CrmLeakDetectorDrawer,
	})),
);

interface LeadsKanbanAnalyticsModalsProps {
	leads: Lead[];
	isAnalyticsOpen: boolean;
	onCloseAnalytics: () => void;
	isLeakDetectorOpen: boolean;
	onCloseLeakDetector: () => void;
	onOpenLeakDetector: () => void;
}

export const LeadsKanbanAnalyticsModals: React.FC<
	LeadsKanbanAnalyticsModalsProps
> = ({
	leads,
	isAnalyticsOpen,
	onCloseAnalytics,
	isLeakDetectorOpen,
	onCloseLeakDetector,
	onOpenLeakDetector,
}) => {
	return (
		<>
			{isAnalyticsOpen && (
				<Suspense fallback={null}>
					<LeadsFunnelAnalyticsModal
						isOpen={isAnalyticsOpen}
						onClose={onCloseAnalytics}
						leads={leads}
						onOpenLeakDetector={onOpenLeakDetector}
					/>
				</Suspense>
			)}

			{isLeakDetectorOpen && (
				<Suspense fallback={null}>
					<CrmLeakDetectorDrawer
						isOpen={isLeakDetectorOpen}
						onClose={onCloseLeakDetector}
					/>
				</Suspense>
			)}
		</>
	);
};
