/**
 * DirectOrthopedicsLauncher.tsx — Автономный лаунчер ортопедической студии и коронок (Мандат 8b 60–100 строк, 8aq).
 * Deep Link Mount: #orthopedics, #crowns, #ortho-studio, ?ortho=1, ?orthopedics=1, ?crowns=1, ?standalone=orthopedics.
 * Монтируется в AppShell.tsx и StandaloneLaunchers.tsx (Мандат 8aq).
 */

import React, { useState, useEffect, useCallback } from "react";
import { OrthopedicsStudioModal } from "./OrthopedicsStudioModal";

function checkIsOrthopedicsActive(): boolean {
	if (typeof window === "undefined") return false;
	const h = window.location.hash.toLowerCase();
	const s = window.location.search.toLowerCase();
	const params = new URLSearchParams(s);
	return (
		h.includes("orthopedics") || h.includes("crowns") || h.includes("ortho-studio") || h === "#ortho" ||
		params.get("ortho") === "1" || params.get("orthopedics") === "1" || params.get("crowns") === "1" || params.get("standalone") === "orthopedics"
	);
}

function readToothFromUrl(): string {
	if (typeof window === "undefined") return "16";
	const params = new URLSearchParams(window.location.search || "");
	const toothParam = params.get("tooth") || params.get("toothFdi") || params.get("toothNumber");
	if (toothParam) {
		const parsed = parseInt(toothParam, 10);
		if (!Number.isNaN(parsed) && parsed >= 11 && parsed <= 48) return String(parsed);
	}
	return "16";
}

export const DirectOrthopedicsLauncher: React.FC = () => {
	const [isActive, setIsActive] = useState<boolean>(checkIsOrthopedicsActive);
	const [isOpen, setIsOpen] = useState<boolean>(true);
	const [toothFdi, setToothFdi] = useState<string>(readToothFromUrl);

	useEffect(() => {
		const handleLocationChange = () => {
			const active = checkIsOrthopedicsActive();
			setIsActive(active);
			if (active) { setIsOpen(true); setToothFdi(readToothFromUrl()); }
		};
		const handleOpenEvent = (e: Event) => {
			setIsActive(true); setIsOpen(true);
			const custom = e as CustomEvent<{ toothFdi?: string | number }>;
			setToothFdi(custom.detail?.toothFdi ? String(custom.detail.toothFdi) : readToothFromUrl());
		};

		window.addEventListener("hashchange", handleLocationChange);
		window.addEventListener("popstate", handleLocationChange);
		window.addEventListener("dente:open-orthopedics", handleOpenEvent);
		window.addEventListener("dente:open-crowns", handleOpenEvent);
		window.addEventListener("dente:open-ortho", handleOpenEvent);

		return () => {
			window.removeEventListener("hashchange", handleLocationChange);
			window.removeEventListener("popstate", handleLocationChange);
			window.removeEventListener("dente:open-orthopedics", handleOpenEvent);
			window.removeEventListener("dente:open-crowns", handleOpenEvent);
			window.removeEventListener("dente:open-ortho", handleOpenEvent);
		};
	}, []);

	const handleClose = useCallback(() => {
		setIsOpen(false); setIsActive(false);
		if (typeof window !== "undefined") {
			const hash = window.location.hash;
			if (hash.includes("orthopedics") || hash.includes("crowns") || hash.includes("ortho")) {
				const cleanHash = hash.replace(/#(orthopedics-studio|orthopedics|ortho-studio|crowns|ortho)/gi, "");
				const url = new URL(window.location.href);
				url.searchParams.delete("ortho"); url.searchParams.delete("orthopedics"); url.searchParams.delete("crowns");
				if (url.searchParams.get("standalone") === "orthopedics") url.searchParams.delete("standalone");
				window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + cleanHash);
			}
		}
	}, []);

	if (!isActive || !isOpen) return null;

	return (
		<OrthopedicsStudioModal
			isOpen={isOpen} onClose={handleClose} initialToothFdi={toothFdi}
			patientName="Ковалев Дмитрий Сергеевич" doctorName="Д-р Смирнова Е. В. (Ортопед)" clinicName="Стоматологическая клиника DENTE"
		/>
	);
};

DirectOrthopedicsLauncher.displayName = "DirectOrthopedicsLauncher";
export default DirectOrthopedicsLauncher;
