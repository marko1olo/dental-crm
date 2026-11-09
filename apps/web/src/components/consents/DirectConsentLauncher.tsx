/**
 * apps/web/src/components/consents/DirectConsentLauncher.tsx
 *
 * Перенаправлен на единый канонический SSOT Студии документов и согласий DENTE CRM.
 * Монтируется в AppShell.tsx, StandaloneLaunchers.tsx и clinicalLaunchersRegistry.tsx.
 * Открывает DocumentsStudioModal с первоначальным пакетом «Информированное согласие на лечение».
 * Мандаты 8b (Sweet Spot 40–60 строк), 8e (Автономия врача), 8aq (Монтирование в живой UI).
 */

import React, { useEffect, useState, useCallback } from "react";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { ConsentStudioModal } from "./ConsentStudioModal";
import { type ConsentDocumentId, normalizeConsentDocId } from "./consentCatalogData";

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

export const getInitialDocIdFromUrl = (): ConsentDocumentId => {
	if (typeof window === "undefined") return "therapy";
	const s = window.location.search || "";
	const h = window.location.hash || "";
	const match = s.match(/[?&]docId=([a-z_]+)/i) || h.match(/docId=([a-z_]+)/i) || h.match(/#consent-([a-z_]+)/i);
	if (match?.[1]) {
		return normalizeConsentDocId(match[1]);
	}
	return "therapy";
};

const resolvePatientContext = (): {
	patientId?: string;
	patientName?: string;
	birthDate?: string;
	passport?: string;
	phone?: string;
	doctorName?: string;
} | undefined => {
	if (typeof window === "undefined") return undefined;
	const s = new URLSearchParams(window.location.search);
	const patName = s.get("patientName") || s.get("name");
	const patId = s.get("patientId") || s.get("id");
	const patPhone = s.get("phone");
	const patPassport = s.get("passport");
	const patBirthDate = s.get("birthDate");

	if (patName || patId || patPhone || patPassport || patBirthDate) {
		return {
			patientId: patId || undefined,
			patientName: patName || undefined,
			birthDate: patBirthDate || undefined,
			passport: patPassport || undefined,
			phone: patPhone || undefined,
		};
	}

	if (isDemoShowcaseMode()) {
		return {
			patientName: "Иванов Иван Иванович",
			birthDate: "15.04.1985",
			passport: "45 10 123456 выдан ОВД г. Москвы",
			phone: "+7 (916) 123-45-67",
		};
	}

	return undefined;
};

export const DirectConsentLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(isConsentTarget);
	const [initialDocId, setInitialDocId] = useState<ConsentDocumentId>(getInitialDocIdFromUrl);
	const [patientContext, setPatientContext] = useState(resolvePatientContext);

	const handleOpen = useCallback((e?: Event) => {
		const custom = (e as CustomEvent)?.detail;
		if (custom) {
			if (custom.docId) {
				setInitialDocId(normalizeConsentDocId(custom.docId));
			}
			setPatientContext({
				patientId: custom.patientId || custom.id,
				patientName: custom.patientName || custom.fullName || custom.name,
				birthDate: custom.birthDate,
				passport: custom.passport,
				phone: custom.phone,
				doctorName: custom.doctorName,
			});
		} else {
			setInitialDocId(getInitialDocIdFromUrl());
			setPatientContext(resolvePatientContext());
		}
		setIsOpen(true);
	}, []);

	const handleHash = useCallback(() => {
		if (isConsentTarget()) {
			setInitialDocId(getInitialDocIdFromUrl());
			setPatientContext(resolvePatientContext());
			setIsOpen(true);
		}
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
			url.searchParams.delete("docId");
			const cleanHash = window.location.hash.replace(/#consents|#consent-studio|#consent(-[a-z_]+)?/g, "");
			window.history.replaceState({}, "", url.pathname + (url.search || "") + cleanHash);
		}
	};

	if (!isOpen) return null;

	return (
		<ConsentStudioModal
			isOpen={isOpen}
			onClose={handleClose}
			initialDocId={initialDocId}
			patientContext={patientContext}
		/>
	);
};

export default DirectConsentLauncher;