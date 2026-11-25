/**
 * MarketingDashboardModals.tsx
 *
 * Lazy-loaded and popup modal dialogs for MarketingDashboardView.
 * Strict <= 120 lines. UTF-8 without BOM.
 */

import React, { lazy, Suspense } from "react";
import { generateUuidV7 } from "@dental/shared";
import { showToast } from "../../components/GlobalToast";
import { denteClinicalMutationHeaders } from "../../lib/denteRequestHeaders";
import { clientLogger } from "../../services/logging/clientLogger";
import { MarketingNewPromoModal } from "../../components/marketing/MarketingNewPromoModal";
import type { FunnelLead } from "../../components/leads/leadsFunnelEngine";

const LeadsFunnelAnalyticsModal = lazy(() =>
	import("../../components/leads/LeadsFunnelAnalyticsModal").then((module) => ({
		default: module.LeadsFunnelAnalyticsModal,
	})),
);

const PatientRecallsHubModal = lazy(() =>
	import("../../components/recalls/PatientRecallsHubModal").then((module) => ({
		default: module.PatientRecallsHubModal,
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
					<PatientRecallsHubModal
						isOpen={isLeakDetectorOpen}
						onClose={onCloseLeakDetector}
					/>
				</Suspense>
			)}

			<MarketingNewPromoModal
				isOpen={isNewPromoModalOpen}
				onClose={onCloseNewPromoModal}
				onSave={async (newPromo) => {
					try {
						const res = await fetch("/api/marketing/promos", {
							method: "POST",
							headers: {
								...denteClinicalMutationHeaders(),
								"Content-Type": "application/json",
								"Idempotency-Key": generateUuidV7(),
							},
							body: JSON.stringify(newPromo),
						});
						if (!res.ok) {
							const err = await res.json().catch(() => ({}));
							showToast(err.message || "Не удалось сохранить акцию", "error");
							return;
						}
						showToast(`Акция «${newPromo.title}» сохранена`, "success");
					} catch (err) {
						clientLogger.error("[Marketing] Failed to persist promo", err, {
							module: "MarketingDashboardModals",
						});
						showToast("Сетевая ошибка при сохранении акции", "error");
					}
				}}
			/>
		</>
	);
}
