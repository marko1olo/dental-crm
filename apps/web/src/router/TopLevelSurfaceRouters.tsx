/**
 * apps/web/src/router/TopLevelSurfaceRouters.tsx
 *
 * Два изолированных внешних контура приложения:
 * 1) PublicSurfaceRouter — публичные гостевые порталы (/portal/*, /booking/*, /consent-sign/*)
 * 2) AuxDisplayPopoutRouter — вторые мониторы и аппаратные окна (CBCT, Цефалометрия, Презентация, Табло холла)
 */

import React, { Suspense, useCallback, useState } from "react";
import type { PublicPortalRoute } from "../lib/publicPortalRoute.js";
import { lazyWithRetry } from "../lib/lazyWithRetry.js";
import type { parseCbctStudioRoute, parseCephStudioRoute } from "../utils/runtimeRouter.js";

type CbctStudioRoute = ReturnType<typeof parseCbctStudioRoute>;
type CephStudioRoute = ReturnType<typeof parseCephStudioRoute>;

const GuestLabPortal = lazyWithRetry(() =>
	import("../GuestLabPortal.js").then((m) => ({ default: m.GuestLabPortal })),
);
const PublicBookingPage = lazyWithRetry(() =>
	import("../pages/PublicBookingPage.js").then((m) => ({ default: m.PublicBookingPage })),
);
const PublicBudgetSignPage = lazyWithRetry(() =>
	import("../pages/public/PublicBudgetSignPage.js").then((m) => ({ default: m.PublicBudgetSignPage })),
);
const PublicConsentSignPage = lazyWithRetry(() =>
	import("../pages/public/PublicConsentSignPage.js").then((m) => ({ default: m.PublicConsentSignPage })),
);
const PublicWarrantyVerificationPage = lazyWithRetry(() =>
	import("../pages/PublicWarrantyVerificationPage.js").then((m) => ({
		default: m.PublicWarrantyVerificationPage,
	})),
);
const MobileSelfCheckinModal = lazyWithRetry(() =>
	import("../components/portal/selfCheckin/MobileSelfCheckinModal.js").then((m) => ({
		default: m.MobileSelfCheckinModal,
	})),
);
const MobilePhotoUploadPage = lazyWithRetry(() =>
	import("../components/photography/mobileBridge/MobilePhotoUploadPage.js").then((m) => ({
		default: m.MobilePhotoUploadPage,
	})),
);
const WaitingLoungeSignage = lazyWithRetry(() =>
	import("../components/lounge/WaitingLoungeSignage.js").then((m) => ({
		default: m.WaitingLoungeSignage,
	})),
);
const TelegramMiniAppView = lazyWithRetry(() =>
	import("../components/portal/telegramMiniApp/TelegramMiniAppView.js").then((m) => ({
		default: m.TelegramMiniAppView,
	})),
);
const CbctStandaloneStudioView = lazyWithRetry(() =>
	import("../components/radiology/CbctStandaloneStudioView.js").then((m) => ({
		default: m.CbctStandaloneStudioView,
	})),
);
const CephalometricAnalysisModal = lazyWithRetry(() =>
	import("../components/radiology/CephalometricAnalysisModal.js").then((m) => ({
		default: m.CephalometricAnalysisModal,
	})),
);
const PatientPresentationStandaloneView = lazyWithRetry(() =>
	import("../components/photography/PatientPresentationStandaloneView.js").then((m) => ({
		default: m.PatientPresentationStandaloneView,
	})),
);

function KioskHost({ organizationId }: { readonly organizationId: string | null | undefined }) {
	const [kioskSessionKey, setKioskSessionKey] = useState(0);
	const handleClose = useCallback(() => {
		setKioskSessionKey((prev) => prev + 1);
		if (typeof window !== "undefined") {
			window.location.hash = organizationId
				? `#/portal/kiosk/${encodeURIComponent(organizationId)}`
				: "#/portal/kiosk";
		}
	}, [organizationId]);

	return (
		<div
			className="w-screen h-screen overflow-auto flex items-center justify-center p-2 sm:p-4"
			style={{ backgroundColor: "var(--paper-soft, var(--paper))" }}
		>
			<MobileSelfCheckinModal
				key={`kiosk-session-${kioskSessionKey}`}
				isOpen={true}
				organizationId={organizationId}
				onClose={handleClose}
			/>
		</div>
	);
}

const SurfaceFallback: React.FC<{ readonly label: string }> = ({ label }) => (
	<div className="min-h-screen bg-[var(--paper)] text-[var(--ink-muted)] flex items-center justify-center text-sm font-medium">
		{label}
	</div>
);

export const PublicSurfaceRouter: React.FC<{ readonly route: PublicPortalRoute }> = ({ route }) => (
	<Suspense fallback={<SurfaceFallback label="Загрузка страницы…" />}>
		{route.kind === "booking" ? (
			<PublicBookingPage organizationId={route.organizationId} defaultMode="booking" />
		) : route.kind === "cabinet" ? (
			<PublicBookingPage organizationId={route.organizationId} defaultMode="cabinet" />
		) : route.kind === "kiosk" ? (
			<KioskHost organizationId={route.organizationId} />
		) : route.kind === "tgapp" ? (
			<TelegramMiniAppView
				organizationId={route.organizationId ?? null}
				patientId={route.patientId ?? null}
			/>
		) : route.kind === "budget" ? (
			<PublicBudgetSignPage token={route.token} />
		) : route.kind === "consent-sign" ? (
			<PublicConsentSignPage
				token={route.token}
				patientId={route.patientId ?? undefined}
				consentKind={route.consentKind ?? undefined}
			/>
		) : route.kind === "warranty" ? (
			<PublicWarrantyVerificationPage certificateNumber={route.certificateNumber} />
		) : route.kind === "lab-order" ? (
			<GuestLabPortal token={route.token} />
		) : (
			<MobilePhotoUploadPage tokenFromUrl={route.token} />
		)}
	</Suspense>
);

export type AuxDisplayMode =
	| { readonly kind: "cbct"; readonly route: CbctStudioRoute }
	| { readonly kind: "ceph"; readonly route: CephStudioRoute }
	| { readonly kind: "presentation" }
	| { readonly kind: "lounge" };

function resolveCbctMode(mode: string | undefined): "diagnostic" | "panoramic" | "volume3d" | "implant" | "tmj" | "endo" | undefined {
	if (mode === "diagnostic" || mode === "panoramic" || mode === "volume3d" || mode === "implant" || mode === "tmj" || mode === "endo") {
		return mode;
	}
	return undefined;
}

export const AuxDisplayPopoutRouter: React.FC<{ readonly aux: AuxDisplayMode }> = ({ aux }) => (
	<Suspense fallback={<SurfaceFallback label="Загрузка рабочего экрана…" />}>
		{aux.kind === "cbct" ? (
			<CbctStandaloneStudioView
				initialStudioMode={resolveCbctMode(aux.route.mode)}
				patientId={aux.route.patientId}
			/>
		) : aux.kind === "ceph" ? (
			<CephalometricAnalysisModal
				isOpen={true}
				onClose={() => {
					if (typeof window !== "undefined") window.close();
				}}
				patientId={typeof aux.route.patientId === "string" ? aux.route.patientId : undefined}
				patientName={typeof aux.route.patientName === "string" ? aux.route.patientName : undefined}
				initialImageUrl={typeof aux.route.imageUrl === "string" ? aux.route.imageUrl : undefined}
				initialTab="landmarks"
			/>
		) : aux.kind === "presentation" ? (
			<PatientPresentationStandaloneView />
		) : (
			<WaitingLoungeSignage
				onExit={() => {
					if (typeof window !== "undefined") {
						window.location.hash = "shift";
					}
				}}
			/>
		)}
	</Suspense>
);
