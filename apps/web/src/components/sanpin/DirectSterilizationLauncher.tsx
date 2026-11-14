/**
 * apps/web/src/components/sanpin/DirectSterilizationLauncher.tsx
 *
 * Автономный лаунчер стерилизации и автоклавирования (Мандаты 8b, 8e, 8n, 8aq):
 * - Слушатели URL хешей: #sterilization-hub, ?sterilization=1
 * - Монтирует каноническую студию SanpinStudioModal с активной вкладкой автоклавирования.
 * - Размер строго 50–90 строк (Мандат 8b/8zi Sweet Spot).
 */

import React, { useState, useEffect, useCallback } from "react";
import { SanpinStudioModal } from "./SanpinStudioModal";

export interface DirectSterilizationLauncherProps {
	readonly forceOpen?: boolean;
}

function checkIsSterilizationActive(): boolean {
	if (typeof window === "undefined") return false;
	const h = (window.location.hash || "").toLowerCase();
	const s = (window.location.search || "").toLowerCase();
	const p = new URLSearchParams(s);
	return h === "#sterilization-hub" || p.get("sterilization_direct") === "1";
}

function clearSterilizationLocation(): void {
	if (typeof window === "undefined") return;
	const url = new URL(window.location.href);
	url.searchParams.delete("sterilization_direct");
	if (url.hash === "#sterilization-hub") url.hash = "";
	window.history.replaceState(null, "", url.toString());
}

export const DirectSterilizationLauncher: React.FC<DirectSterilizationLauncherProps> = ({
	forceOpen = false,
}) => {
	const [isOpen, setIsOpen] = useState(() => forceOpen || checkIsSterilizationActive());

	const handleLocationChange = useCallback(() => {
		setIsOpen(forceOpen || checkIsSterilizationActive());
	}, [forceOpen]);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		clearSterilizationLocation();
	}, []);

	useEffect(() => {
		const handleOpen = () => setIsOpen(true);
		window.addEventListener("hashchange", handleLocationChange);
		window.addEventListener("dente:open-sterilization-modal", handleOpen);
		return () => {
			window.removeEventListener("hashchange", handleLocationChange);
			window.removeEventListener("dente:open-sterilization-modal", handleOpen);
		};
	}, [handleLocationChange]);

	if (!isOpen) return null;

	return (
		<div data-testid="direct-sterilization-launcher" className="fixed inset-0 z-[9998] pointer-events-auto">
			<SanpinStudioModal isOpen={isOpen} onClose={handleClose} initialTab="autoclave" />
		</div>
	);
};

export default DirectSterilizationLauncher;
