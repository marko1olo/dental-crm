/**
 * @dental/web/components/orthodontics/DirectOrthodonticsLauncher.tsx
 *
 * DENTE Dental CRM — Автономный лаунчер ортодонтической студии и протокола активации (Мандаты 8b <= 150 строк, 8aq).
 * Deep Link Mount: #orthodontics, #ortho-protocol, #ortho, #ortho-studio, ?orthodontics=1.
 * Монтируется в AppShell.tsx и StandaloneLaunchers.tsx (Мандат 8aq).
 */

import React, { useState, useEffect, useCallback } from "react";
import { OrthodonticStudioModal } from "./OrthodonticStudioModal";
import type { OrthoProtocolState } from "./orthodonticsCatalogData";

function checkIsOrthoActive(): boolean {
	if (typeof window === "undefined") return false;
	const h = window.location.hash.toLowerCase();
	const s = window.location.search.toLowerCase();
	const params = new URLSearchParams(s);
	return (
		h.includes("orthodontics") ||
		h.includes("ortho-protocol") ||
		h.includes("ortho-studio") ||
		params.get("orthodontics") === "1" ||
		params.get("ortho_protocol") === "1"
	);
}

export const DirectOrthodonticsLauncher: React.FC = () => {
	const [isActive, setIsActive] = useState<boolean>(checkIsOrthoActive);
	const [isOpen, setIsOpen] = useState<boolean>(true);

	const [theme, setTheme] = useState<"light" | "dark">(() => {
		if (typeof window !== "undefined") {
			const search = window.location.search.toLowerCase();
			const hash = window.location.hash.toLowerCase();
			if (search.includes("dark") || hash.includes("dark")) return "dark";
			if (document.documentElement.classList.contains("dark")) return "dark";
		}
		return "light";
	});

	useEffect(() => {
		const handleLocationChange = () => {
			const active = checkIsOrthoActive();
			setIsActive(active);
			if (active) setIsOpen(true);
		};
		const handleOpenEvent = () => {
			setIsActive(true);
			setIsOpen(true);
		};

		window.addEventListener("hashchange", handleLocationChange);
		window.addEventListener("popstate", handleLocationChange);
		window.addEventListener("dente:open-orthodontics", handleOpenEvent);
		window.addEventListener("dente:open-ortho-protocol", handleOpenEvent);
		window.addEventListener("dente:open-ortho", handleOpenEvent);

		return () => {
			window.removeEventListener("hashchange", handleLocationChange);
			window.removeEventListener("popstate", handleLocationChange);
			window.removeEventListener("dente:open-orthodontics", handleOpenEvent);
			window.removeEventListener("dente:open-ortho-protocol", handleOpenEvent);
			window.removeEventListener("dente:open-ortho", handleOpenEvent);
		};
	}, []);

	useEffect(() => {
		if (typeof document !== "undefined") {
			if (theme === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
			} else {
				document.documentElement.classList.remove("dark");
				document.documentElement.classList.add("light");
			}
		}
	}, [theme]);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		setIsActive(false);
		if (typeof window !== "undefined") {
			const hash = window.location.hash;
			if (
				hash.includes("orthodontics") ||
				hash.includes("ortho-protocol") ||
				hash.includes("ortho-studio") ||
				hash.includes("ortho")
			) {
				const cleanHash = hash.replace(/#(orthodontics|ortho-protocol|ortho-studio|ortho)/gi, "");
				const url = new URL(window.location.href);
				url.searchParams.delete("orthodontics");
				url.searchParams.delete("ortho_protocol");
				url.searchParams.delete("ortho");
				window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + cleanHash);
			}
		}
	}, []);

	const handleSaveProtocol = useCallback((_savedProtocol: OrthoProtocolState, _soapText: string) => {
		setIsOpen(false);
		setIsActive(false);
	}, []);

	if (!isActive || !isOpen) return null;

	return (
		<OrthodonticStudioModal
			isOpen={isOpen}
			onClose={handleClose}
			onSaveProtocol={handleSaveProtocol}
			patientName="Смирнова Екатерина Андреевна"
			doctorName="Д-р Соколов А. В."
		/>
	);
};

DirectOrthodonticsLauncher.displayName = "DirectOrthodonticsLauncher";
export default DirectOrthodonticsLauncher;
