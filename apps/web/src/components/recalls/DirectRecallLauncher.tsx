/**
 * apps/web/src/components/recalls/DirectRecallLauncher.tsx
 *
 * Прямой автономный лаунчер студии повторных вызовов и профосмотров (SSOT).
 * Слушатели: #recalls, #prophylaxis, #recall-hub, ?recalls=1, событие dente:open-recalls.
 * Размер строго 50–70 строк (Мандат 8b/8zi).
 */

import React, { useState, useEffect, useCallback } from "react";
import { PatientRecallsHubModal } from "./PatientRecallsHubModal";

function checkIsRecallRequested(): boolean {
	if (typeof window === "undefined") return false;
	const h = window.location.hash || "";
	const s = window.location.search || "";
	const params = new URLSearchParams(s);
	return (
		h.includes("recalls") ||
		h.includes("prophylaxis") ||
		h.includes("recall-hub") ||
		params.get("recalls") === "1"
	);
}

export const DirectRecallLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState(checkIsRecallRequested);

	const syncOpenState = useCallback(() => {
		if (typeof window === "undefined") return;
		if (checkIsRecallRequested()) setIsOpen(true);
	}, []);

	useEffect(() => {
		syncOpenState();
		const handleHashChange = () => syncOpenState();
		const handleCustomOpen = () => setIsOpen(true);

		window.addEventListener("hashchange", handleHashChange);
		window.addEventListener("popstate", handleHashChange);
		window.addEventListener("dente:open-recalls", handleCustomOpen);
		window.addEventListener("dente:open-recalls-hub", handleCustomOpen);

		return () => {
			window.removeEventListener("hashchange", handleHashChange);
			window.removeEventListener("popstate", handleHashChange);
			window.removeEventListener("dente:open-recalls", handleCustomOpen);
			window.removeEventListener("dente:open-recalls-hub", handleCustomOpen);
		};
	}, [syncOpenState]);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const h = window.location.hash || "";
			if (h.includes("recalls") || h.includes("prophylaxis") || h.includes("recall-hub")) {
				window.history.replaceState(null, "", window.location.pathname + window.location.search);
			}
		}
	}, []);

	return (
		<div data-testid="direct-recall-launcher">
			<PatientRecallsHubModal isOpen={isOpen} onClose={handleClose} />
		</div>
	);
};

export default DirectRecallLauncher;
