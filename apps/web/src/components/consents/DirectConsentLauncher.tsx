/**
 * apps/web/src/components/consents/DirectConsentLauncher.tsx
 *
 * Перенаправлен на единый канонический SSOT Студии документов и согласий DENTE CRM.
 * Монтируется в AppShell.tsx, StandaloneLaunchers.tsx и clinicalLaunchersRegistry.tsx.
 * Открывает DocumentsStudioModal с первоначальным пакетом «Информированное согласие на лечение».
 * Мандаты 8b (Sweet Spot 40–60 строк), 8e (Автономия врача), 8aq (Монтирование в живой UI).
 */

import React, { useEffect, useState, useCallback } from "react";
import { ConsentStudioModal } from "./ConsentStudioModal";

export const isConsentTarget = (): boolean => {
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
		window.addEventListener("hashchange", handleHash);

		return () => {
			window.removeEventListener("dente:open-consent", handleOpen);
			window.removeEventListener("dente:open-consents", handleOpen);
			window.removeEventListener("dente-open-consents", handleOpen);
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
			initialDocId="therapy"
			patientContext={{
				patientName: "Иванов Иван Иванович",
				birthDate: "15.04.1985",
				passport: "45 10 123456 выдан ОВД г. Москвы",
				phone: "+7 (916) 123-45-67",
			}}
		/>
	);
};

export default DirectConsentLauncher;