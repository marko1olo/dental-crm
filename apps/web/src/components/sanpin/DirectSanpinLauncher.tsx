/**
 * apps/web/src/components/sanpin/DirectSanpinLauncher.tsx
 *
 * Автономный лаунчер Санитарной Студии и журналов стерилизации (Мандаты 8b, 8e, 8n, 8aq):
 * - Слушатели URL хешей: #sanpin, #autoclave, #sterilization, ?sanpin=1, ?autoclave=1, ?sterilization=1
 * - Слушатели глобальных событий: "dente:open-sanpin", "dente:open-autoclave", "dente:open-sterilization"
 * - Монтирует живой канонический мастер-контейнер SanpinStudioModal.
 * - Диапазон размера строго 70–90 строк (Мандат 8b/8zi).
 */

import React, { useState, useEffect, useCallback } from "react";
import { SanpinStudioModal, type SanpinStudioTab } from "./SanpinStudioModal";

function checkIsSanpinActive(): boolean {
	if (typeof window === "undefined") return false;
	const h = (window.location.hash || "").toLowerCase();
	const s = (window.location.search || "").toLowerCase();
	const params = new URLSearchParams(s);
	return (
		h.includes("sanpin") || h.includes("sterilization") || h.includes("autoclave") ||
		params.get("sanpin") === "1" || params.get("sterilization") === "1" || params.get("autoclave") === "1"
	);
}

function resolveInitialTab(): SanpinStudioTab {
	if (typeof window === "undefined") return "autoclave";
	const h = (window.location.hash || "").toLowerCase();
	const s = (window.location.search || "").toLowerCase();
	if (h.includes("pso") || h.includes("cleaning") || s.includes("pso")) return "pso";
	if (h.includes("bactericidal") || h.includes("uv") || h.includes("dezar") || s.includes("uv")) return "bactericidal";
	return "autoclave";
}

export const DirectSanpinLauncher: React.FC = () => {
	const [isActive, setIsActive] = useState(checkIsSanpinActive);
	const [isStudioOpen, setIsStudioOpen] = useState(checkIsSanpinActive);
	const [activeTab, setActiveTab] = useState<SanpinStudioTab>(resolveInitialTab);

	const handleLocationChange = useCallback(() => {
		const active = checkIsSanpinActive();
		setIsActive(active);
		setIsStudioOpen(active);
		setActiveTab(resolveInitialTab());
	}, []);

	const handleClose = useCallback(() => setIsStudioOpen(false), []);

	useEffect(() => {
		const handleOpenSanpin = () => { setIsActive(true); setIsStudioOpen(true); };
		const handleOpenAutoclave = () => { setIsActive(true); setIsStudioOpen(true); setActiveTab("autoclave"); };

		window.addEventListener("hashchange", handleLocationChange);
		window.addEventListener("popstate", handleLocationChange);
		window.addEventListener("dente:open-sanpin", handleOpenSanpin);
		window.addEventListener("dente:open-autoclave", handleOpenAutoclave);
		window.addEventListener("dente:open-sterilization", handleOpenAutoclave);

		return () => {
			window.removeEventListener("hashchange", handleLocationChange);
			window.removeEventListener("popstate", handleLocationChange);
			window.removeEventListener("dente:open-sanpin", handleOpenSanpin);
			window.removeEventListener("dente:open-autoclave", handleOpenAutoclave);
			window.removeEventListener("dente:open-sterilization", handleOpenAutoclave);
		};
	}, [handleLocationChange]);

	if (!isActive && !isStudioOpen) return null;

	return (
		<div data-testid="direct-sanpin-launcher" className="fixed inset-0 z-[9998] pointer-events-auto">
			<SanpinStudioModal
				isOpen={isStudioOpen}
				onClose={handleClose}
				initialTab={activeTab}
			/>
		</div>
	);
};

export default DirectSanpinLauncher;
