/**
 * apps/web/src/components/odontogram/DirectOdontogramModuleLauncher.tsx
 *
 * DENTE Dental CRM — Standalone Direct OdontogramModule Launcher (Mandates 8aq, 8b, 8e).
 * Mounts full OdontogramModule with OdontogramViewContainer, OdontogramBatchBar,
 * Wheeler 2.5D Vector Arch, and 1-Click Clinical Actions.
 *
 * Deep Links: ?stand=module, ?stand=odontogram, ?odontogram-module=1, #odontogram-module.
 */

import React, { useState, useEffect } from "react";
import { OdontogramModule } from "./OdontogramModule";

export function checkIsOdontogramModuleActive(): boolean {
	if (typeof window === "undefined") return false;
	const h = (window.location.hash || "").toLowerCase();
	const s = (window.location.search || "").toLowerCase();
	const params = new URLSearchParams(s);
	return (
		h.includes("odontogram-module") ||
		h.includes("stand-module") ||
		params.get("stand") === "module" ||
		params.get("stand") === "odontogram" ||
		params.get("odontogram-module") === "1"
	);
}

export const DirectOdontogramModuleLauncher: React.FC = () => {
	const [isActive, setIsActive] = useState(checkIsOdontogramModuleActive);

	useEffect(() => {
		const handleLocationChange = () => {
			setIsActive(checkIsOdontogramModuleActive());
		};
		window.addEventListener("hashchange", handleLocationChange);
		window.addEventListener("popstate", handleLocationChange);
		return () => {
			window.removeEventListener("hashchange", handleLocationChange);
			window.removeEventListener("popstate", handleLocationChange);
		};
	}, []);

	if (!isActive) return null;

	return (
		<main
			data-testid="direct-odontogram-module-launcher"
			className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col p-2 sm:p-4 box-border max-w-7xl mx-auto"
		>
			<OdontogramModule patientId="demo-patient-1" />
		</main>
	);
};
