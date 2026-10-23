/**
 * MarketingDashboardModals.tsx
 *
 * Lazy-loaded and popup modal dialogs for MarketingDashboardView.
 * Strict <= 120 lines. UTF-8 without BOM.
 */

import React, { lazy, Suspense } from "react";
import { showToast } from "../../components/GlobalToast";
import { MarketingNewPromoModal } from "../../components/marketing/MarketingNewPromoModal";
import type { FunnelLead } from "../../components/leads/leadsFunnelEngine";

const LeadsFunnelAnalyticsModal = lazy(() =>
	import("../../components/leads/LeadsFunnelAnalyticsModal").then((module) => ({
		default: module.LeadsFunnelAnalyticsModal,
	})),
);

const CrmLeakDetectorDrawer = lazy(() =>
	import("../../components/crm/CrmLeakDetectorDrawer").then((module) => ({
		default: module.CrmLeakDetectorDrawer,
	})),
);

interface MarketingDashboardModalsProps {
	leads: readonly FunnelLead[];
	isFullAnalyticsOpen: boolean;
	onCloseFullAnalytics: () => void;
	isLeakDetectorOpen: boolean;
	onCloseLeakDetector: () => void;
	isNewPromoModalOpen: boolean;
	onCloseNewPromoModal: () => void;
}

export function MarketingDashboardModals({
	leads,
	isFullAnalyticsOpen,
	onCloseFullAnalytics,
	isLeakDetectorOpen,
	onCloseLeakDetector,
	isNewPromoModalOpen,
	onCloseNewPromoModal,
}: MarketingDashboardModalsProps) {
	return (
		<>
			{isFullAnalyticsOpen && (
				<Suspense fallback={null}>
					<LeadsFunnelAnalyticsModal
						isOpen={isFullAnalyticsOpen}
						onClose={onCloseFullAnalytics}
						leads={leads}
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

			<MarketingNewPromoModal
				isOpen={isNewPromoModalOpen}
				onClose={onCloseNewPromoModal}
				onSave={(newPromo) => {
					showToast(`Акция «${newPromo.title}» сохранена`, "success");
				}}
			/>
		</>
	);
}
