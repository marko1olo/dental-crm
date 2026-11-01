/**
 * apps/web/src/components/sanpin/DirectSterilizationLauncher.tsx
 *
 * Автономный лаунчер стерилизации и автоклавирования (Мандаты 8b, 8e, 8n, 8aq):
 * - Слушатели URL хешей: #sterilization, #sanpin-autoclave, #autoclave, ?sterilization=1, ?autoclave=1
 * - Монтирует каноническую студию SanpinStudioModal с активной вкладкой автоклавирования.
 * - Размер строго 50–70 строк (Мандат 8b/8zi).
 */

import React, { useState, useEffect } from "react";
import { SanpinStudioModal } from "./SanpinStudioModal";

export interface DirectSterilizationLauncherProps {
	readonly forceOpen?: boolean;
}

function checkIsSterilizationActive(): boolean {
	if (typeof window === "undefined") return false;
	const h = (window.location.hash || "").toLowerCase();
	const s = (window.location.search || "").toLowerCase();
	const p = new URLSearchParams(s);
	return (
		h.includes("sterilization") ||
		h.includes("sanpin-autoclave") ||
		h.includes("autoclave") ||
		h.includes("sterilizer") ||
		p.get("sterilization") === "1" ||
		p.get("autoclave") === "1" ||
		p.get("sterilizer") === "1"
	);
}

export const DirectSterilizationLauncher: React.FC<DirectSterilizationLauncherProps> = ({ forceOpen = false }) => {
	const [isOpen, setIsOpen] = useState(() => forceOpen || checkIsSterilizationActive());

	useEffect(() => {
		const handleLocationChange = () => setIsOpen(forceOpen || checkIsSterilizationActive());
		const handleOpen = () => setIsOpen(true);
		const events: [string, () => void][] = [
			["hashchange", handleLocationChange], ["popstate", handleLocationChange],
			["dente:open-sterilization", handleOpen], ["dente:open-autoclave", handleOpen],
		];
		events.forEach(([ev, fn]) => window.addEventListener(ev, fn));
		return () => events.forEach(([ev, fn]) => window.removeEventListener(ev, fn));
	}, [forceOpen]);

	if (!isOpen) return null;

	return (
		<div data-testid="direct-sterilization-launcher" className="fixed inset-0 z-[9998] pointer-events-auto">
			<SanpinStudioModal isOpen={isOpen} onClose={() => setIsOpen(false)} initialTab="autoclave" />
		</div>
	);
};

export default DirectSterilizationLauncher;
