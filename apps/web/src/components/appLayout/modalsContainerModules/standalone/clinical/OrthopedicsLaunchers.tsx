/**
 * OrthopedicsLaunchers — Ортопедические лаунчеры (презентация плана лечения) (Мандат 8b, <= 120 строк).
 */

import React, { Suspense } from "react";
import { lazyWithRetry } from "../../../../../lib/lazyWithRetry";
import { AppLoadingState } from "../../../../../AppBootState";
import { isPatientPresentationRoute } from "../../../../photography/presentationSyncProtocol";

const PatientPresentationStandaloneView = lazyWithRetry(() =>
	import("../../../../photography/PatientPresentationStandaloneView").then((m) => ({
		default: m.PatientPresentationStandaloneView,
	})),
);

export function renderOrthopedicsLaunchers(): React.ReactElement | null {
	if (typeof window === "undefined") return null;

	if (isPatientPresentationRoute()) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка экрана презентации..." />}>
				<PatientPresentationStandaloneView
					onClose={() => {
						const u = new URL(window.location.href);
						u.searchParams.delete("view");
						u.searchParams.delete("presentation");
						window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("presentation") ? "" : u.hash));
						window.location.reload();
					}}
				/>
			</Suspense>
		);
	}

	return null;
}
