/**
 * @dental/web/components/orthodontics/DirectOrthodonticsLauncher.tsx
 * DENTE Dental CRM — Автономный лаунчер ортодонтической студии (Мандаты 8b 70–90 строк, 8aq).
 * Deep Link Mount: #ortho, #orthodontics, ?ortho=1, ?orthodontics=1.
 */

import React, { useState, useEffect, useCallback } from "react";
import { OrthodonticStudioModal } from "./OrthodonticStudioModal";
import type { OrthoProtocolState } from "./orthodonticsCatalogData";

function checkIsOrthoActive(): boolean {
	if (typeof window === "undefined") return false;
	const h = window.location.hash.toLowerCase();
	const s = window.location.search.toLowerCase();
	const p = new URLSearchParams(s);
	return h === "#ortho" || h.includes("ortho") || p.get("ortho") === "1" || p.get("orthodontics") === "1";
}

export const DirectOrthodonticsLauncher: React.FC = () => {
	const [isActive, setIsActive] = useState<boolean>(checkIsOrthoActive);
	const [isOpen, setIsOpen] = useState<boolean>(true);

	const [theme] = useState<"light" | "dark">(() => {
		if (typeof window !== "undefined") {
			const s = window.location.search.toLowerCase();
			const h = window.location.hash.toLowerCase();
			if (s.includes("dark") || h.includes("dark") || document.documentElement.classList.contains("dark")) return "dark";
		}
		return "light";
	});

	useEffect(() => {
		const handleLocationChange = () => {
			const active = checkIsOrthoActive();
			setIsActive(active);
			if (active) setIsOpen(true);
		};
		const handleOpenEvent = () => { setIsActive(true); setIsOpen(true); };

		window.addEventListener("hashchange", handleLocationChange);
		window.addEventListener("popstate", handleLocationChange);
		window.addEventListener("dente:open-orthodontics", handleOpenEvent);
		window.addEventListener("dente:open-ortho", handleOpenEvent);

		return () => {
			window.removeEventListener("hashchange", handleLocationChange);
			window.removeEventListener("popstate", handleLocationChange);
			window.removeEventListener("dente:open-orthodontics", handleOpenEvent);
			window.removeEventListener("dente:open-ortho", handleOpenEvent);
		};
	}, []);

	useEffect(() => {
		if (typeof document !== "undefined") {
			document.documentElement.classList.toggle("dark", theme === "dark");
			document.documentElement.classList.toggle("light", theme !== "dark");
		}
	}, [theme]);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		setIsActive(false);
		if (typeof window !== "undefined") {
			const cleanHash = window.location.hash.replace(/#(orthodontics|ortho-protocol|ortho-studio|ortho)/gi, "");
			const url = new URL(window.location.href);
			url.searchParams.delete("ortho");
			url.searchParams.delete("orthodontics");
			window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + cleanHash);
		}
	}, []);

	if (!isActive || !isOpen) return null;

	return (
		<OrthodonticStudioModal
			isOpen={isOpen}
			onClose={handleClose}
			onSaveProtocol={() => { setIsOpen(false); setIsActive(false); }}
			patientName="Смирнова Екатерина Андреевна"
			doctorName="Д-р Соколов А. В."
		/>
	);
};

DirectOrthodonticsLauncher.displayName = "DirectOrthodonticsLauncher";
export default DirectOrthodonticsLauncher;
