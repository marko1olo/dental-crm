/**
 * apps/web/src/components/settings/DirectSettingsLauncher.tsx
 * Автономный лончер студии настроек клиники и реквизитов (SSOT).
 * Монтируется в AppShell.tsx, administrativeLaunchersRegistry.tsx (Мандаты 8b 60–80 строк, 8e, 8aq).
 */

import React, { useEffect, useState } from "react";
import { SettingsStudioModal } from "./SettingsStudioModal";

function isSettingsRequested(): boolean {
	if (typeof window === "undefined") return false;
	const s = window.location.search || "";
	const h = window.location.hash || "";
	return (
		h === "#settings-studio" ||
		h === "#clinic-setup" ||
		h === "#clinic-requisites" ||
		h.startsWith("#settings-studio?") ||
		h.startsWith("#clinic-setup?") ||
		h.startsWith("#clinic-requisites?") ||
		s.includes("clinic_setup=1") ||
		s.includes("clinic-setup") ||
		s.includes("clinic-requisites") ||
		s.includes("standalone=settings")
	);
}

export const DirectSettingsLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(isSettingsRequested);

	useEffect(() => {
		const handleOpen = () => setIsOpen(true);
		const handleHashChange = () => {
			if (isSettingsRequested()) {
				setIsOpen(true);
			}
		};

		window.addEventListener("dente:open-settings", handleOpen);
		window.addEventListener("dente-open-settings", handleOpen);
		window.addEventListener("dente:open-clinic-setup", handleOpen);
		window.addEventListener("hashchange", handleHashChange);
		window.addEventListener("popstate", handleHashChange);

		return () => {
			window.removeEventListener("dente:open-settings", handleOpen);
			window.removeEventListener("dente-open-settings", handleOpen);
			window.removeEventListener("dente:open-clinic-setup", handleOpen);
			window.removeEventListener("hashchange", handleHashChange);
			window.removeEventListener("popstate", handleHashChange);
		};
	}, []);

	if (!isOpen) return null;

	const handleClose = () => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("settings");
			url.searchParams.delete("clinic_setup");
			const cleanHash = window.location.hash.replace(
				/#settings-studio|#clinic-requisites|#clinic-setup|#settings/g,
				"",
			);
			const newUrl = url.pathname + (url.search ? url.search : "") + cleanHash;
			window.history.replaceState({}, "", newUrl || "/");
		}
	};

	return <SettingsStudioModal isOpen={isOpen} onClose={handleClose} />;
};

export default DirectSettingsLauncher;
