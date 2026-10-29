/**
 * apps/web/src/components/sanpin/DirectSanpinLauncher.tsx
 *
 * Прямой автономный лаунчер хаба стерилизации и СанПиН (Мандаты 8b, 8e, 8n, 8aq):
 * - Слушатели URL хешей: #sanpin, #sterilization, #autoclave, ?sanpin=1, ?sterilization=1
 * - Слушатели глобальных событий: "dente:open-sanpin", "dente:open-autoclave"
 * - Монтирует живой канонический мастер-контейнер SanpinRegisters и хаб стерилизации.
 * - Размер строго 50–90 строк (Мандат 8b).
 */

import React, { useState, useEffect } from "react";
import { SanpinRegisters } from "./SanpinRegisters";
import { SanpinSterilizationHubModal } from "./SanpinSterilizationHubModal";

function checkIsSanpinActive(): boolean {
	if (typeof window === "undefined") return false;
	const h = window.location.hash || "";
	const s = window.location.search || "";
	const params = new URLSearchParams(s);
	return (
		h.includes("sanpin") ||
		h.includes("sterilization") ||
		h.includes("autoclave") ||
		params.get("sanpin") === "1" ||
		params.get("sterilization") === "1" ||
		params.get("autoclave") === "1"
	);
}

function checkIsHubRequested(): boolean {
	if (typeof window === "undefined") return false;
	const h = window.location.hash || "";
	return h.includes("autoclave") || h.includes("sterilization") || h.includes("hub");
}

export const DirectSanpinLauncher: React.FC = () => {
	const [isActive, setIsActive] = useState(checkIsSanpinActive);
	const [isHubOpen, setIsHubOpen] = useState(checkIsHubRequested);

	useEffect(() => {
		const handleLocationChange = () => {
			setIsActive(checkIsSanpinActive());
			setIsHubOpen(checkIsHubRequested());
		};
		const handleOpenSanpin = () => setIsActive(true);
		const handleOpenAutoclave = () => {
			setIsActive(true);
			setIsHubOpen(true);
		};

		window.addEventListener("hashchange", handleLocationChange);
		window.addEventListener("popstate", handleLocationChange);
		window.addEventListener("dente:open-sanpin", handleOpenSanpin);
		window.addEventListener("dente:open-autoclave", handleOpenAutoclave);

		return () => {
			window.removeEventListener("hashchange", handleLocationChange);
			window.removeEventListener("popstate", handleLocationChange);
			window.removeEventListener("dente:open-sanpin", handleOpenSanpin);
			window.removeEventListener("dente:open-autoclave", handleOpenAutoclave);
		};
	}, []);

	if (!isActive) return null;

	return (
		<div
			data-testid="direct-sanpin-launcher"
			className="w-full min-h-screen bg-[var(--paper-canvas,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] p-2 sm:p-5 flex flex-col box-border"
		>
			<SanpinRegisters />
			<SanpinSterilizationHubModal
				isOpen={isHubOpen}
				onClose={() => setIsHubOpen(false)}
			/>
		</div>
	);
};

export default DirectSanpinLauncher;
