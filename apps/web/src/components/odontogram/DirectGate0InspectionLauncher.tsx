/**
 * DirectGate0InspectionLauncher.tsx — Автономный стенд Wheeler 2.5D анатомической одонтограммы 32 зубов.
 * Deep Link Mount: #odontogram-32, #odontogram-gate0, #odontogram-mandible, ?stand=arch32.
 * Мандаты 8b (Sweet Spot <= 90 строк), 8aq (Монтирование в живой UI), 8ar (Wheeler 2.5D).
 */

import React, { useState, useEffect, useCallback } from "react";
import { Tooth46InspectionStand } from "./gate0/Tooth46InspectionStand";

function checkIsGate0Active(): boolean {
	if (typeof window === "undefined") return false;
	const h = window.location.hash.toLowerCase();
	const s = window.location.search.toLowerCase();
	return (
		h.includes("odontogram-gate0") ||
		h.includes("odontogram-32") ||
		h.includes("odontogram-mandible") ||
		h.includes("arch32") ||
		s.includes("stand=arch32") ||
		s.includes("stand=mandible") ||
		s.includes("stand=tooth46")
	);
}

export const DirectGate0InspectionLauncher: React.FC = () => {
	const [isActive, setIsActive] = useState<boolean>(checkIsGate0Active);

	useEffect(() => {
		const handleLocationChange = () => {
			setIsActive(checkIsGate0Active());
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
		<div
			className="fixed inset-0 z-50 overflow-y-auto bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)]"
			data-testid="direct-gate0-inspection-launcher"
		>
			<Tooth46InspectionStand />
		</div>
	);
};

DirectGate0InspectionLauncher.displayName = "DirectGate0InspectionLauncher";
