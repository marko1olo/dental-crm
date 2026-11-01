/**
 * apps/web/src/components/sanpin/DirectSanpinLauncher.tsx
 *
 * Автономный лаунчер Санитарной Студии и журналов стерилизации (Мандаты 8b, 8e, 8n, 8aq):
 * - Слушатели URL хешей: #sanpin, #autoclave, #sterilization, #sterilizer, ?sanpin=1, ?sterilization=1
 * - Слушатели глобальных событий: "dente:open-sanpin", "dente:open-autoclave", "dente:open-sterilization"
 * - Монтирует живой канонический мастер-контейнер SanpinStudioModal.
 * - Диапазон размера строго 60–80 строк (Мандат 8b/8zi).
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
		p.get("sanpin") === "1" || p.get("sterilization") === "1" || p.get("autoclave") === "1" || p.get("sterilizer") === "1"
	);
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
	const [isActive, setIsActive] = useState(() => forceOpen || checkIsSanpinActive());
	const [isStudioOpen, setIsStudioOpen] = useState(() => forceOpen || checkIsSanpinActive());
	const [activeTab, setActiveTab] = useState<SanpinStudioTab>(resolveInitialTab);

	const handleLocationChange = useCallback(() => {
		const active = forceOpen || checkIsSanpinActive();
		setIsActive(active);
		setIsStudioOpen(active);
		setActiveTab(resolveInitialTab());
	}, [forceOpen]);

	const handleClose = useCallback(() => setIsStudioOpen(false), []);

	useEffect(() => {
		const handleOpen = () => { setIsActive(true); setIsStudioOpen(true); };
		const handleOpenAutoclave = () => { setIsActive(true); setIsStudioOpen(true); setActiveTab("autoclave"); };
		const events: [string, () => void][] = [
			["hashchange", handleLocationChange], ["popstate", handleLocationChange],
			["dente:open-sanpin", handleOpen], ["dente:open-autoclave", handleOpenAutoclave],
			["dente:open-sterilization", handleOpenAutoclave],
		];
		events.forEach(([ev, fn]) => window.addEventListener(ev, fn));
		return () => events.forEach(([ev, fn]) => window.removeEventListener(ev, fn));
	}, [handleLocationChange]);

	if (!isActive && !isStudioOpen) return null;

	return (
		<div data-testid="direct-sanpin-launcher" className="fixed inset-0 z-[9998] pointer-events-auto">
			<SanpinStudioModal isOpen={isStudioOpen} onClose={handleClose} initialTab={activeTab} />
		</div>
	);
};

export default DirectSanpinLauncher;
