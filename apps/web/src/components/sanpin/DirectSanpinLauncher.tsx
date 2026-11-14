/**
 * apps/web/src/components/sanpin/DirectSanpinLauncher.tsx
 * Автономный лаунчер Санитарной Студии и журналов стерилизации (Мандаты 8b, 8e, 8n, 8aq).
 * Диапазон размера строго 70–80 строк (Мандат 8b/8zi).
 */
import React, { useState, useEffect, useCallback } from "react";
import { SanpinStudioModal, type SanpinStudioTab } from "./SanpinStudioModal";

export interface DirectSanpinLauncherProps {
	readonly forceOpen?: boolean;
}

function checkIsSanpinActive(): boolean {
	if (typeof window === "undefined") return false;
	const h = (window.location.hash || "").toLowerCase();
	const s = (window.location.search || "").toLowerCase();
	const p = new URLSearchParams(s);
	return (
		h.includes("sanpin") || h.includes("sterilization") || h.includes("autoclave") || h.includes("sterilizer") ||
		p.get("sanpin") === "1" || p.get("sterilization") === "1" || p.get("autoclave") === "1" || p.get("sterilizer") === "1" ||
		p.get("tab") === "sanpin" || p.get("tab") === "sterilization"
	);
}

function clearSanpinLocation(): void {
	if (typeof window === "undefined") return;
	const url = new URL(window.location.href);
	["sanpin", "sterilization", "autoclave", "sterilizer"].forEach((k) => url.searchParams.delete(k));
	if (/sanpin|sterilization|autoclave|sterilizer/i.test(url.hash)) url.hash = "";
	window.history.replaceState(null, "", url.toString());
}

function resolveInitialTab(): SanpinStudioTab {
	if (typeof window === "undefined") return "autoclave";
	const h = (window.location.hash || "").toLowerCase();
	const s = (window.location.search || "").toLowerCase();
	if (h.includes("kraft") || h.includes("package") || h.includes("pso") || s.includes("kraft")) return "kraft";
	if (h.includes("cleaning") || h.includes("uv") || h.includes("bactericidal") || h.includes("dezar")) return "cleaning";
	return "autoclave";
}

export const DirectSanpinLauncher: React.FC<DirectSanpinLauncherProps> = ({ forceOpen = false }) => {
	const [isOpen, setIsOpen] = useState(() => forceOpen || checkIsSanpinActive());
	const [activeTab, setActiveTab] = useState<SanpinStudioTab>(resolveInitialTab);

	const handleLocationChange = useCallback(() => {
		const active = forceOpen || checkIsSanpinActive();
		setIsOpen(active);
		if (active) setActiveTab(resolveInitialTab());
	}, [forceOpen]);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		clearSanpinLocation();
	}, []);

	useEffect(() => {
		const events: [string, () => void][] = [
			["hashchange", () => handleLocationChange()],
			["popstate", () => handleLocationChange()],
			["dente:open-sanpin", () => setIsOpen(true)],
			["dente:open-autoclave", () => { setIsOpen(true); setActiveTab("autoclave"); }],
			["dente:open-sterilization", () => { setIsOpen(true); setActiveTab("autoclave"); }],
			["dente:open-sterilization-hub", () => { setIsOpen(true); setActiveTab("autoclave"); }],
			["dente:open-kraft", () => { setIsOpen(true); setActiveTab("kraft"); }],
			["dente:open-cleaning", () => { setIsOpen(true); setActiveTab("cleaning"); }],
		];
		events.forEach(([ev, fn]) => window.addEventListener(ev, fn));
		return () => events.forEach(([ev, fn]) => window.removeEventListener(ev, fn));
	}, [handleLocationChange]);

	if (!isOpen) return null;
	return (
		<div data-testid="direct-sanpin-launcher" className="fixed inset-0 z-[9998] pointer-events-auto">
			<SanpinStudioModal isOpen={isOpen} onClose={handleClose} initialTab={activeTab} />
		</div>
	);
};
export default DirectSanpinLauncher;