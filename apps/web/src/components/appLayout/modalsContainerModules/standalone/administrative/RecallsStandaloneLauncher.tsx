/**
 * RecallsStandaloneLauncher — Совместимая обёртка над PatientRecallsHubModal.
 */

import type React from "react";
import { PatientRecallsHubModal } from "../../../../recalls/PatientRecallsHubModal";

export function renderRecallsStandaloneLauncher(): React.ReactElement | null {
	if (typeof window === "undefined") return null;
	const h = window.location.hash || "";
	const s = window.location.search || "";
	if (h.includes("recalls") || s.includes("recalls=1")) {
		return (
			<PatientRecallsHubModal
				isOpen={true}
				onClose={() => window.history.replaceState(null, "", window.location.pathname)}
			/>
		);
	}
	return null;
}
