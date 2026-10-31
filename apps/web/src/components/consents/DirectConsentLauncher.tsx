/**
 * apps/web/src/components/consents/DirectConsentLauncher.tsx
 *
 * Автономный лаунчер студии согласий DENTE CRM (Мандаты 8b, 8e, 8aq).
 * Монтируется в AppShell.tsx и StandaloneLaunchers.tsx.
 * Обрабатывает deep-links #consent, #consents, ?consent=1 и события dente:open-consent.
 */

import React, { useEffect, useState, useCallback } from "react";
import { ConsentStudioModal } from "./ConsentStudioModal";

const isConsentTarget = (): boolean => {
	if (typeof window === "undefined") return false;
	const s = window.location.search || "";
	const h = window.location.hash || "";
	return (
		h === "#consents" ||
		h === "#consent" ||
		h.startsWith("#consent?") ||
		h.startsWith("#consents?") ||
		h === "#consent-studio" ||
		h.includes("patient-consents") ||
		s.includes("consents=1") ||
		s.includes("consent=1") ||
		s.includes("standalone=consents") ||
		s.includes("tab=consents")
	);
};

export const DirectConsentLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(isConsentTarget);

	const handleOpen = useCallback(() => setIsOpen(true), []);
	const handleHash = useCallback(() => {
		if (isConsentTarget()) setIsOpen(true);
	}, []);

	useEffect(() => {
		window.addEventListener("dente:open-consent", handleOpen);
		window.addEventListener("dente:open-consents", handleOpen);
		window.addEventListener("dente-open-consents", handleOpen);
		window.addEventListener("dente:open-documents", handleOpen);
		window.addEventListener("hashchange", handleHash);

		return () => {
			window.removeEventListener("dente:open-consent", handleOpen);
			window.removeEventListener("dente:open-consents", handleOpen);
			window.removeEventListener("dente-open-consents", handleOpen);
			window.removeEventListener("dente:open-documents", handleOpen);
			window.removeEventListener("hashchange", handleHash);
		};
	}, [handleOpen, handleHash]);

	const handleClose = () => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("consents");
			url.searchParams.delete("consent");
			url.searchParams.delete("standalone");
			const cleanHash = window.location.hash.replace(/#consents|#consent-studio|#consent/g, "");
			window.history.replaceState({}, "", url.pathname + (url.search || "") + cleanHash);
		}
	};

	if (!isOpen) return null;

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
