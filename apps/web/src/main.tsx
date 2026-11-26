import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BootErrorBoundary } from "./bootErrorBoundary";
import { GlobalToast } from "./components/GlobalToast";
import { installApiAuthFetch } from "./lib/apiAuthFetch";
import { lazyWithRetry } from "./lib/lazyWithRetry";
import { publicPortalRouteFromHash } from "./lib/publicPortalRoute";
import { DenteQueryClientProvider } from "./lib/queryClient";
import { applyThemeToRoot, resolveTheme } from "./lib/themeClasses";
import { initHardwareCapabilities } from "./lib/hardwareCapabilities";
import { isPatientPresentationRoute } from "./components/photography/presentationSyncProtocol";
import { AuxDisplayPopoutRouter, PublicSurfaceRouter, type AuxDisplayMode } from "./router/TopLevelSurfaceRouters";
import { useThemeStore } from "./store/themeStore";
import { parseCbctStudioRoute, parseCephStudioRoute } from "./utils/runtimeRouter";
import { logger } from "./utils/logger";

import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/modules/patients.css";
import "./styles/patients-redesign.css";
import "./styles/premium.css";
import "./styles/dente-redesign.css";
import "./styles/modules/header.css";
import "./styles/modules/documents.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/modules/mobile-inventory.css";
import "./styles/modules/mobile-doctor-payout.css";
import "./styles/overflow-fixes.css";
import "./styles/contrast-fixes.css";
import "./styles/dente-operations.css";
import "./styles/themes.css";
import "./styles/theme-overrides.css";
import "./components/schedule/roster/doctorShiftRoster.css";
import "./components/schedule/chairSchedule.css";
import "./components/catalog/pricelist/servicePricelist.css";
import "./components/sanpin/sanpin.css";
import "./components/radiology/rvgCapture.css";
import "./components/radiology/hotFolderIntake.css";
import "./components/radiology/tuner/cbctTunerStyles.css";
import "./styles/low-spec-hardware.css";
import "./styles/onboarding-wizard.css";
import "./styles/guided-tour.css";

const AppShell = lazyWithRetry(() => import("./AppShell").then((m) => ({ default: m.AppShell })));

initHardwareCapabilities();

if (typeof window !== "undefined") {
	const themeState = useThemeStore.getState();
	const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	applyThemeToRoot(
		document.documentElement,
		resolveTheme(themeState.themeMode, prefersDark, {
			isAccessibilityMode: themeState.isAccessibilityMode,
			a11yFontSize: themeState.a11yFontSize,
		}),
	);
}

installApiAuthFetch();

const hash = typeof window !== "undefined" ? window.location.hash : "";
const search = typeof window !== "undefined" ? window.location.search : "";
const pathname = typeof window !== "undefined" ? window.location.pathname : "/";

const publicPortalRoute = publicPortalRouteFromHash(hash);

function resolveAuxDisplay(): AuxDisplayMode | null {
	if (typeof window === "undefined") return null;
	const cbct = parseCbctStudioRoute();
	if (cbct.isCbctStudio) return { kind: "cbct", route: cbct };
	const ceph = parseCephStudioRoute();
	if (ceph.isCephStudio) return { kind: "ceph", route: ceph };
	if (isPatientPresentationRoute()) return { kind: "presentation" };
	const lHash = hash.toLowerCase();
	const lSearch = search.toLowerCase();
	if (
		pathname === "/reception-board" ||
		lHash.includes("reception-board") ||
		lHash.includes("waiting-lounge") ||
		lSearch.includes("reception-board")
	) {
		return { kind: "lounge" };
	}
	return null;
}

const auxDisplay = publicPortalRoute ? null : resolveAuxDisplay();
const rootEl = document.getElementById("root");

if (rootEl) {
	createRoot(rootEl).render(
		<DenteQueryClientProvider>
			{publicPortalRoute ? (
				<BootErrorBoundary audience="public">
					<PublicSurfaceRouter route={publicPortalRoute} />
					<GlobalToast />
				</BootErrorBoundary>
			) : auxDisplay ? (
				<BootErrorBoundary audience="clinic">
					<AuxDisplayPopoutRouter aux={auxDisplay} />
					<GlobalToast />
				</BootErrorBoundary>
			) : (
				<BootErrorBoundary audience="clinic">
					<Suspense
						fallback={
							<div className="min-h-screen bg-[var(--paper)] text-[var(--ink-muted)] flex items-center justify-center text-sm font-medium">
								Загрузка рабочего места…
							</div>
						}
					>
						<AppShell />
					</Suspense>
					<GlobalToast />
				</BootErrorBoundary>
			)}
		</DenteQueryClientProvider>,
	);
}

if (
	typeof window !== "undefined" &&
	!publicPortalRoute &&
	!auxDisplay &&
	"serviceWorker" in navigator &&
	import.meta.env.PROD
) {
	window.addEventListener("load", () => {
		navigator.serviceWorker.register("/sw.js").catch((err) => {
			logger.warn("[SW] Registration failed", { error: String(err) });
		});
	});
}
