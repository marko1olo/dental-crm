/**
 * apps/web/src/components/consents/DirectConsentLauncher.tsx
 *
 * Автономный лаунчер студии согласий и договоров DENTE CRM.
 * Монтируется в AppShell.tsx и StandaloneLaunchers.tsx (Мандаты 8b <= 100 строк, 8e, 8aq).
 * Слушает deep links: #consents, #consent, #documents, ?consents=1, ?consent=1.
 */

import React, { useEffect, useState } from "react";
import { ConsentStudioModal } from "./ConsentStudioModal";

export const DirectConsentLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			h === "#consents" ||
			h === "#consent" ||
			h.startsWith("#consent?") ||
			h.startsWith("#consents?") ||
			h === "#documents" ||
			h.startsWith("#documents?") ||
			h === "#consent-studio" ||
			h.includes("patient-consents") ||
			s.includes("consents=1") ||
			s.includes("consent=1") ||
			s.includes("standalone=consents") ||
			s.includes("tab=consents")
		);
	});

	useEffect(() => {
		const handleOpen = () => setIsOpen(true);
		const handleHashChange = () => {
			const s = window.location.search || "";
			const h = window.location.hash || "";
			if (
				h === "#consents" ||
				h === "#consent" ||
				h.startsWith("#consent?") ||
				h.startsWith("#consents?") ||
				h === "#documents" ||
				h.startsWith("#documents?") ||
				h === "#consent-studio" ||
				h.includes("patient-consents") ||
				s.includes("consents=1") ||
				s.includes("consent=1") ||
				s.includes("standalone=consents") ||
				s.includes("tab=consents")
			) {
				setIsOpen(true);
			}
		};

		window.addEventListener("dente:open-consents", handleOpen);
		window.addEventListener("dente-open-consents", handleOpen);
		window.addEventListener("dente:open-documents", handleOpen);
		window.addEventListener("hashchange", handleHashChange);

		return () => {
			window.removeEventListener("dente:open-consents", handleOpen);
			window.removeEventListener("dente-open-consents", handleOpen);
			window.removeEventListener("dente:open-documents", handleOpen);
			window.removeEventListener("hashchange", handleHashChange);
		};
	}, []);

	if (!isOpen) return null;

	const handleClose = () => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("consents");
			url.searchParams.delete("consent");
			url.searchParams.delete("standalone");
			const cleanHash = window.location.hash.replace(
				/#consents|#consent-studio|#consent/g,
				"",
			);
			const newUrl =
				url.pathname + (url.search ? url.search : "") + cleanHash;
			window.history.replaceState({}, "", newUrl);
		}
	};

	return (
		<ConsentStudioModal
			isOpen={isOpen}
			onClose={handleClose}
			patientContext={{
				patientName: "Иванов Иван Иванович",
				birthDate: "15.04.1985",
				passport: "серия 4510 № 123456 выдан ОВД г. Москвы",
				doctorName: "Смирнова Елена Сергеевна",
			}}
		/>
	);
};

export default DirectConsentLauncher;
