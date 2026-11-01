/**
 * apps/web/src/components/documents/DirectDocumentsLauncher.tsx
 *
 * Канонический автономный лаунчер Студии документов и согласий DENTE CRM (SSOT).
 * Смонтирован в AppShell.tsx, administrativeLaunchersRegistry.tsx и SpecializedAdministrativeLaunchers.tsx.
 * Обрабатывает deep-links: #documents, #consents, #docs-studio, ?documents=1, ?consents=1.
 * Мандаты 8b (60–80 строк Sweet Spot), 8e (Автономия врача), 8aq (Монтирование в живой UI).
 */

import React, { useEffect, useState, useCallback } from "react";
import { DocumentsStudioModal, type DocumentTemplateKey } from "./DocumentsStudioModal";

export const isDocumentsOrConsentsTarget = (): boolean => {
	if (typeof window === "undefined") return false;
	const s = window.location.search || "";
	const h = window.location.hash || "";
	return (
		h === "#documents" ||
		h === "#consents" ||
		h === "#docs-studio" ||
		h === "#documents-studio" ||
		h === "#contract" ||
		h === "#tax-certificate" ||
		h.startsWith("#documents?") ||
		h.startsWith("#consents?") ||
		h.startsWith("#docs-studio?") ||
		s.includes("documents=1") ||
		s.includes("consents=1") ||
		s.includes("docs=1") ||
		s.includes("consent=1") ||
		s.includes("standalone=documents") ||
		s.includes("standalone=consents")
	);
};

export const getInitialTemplateFromUrl = (): DocumentTemplateKey => {
	if (typeof window === "undefined") return "intake";
	const h = window.location.hash || "";
	const s = window.location.search || "";
	if (h.includes("consent") || s.includes("consent")) return "informed_consent";
	if (h.includes("tax") || s.includes("tax")) return "tax_certificate";
	if (h.includes("card") || s.includes("card")) return "card_extract";
	return "intake";
};

export const DirectDocumentsLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(isDocumentsOrConsentsTarget);
	const [initialTemplate, setInitialTemplate] = useState<DocumentTemplateKey>(getInitialTemplateFromUrl);

	const handleOpen = useCallback((e?: Event) => {
		const custom = (e as CustomEvent)?.detail;
		if (custom?.template) {
			setInitialTemplate(custom.template);
		} else if (custom?.isConsent || e?.type === "dente:open-consents") {
			setInitialTemplate("informed_consent");
		}
		setIsOpen(true);
	}, []);

	const handleHash = useCallback(() => {
		if (isDocumentsOrConsentsTarget()) {
			setInitialTemplate(getInitialTemplateFromUrl());
			setIsOpen(true);
		}
	}, []);

	useEffect(() => {
		window.addEventListener("dente:open-documents", handleOpen);
		window.addEventListener("dente:open-consents", handleOpen);
		window.addEventListener("dente:open-consent", handleOpen);
		window.addEventListener("hashchange", handleHash);

		return () => {
			window.removeEventListener("dente:open-documents", handleOpen);
			window.removeEventListener("dente:open-consents", handleOpen);
			window.removeEventListener("dente:open-consent", handleOpen);
			window.removeEventListener("hashchange", handleHash);
		};
	}, [handleOpen, handleHash]);

	const handleClose = () => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("docs");
			url.searchParams.delete("documents");
			url.searchParams.delete("consent");
			url.searchParams.delete("consents");
			url.searchParams.delete("tax_certificate");
			url.searchParams.delete("standalone");
			const cleanHash = window.location.hash.replace(/#documents-studio|#docs-studio|#tax-certificate|#documents|#consents|#contract/g, "");
			window.history.replaceState({}, "", url.pathname + (url.search || "") + cleanHash);
		}
	};

	if (!isOpen) return null;

	return (
		<DocumentsStudioModal
			isOpen={isOpen}
			onClose={handleClose}
			initialTemplate={initialTemplate}
		/>
	);
};

export default DirectDocumentsLauncher;
