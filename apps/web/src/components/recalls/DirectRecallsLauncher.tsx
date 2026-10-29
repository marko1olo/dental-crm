/**
 * apps/web/src/components/recalls/DirectRecallsLauncher.tsx
 *
 * Прямой автономный лаунчер хаба диспансерного учета и профосмотров (Мандаты 8b, 8e, 8n, 8aq):
 * - Слушатели URL хешей: #recalls, #prophylaxis, #checkups, ?recalls=1
 * - Слушатель глобальных custom-events: "dente:open-recalls", "dente:open-recalls-hub"
 * - Открывает единый SSOT PatientRecallsHubModal с нулевой блокировкой.
 * - Размер строго 60–90 строк (Мандат 8b).
 */

import React, { useState, useEffect, useCallback } from "react";
import { PatientRecallsHubModal } from "./PatientRecallsHubModal";

function getInitialOpenState(): boolean {
	if (typeof window === "undefined") return false;
	const h = window.location.hash || "";
	const s = window.location.search || "";
	const params = new URLSearchParams(s);
	return (
		h.includes("recalls") ||
		h.includes("prophylaxis") ||
		h.includes("checkups") ||
		params.get("recalls") === "1"
	);
}

export const DirectRecallsLauncher: React.FC = () => {
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
		window.addEventListener("dente:open-recalls", handleOpenCustomEvent);
		window.addEventListener("dente:open-recalls-hub", handleOpenCustomEvent);

		return () => {
			window.removeEventListener("hashchange", handleHashChange);
			window.removeEventListener("popstate", handleHashChange);
			window.removeEventListener("dente:open-recalls", handleOpenCustomEvent);
			window.removeEventListener("dente:open-recalls-hub", handleOpenCustomEvent);
		};
	}, [checkHashOrSearch]);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const h = window.location.hash || "";
			if (h.includes("recalls") || h.includes("prophylaxis") || h.includes("checkups")) {
				window.history.replaceState(null, "", window.location.pathname + window.location.search);
			}
		}
	}, []);

	return (
		<div data-testid="direct-recalls-launcher">
			<PatientRecallsHubModal
				isOpen={isOpen}
				onClose={handleClose}
				isDemo={true}
			/>
		</div>
	);
};

export default DirectRecallsLauncher;
