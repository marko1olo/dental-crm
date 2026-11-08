/**
 * apps/web/src/components/analytics/DirectAnalyticsLauncher.tsx
 *
 * Автономный лаунчер управленческой аналитики и дашборда руководителя DENTE CRM.
 * Монтируется в AppShell & StandaloneLaunchers (Мандаты 8b <= 100 строк, 8e, 8aq).
 */

import React, { useEffect, useState } from "react";
import { ExecutiveAnalyticsStudioModal } from "./ExecutiveAnalyticsStudioModal";

export const DirectAnalyticsLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			h === "#executive-studio" ||
			h.includes("executive-studio") ||
			h.includes("clinic-analytics-studio") ||
			s.includes("analytics=studio") ||
			s.includes("dashboard=studio") ||
			s.includes("executive_studio=1")
		);
	});

	useEffect(() => {
		const handleOpen = () => setIsOpen(true);
		const handleHashChange = () => {
			const s = window.location.search || "";
			const h = window.location.hash || "";
			if (
				h === "#executive-studio" ||
				h.includes("executive-studio") ||
				h.includes("clinic-analytics-studio") ||
				s.includes("analytics=studio") ||
				s.includes("dashboard=studio") ||
				s.includes("executive_studio=1")
			) {
				setIsOpen(true);
			}
		};

		window.addEventListener("dente-open-executive-studio", handleOpen);
		window.addEventListener("dente:open-executive-studio", handleOpen);
		window.addEventListener("hashchange", handleHashChange);

		return () => {
			window.removeEventListener("dente-open-executive-studio", handleOpen);
			window.removeEventListener("dente:open-executive-studio", handleOpen);
			window.removeEventListener("hashchange", handleHashChange);
		};
	}, []);

	if (!isOpen) return null;

	const handleClose = () => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("executive_studio");
			const cleanHash = window.location.hash.replace(
				/#executive-studio|#clinic-analytics-studio/g,
				"",
			);
			const newUrl = url.pathname + (url.search ? url.search : "") + cleanHash;
			window.history.replaceState({}, "", newUrl);
		}
	};

	return (
		<ExecutiveAnalyticsStudioModal
			isOpen={isOpen}
			onClose={handleClose}
		/>
	);
};
