/**
 * apps/web/src/components/sanpin/DirectSanpinLauncher.tsx
 *
 * Прямой автономный лаунчер хаба стерилизации и СанПиН (Мандаты 8b, 8e, 8n, 8aq):
 * - Слушатели URL хешей: #sanpin, #sterilization, #autoclave, ?sanpin=1, ?sterilization=1
 * - Слушатель глобального custom-event: "dente:open-sanpin"
 * - Монтирует живой канонический мастер-контейнер SanpinRegisters с нулевой блокировкой.
 * - Размер строго 40–80 строк (Мандат 8b).
 */

import React, { useState, useEffect } from "react";
import { SanpinRegisters } from "./SanpinRegisters";

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
		params.get("sterilization") === "1"
	);
}

export const DirectSanpinLauncher: React.FC = () => {
	const [isActive, setIsActive] = useState(checkIsSanpinActive);

	useEffect(() => {
		const handleLocationChange = () => {
			setIsActive(checkIsSanpinActive());
		};
		const handleCustomEvent = () => setIsActive(true);

		window.addEventListener("hashchange", handleLocationChange);
		window.addEventListener("popstate", handleLocationChange);
		window.addEventListener("dente:open-sanpin", handleCustomEvent);

		return () => {
			window.removeEventListener("hashchange", handleLocationChange);
			window.removeEventListener("popstate", handleLocationChange);
			window.removeEventListener("dente:open-sanpin", handleCustomEvent);
		};
	}, []);

	if (!isActive) return null;

	return (
		<div
			data-testid="direct-sanpin-launcher"
			className="w-full min-h-screen bg-[var(--paper-canvas,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] p-2 sm:p-5 flex flex-col box-border"
		>
			<SanpinRegisters />
		</div>
	);
};

export default DirectSanpinLauncher;
