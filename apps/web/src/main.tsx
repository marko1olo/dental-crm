import React from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "./AppShell";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/patients-redesign.css";
import { initAntifragility } from "./lib/antifragility";

// Offline API sandbox is an explicit demo/dev mode. Normal runs must surface backend/auth failures.
if (
	import.meta.env.VITE_DENTE_ENABLE_OFFLINE_SANDBOX === "1" ||
	import.meta.env.VITE_DENTE_ENABLE_OFFLINE_SANDBOX === "true"
) {
	initAntifragility({ enabled: true });
}

createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<AppShell />
	</React.StrictMode>,
);

const DENTE_SW_RELOAD_MARKER = "dente:sw-controller-reload";

function requestDenteServiceWorkerActivation(
	worker: ServiceWorker | null | undefined,
): void {
	worker?.postMessage({ type: "DENTE_SKIP_WAITING" });
}

function reloadOnceAfterServiceWorkerControllerChange(): void {
	if (window.sessionStorage.getItem(DENTE_SW_RELOAD_MARKER) === "1") return;
	window.sessionStorage.setItem(DENTE_SW_RELOAD_MARKER, "1");
	window.location.reload();
}

function watchDenteServiceWorkerUpdates(
	registration: ServiceWorkerRegistration,
): void {
	if (registration.waiting && navigator.serviceWorker.controller) {
		requestDenteServiceWorkerActivation(registration.waiting);
	}

	registration.addEventListener("updatefound", () => {
		const installingWorker = registration.installing;
		if (!installingWorker) return;

		installingWorker.addEventListener("statechange", () => {
			if (
				installingWorker.state === "installed" &&
				navigator.serviceWorker.controller
			) {
				requestDenteServiceWorkerActivation(installingWorker);
			}
		});
	});

	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "visible") {
			void registration.update().catch(() => {
				// Update polling is opportunistic; clinical work must not be blocked by SW checks.
			});
		}
	});

	window.setInterval(
		() => {
			void registration.update().catch(() => {
				// Long clinic sessions recover when the network returns; failed checks are retried.
			});
		},
		30 * 60 * 1000,
	);
}

if ("serviceWorker" in navigator && import.meta.env.PROD) {
	if (window.sessionStorage.getItem(DENTE_SW_RELOAD_MARKER) === "1") {
		window.sessionStorage.removeItem(DENTE_SW_RELOAD_MARKER);
	}

	navigator.serviceWorker.addEventListener(
		"controllerchange",
		reloadOnceAfterServiceWorkerControllerChange,
	);

	window.addEventListener("load", () => {
		navigator.serviceWorker
			.register("/sw.js")
			.then((registration) => {
				watchDenteServiceWorkerUpdates(registration);
				void registration.update().catch(() => {
					// Offline support is optional in development-like hosts.
				});
			})
			.catch(() => {
				// Offline support is optional in development-like hosts.
			});
	});
}
