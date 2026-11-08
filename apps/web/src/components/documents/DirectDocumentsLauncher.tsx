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
import { OutpatientCardPrintModal } from "./OutpatientCardPrintModal";

export const isDocumentsOrConsentsTarget = (): boolean => {
	if (typeof window === "undefined") return false;
	const s = window.location.search || "";
	const h = window.location.hash || "";
	return (
		h === "#documents" ||
		h === "#docs-studio" ||
		h === "#documents-studio" ||
		h === "#contract" ||
		h === "#tax-certificate" ||
		h === "#outpatient-card" ||
		h.startsWith("#outpatient-card?") ||
		h.startsWith("#emk-card") ||
		h.startsWith("#documents?") ||
		h.startsWith("#docs-studio?") ||
		h.startsWith("#documents-studio?") ||
		s.includes("documents=1") ||
		s.includes("docs=1") ||
		s.includes("outpatient_card=1") ||
		s.includes("standalone=documents")
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
	const [isOutpatientCard, setIsOutpatientCard] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		return window.location.hash.includes("outpatient-card") || window.location.search.includes("outpatient_card=1");
	});

	const handleOpen = useCallback((e?: Event) => {
		const custom = (e as CustomEvent)?.detail;
		if (custom?.isOutpatientCard) {
			setIsOutpatientCard(true);
		} else if (custom?.template) {
			setIsOutpatientCard(false);
			setInitialTemplate(custom.template);
		} else {
			setIsOutpatientCard(false);
		}
		setIsOpen(true);
	}, []);

	const handleHash = useCallback(() => {
		if (isDocumentsOrConsentsTarget()) {
			const isCard = typeof window !== "undefined" && (window.location.hash.includes("outpatient-card") || window.location.search.includes("outpatient_card=1"));
			setIsOutpatientCard(isCard);
			setInitialTemplate(getInitialTemplateFromUrl());
			setIsOpen(true);
		} else {
			setIsOpen(false);
		}
	}, []);

	useEffect(() => {
		window.addEventListener("dente:open-documents", handleOpen);
		window.addEventListener("dente:open-outpatient-card", handleOpen);
		window.addEventListener("hashchange", handleHash);

		return () => {
			window.removeEventListener("dente:open-documents", handleOpen);
			window.removeEventListener("dente:open-outpatient-card", handleOpen);
			window.removeEventListener("hashchange", handleHash);
		};
	}, [handleOpen, handleHash]);

	const handleClose = () => {
		setIsOpen(false);
		setIsOutpatientCard(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("docs");
			url.searchParams.delete("documents");
			url.searchParams.delete("consent");
			url.searchParams.delete("consents");
			url.searchParams.delete("tax_certificate");
			url.searchParams.delete("outpatient_card");
			url.searchParams.delete("signed");
			url.searchParams.delete("standalone");
			const cleanHash = window.location.hash.replace(/#documents-studio|#docs-studio|#tax-certificate|#documents|#consents|#contract|#outpatient-card/g, "");
			window.history.replaceState({}, "", url.pathname + (url.search || "") + cleanHash);
		}
	};

	if (!isOpen) return null;

	if (isOutpatientCard) {
		const isSigned = typeof window !== "undefined" && (window.location.hash.includes("signed") || window.location.search.includes("signed=1"));
		return (
			<OutpatientCardPrintModal
				key={isSigned ? "signed-card" : "draft-card"}
				isOpen={isOpen}
				onClose={handleClose}
				isClosedOrSigned={isSigned}
			/>
		);
	}

	return (
		<DocumentsStudioModal
			isOpen={isOpen}
			onClose={handleClose}
			initialTemplate={initialTemplate}
		/>
	);
};

export default DirectDocumentsLauncher;
