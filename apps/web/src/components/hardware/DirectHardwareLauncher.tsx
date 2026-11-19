/**
 * apps/web/src/components/hardware/DirectHardwareLauncher.tsx
 *
 * DENTE Dental CRM — Standalone Direct Hardware Studio Launcher.
 * Deep Link Mount: #hardware, #hardware-studio, #equipment, ?hardware=1, ?standalone=hardware.
 * Mounts in AppShell & StandaloneLaunchers (Mandates 8b, 8aq, Sweet Spot 60-80 lines).
 */

import React, { useState, useEffect } from "react";
import { HardwareSettingsTab } from "../settings/HardwareSettingsTab.js";

function checkIsHardwareActive(): boolean {
	if (typeof window === "undefined") return false;
	const h = window.location.hash || "";
	const s = window.location.search || "";
	const params = new URLSearchParams(s);
	return (
		h.includes("hardware") ||
		h.includes("equipment") ||
		h.includes("sensor-gateway") ||
		params.get("hardware") === "1" ||
		params.get("standalone") === "hardware" ||
		params.get("hardware-studio") === "1"
	);
}

export const DirectHardwareLauncher: React.FC = () => {
	const [isActive, setIsActive] = useState(checkIsHardwareActive);

	useEffect(() => {
		const handleLocationChange = () => {
			setIsActive(checkIsHardwareActive());
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
		<div className="min-h-screen w-full bg-[var(--paper)] text-[var(--ink)] p-3 sm:p-6" data-testid="hardware-standalone-view">
			<HardwareSettingsTab />
		</div>
	);
};
