/**
 * @dental/web/components/endo/DirectEndodonticsLauncher.tsx
 *
 * DENTE Dental CRM — Автономный лаунчер эндодонтической студии и протокола корневых каналов (Мандаты 8b <= 100 строк, 8aq).
 * Deep Link Mount: #endo, #endodontics, #root-canals, #endo-studio, ?endo=1, ?endodontics=1.
 * Монтируется в AppShell.tsx и StandaloneLaunchers.tsx (Мандат 8aq).
 */

import React, { useState, useEffect, useCallback } from "react";
import { EndodonticStudioModal } from "./EndodonticStudioModal";

function checkIsEndoActive(): boolean {
	if (typeof window === "undefined") return false;
	const h = window.location.hash.toLowerCase();
	const s = window.location.search.toLowerCase();
	const params = new URLSearchParams(s);
	return (
		h.includes("endo") || h.includes("endodontics") || h.includes("root-canals") || h.includes("rootcanal") ||
		params.get("endo") === "1" || params.get("endodontics") === "1" || params.get("root_canals") === "1" || params.get("standalone") === "endo"
	);
}

function readToothNumberFromUrl(): number {
	if (typeof window === "undefined") return 16;
	const params = new URLSearchParams(window.location.search || "");
	const toothParam = params.get("tooth") || params.get("toothNumber");
	if (toothParam) {
		const parsed = parseInt(toothParam, 10);
		if (!Number.isNaN(parsed) && parsed >= 11 && parsed <= 48) return parsed;
	}
	return 16;
}

export const DirectEndodonticsLauncher: React.FC = () => {
	const [isActive, setIsActive] = useState<boolean>(checkIsEndoActive);
	const [isOpen, setIsOpen] = useState<boolean>(true);
	const [toothNumber, setToothNumber] = useState<number>(readToothNumberFromUrl);

	useEffect(() => {
		const handleLocationChange = () => {
			const active = checkIsEndoActive();
			setIsActive(active);
			if (active) { setIsOpen(true); setToothNumber(readToothNumberFromUrl()); }
		};
		const handleOpenEvent = (e: Event) => {
			setIsActive(true); setIsOpen(true);
			const custom = e as CustomEvent<{ toothNumber?: number }>;
			setToothNumber(custom.detail?.toothNumber || readToothNumberFromUrl());
		};

		window.addEventListener("hashchange", handleLocationChange);
		window.addEventListener("popstate", handleLocationChange);
		window.addEventListener("dente:open-endo", handleOpenEvent);
		window.addEventListener("dente:open-endodontics", handleOpenEvent);
		window.addEventListener("dente:open-root-canals", handleOpenEvent);

		return () => {
			window.removeEventListener("hashchange", handleLocationChange);
			window.removeEventListener("popstate", handleLocationChange);
			window.removeEventListener("dente:open-endo", handleOpenEvent);
			window.removeEventListener("dente:open-endodontics", handleOpenEvent);
			window.removeEventListener("dente:open-root-canals", handleOpenEvent);
		};
	}, []);

	const handleClose = useCallback(() => {
		setIsOpen(false); setIsActive(false);
		if (typeof window !== "undefined") {
			const hash = window.location.hash;
			if (hash.includes("endo") || hash.includes("root-canals") || hash.includes("rootcanal")) {
				const cleanHash = hash.replace(/#(endo-studio|endodontics|root-canals|rootcanal|endo)/gi, "");
				const url = new URL(window.location.href);
				url.searchParams.delete("endo"); url.searchParams.delete("endodontics"); url.searchParams.delete("root_canals");
				window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + cleanHash);
			}
		}
	}, []);

	if (!isActive || !isOpen) return null;

	return (
		<EndodonticStudioModal
			isOpen={isOpen} onClose={handleClose} toothNumber={toothNumber} toothState="Острый пульпит (K04.0)"
			patientName="Смирнова Елена Сергеевна" doctorName="Д-р Смирнов А.П." clinicName="Стоматологическая клиника DENTE"
		/>
	);
};

DirectEndodonticsLauncher.displayName = "DirectEndodonticsLauncher";
export default DirectEndodonticsLauncher;
