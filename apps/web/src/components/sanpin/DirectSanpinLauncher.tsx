/**
 * apps/web/src/components/sanpin/DirectSanpinLauncher.tsx
 *
 * Прямой автономный лаунчер хаба стерилизации и СанПиН (Мандаты 8b, 8e, 8n, 8aq):
 * - Слушатели URL хешей: #sanpin, #sterilization, #autoclave, ?sanpin=1, ?sterilization=1
 * - Слушатель глобального custom-event: "dente:open-sanpin"
 * - Открывает единый SSOT SanpinSterilizationHubModal с нулевой блокировкой.
 * - Размер строго 60–90 строк (Мандат 8b).
 */

import React, { useState, useEffect, useCallback } from "react";
import { SanpinSterilizationHubModal } from "./SanpinSterilizationHubModal";

function getInitialOpenState(): boolean {
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
	const [isOpen, setIsOpen] = useState(getInitialOpenState);

	const checkHashOrSearch = useCallback(() => {
		if (typeof window === "undefined") return;
		if (getInitialOpenState()) {
			setIsOpen(true);
		}
	}, []);

	useEffect(() => {
		checkHashOrSearch();

		const handleHashChange = () => checkHashOrSearch();
		const handleOpenCustomEvent = () => setIsOpen(true);

		window.addEventListener("hashchange", handleHashChange);
		window.addEventListener("popstate", handleHashChange);
		window.addEventListener("dente:open-sanpin", handleOpenCustomEvent);

		return () => {
			window.removeEventListener("hashchange", handleHashChange);
			window.removeEventListener("popstate", handleHashChange);
			window.removeEventListener("dente:open-sanpin", handleOpenCustomEvent);
		};
	}, [checkHashOrSearch]);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const h = window.location.hash || "";
			if (h.includes("sanpin") || h.includes("sterilization") || h.includes("autoclave")) {
				window.history.replaceState(null, "", window.location.pathname + window.location.search);
			}
		}
	}, []);

	return (
		<div data-testid="direct-sanpin-launcher">
			<SanpinSterilizationHubModal
				isOpen={isOpen}
				onClose={handleClose}
				isDemo={true}
			/>
		</div>
	);
};

export default DirectSanpinLauncher;
