/**
 * GlobalSupportModals — Модалки справок ЕГИСЗ, быстрого старта и неотложной помощи (Мандат 8b, <= 120 строк).
 */

import React, { Suspense } from "react";
import { lazyWithRetry } from "../../../lib/lazyWithRetry";

const EgiszCertificatesHubModal = lazyWithRetry(() =>
	import("../../egisz/EgiszCertificatesHubModal").then((m) => ({ default: m.EgiszCertificatesHubModal })),
);
const RapidLaunchWizard = lazyWithRetry(() =>
	import("../../onboarding/RapidLaunchWizard").then((m) => ({ default: m.RapidLaunchWizard })),
);
const EmergencyRescueModal = lazyWithRetry(() =>
	import("../../emergency/EmergencyRescueModal").then((m) => ({ default: m.EmergencyRescueModal })),
);

export interface GlobalSupportModalsProps {
	isEgiszCertificatesOpen: boolean;
	setIsEgiszCertificatesOpen: (open: boolean) => void;
	egiszCertificatesSection: "queue" | "tax_deduction" | "extracts";
	isGlobalOnboardingOpen: boolean;
	setIsGlobalOnboardingOpen: (open: boolean) => void;
	isEmergencyRescueOpen: boolean;
	setIsEmergencyRescueOpen: (open: boolean) => void;
}

export function GlobalSupportModals({
	isEgiszCertificatesOpen,
	setIsEgiszCertificatesOpen,
	egiszCertificatesSection,
	isGlobalOnboardingOpen,
	setIsGlobalOnboardingOpen,
	isEmergencyRescueOpen,
	setIsEmergencyRescueOpen,
}: GlobalSupportModalsProps) {
	return (
		<>
			{isEgiszCertificatesOpen && (
				<Suspense fallback={null}>
					<EgiszCertificatesHubModal
						isOpen={true}
						initialSection={egiszCertificatesSection}
						onClose={() => {
							setIsEgiszCertificatesOpen(false);
							const u = new URL(window.location.href);
							u.searchParams.delete("certificates");
							u.searchParams.delete("egisz-certificates");
							window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("certificates") ? "" : u.hash));
						}}
					/>
				</Suspense>
			)}

			{isGlobalOnboardingOpen && (
				<Suspense fallback={null}>
					<RapidLaunchWizard
						isModal={true}
						onClose={() => setIsGlobalOnboardingOpen(false)}
						onFinished={() => setIsGlobalOnboardingOpen(false)}
						onSkipped={() => setIsGlobalOnboardingOpen(false)}
					/>
				</Suspense>
			)}

			{isEmergencyRescueOpen && (
				<Suspense fallback={null}>
					<EmergencyRescueModal
						isOpen={true}
						onClose={() => {
							setIsEmergencyRescueOpen(false);
							const u = new URL(window.location.href);
							u.searchParams.delete("emergency");
							window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("emergency") ? "" : u.hash));
						}}
					/>
				</Suspense>
			)}
		</>
	);
}
