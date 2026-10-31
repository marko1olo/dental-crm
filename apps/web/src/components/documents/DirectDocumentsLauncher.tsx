/**
 * apps/web/src/components/documents/DirectDocumentsLauncher.tsx
 *
 * Автономный лаунчер канонической Студии документов DENTE CRM (SSOT).
 * Монтируется в AppShell.tsx и StandaloneLaunchers.tsx (Мандаты 8b, 8e, 8aq).
 * Обрабатывает deep-links: #documents, #contract, #tax-certificate, ?docs=1, ?documents=1
 * и системные события "dente:open-documents".
 * Диапазон строк: 70–90 строк.
 */

import React, { useEffect, useState, useCallback } from "react";
import { DocumentsStudioModal, type DocumentTemplateKey } from "./DocumentsStudioModal";

const isDocumentsTarget = (): boolean => {
	if (typeof window === "undefined") return false;
	const s = window.location.search || "";
	const h = window.location.hash || "";
	return (
		h === "#documents" ||
		h === "#contract" ||
		h === "#tax-certificate" ||
		h.startsWith("#documents?") ||
		h.startsWith("#contract?") ||
		h.startsWith("#tax-certificate?") ||
		h === "#documents-studio" ||
		s.includes("docs=1") ||
		s.includes("documents=1") ||
		s.includes("standalone=documents") ||
		s.includes("tax_certificate=1")
	);
};

const getInitialTemplateFromUrl = (): DocumentTemplateKey => {
	if (typeof window === "undefined") return "contract";
	const h = window.location.hash || "";
	const s = window.location.search || "";
	if (h.includes("tax-certificate") || s.includes("tax_certificate=1")) return "tax_certificate";
	if (h.includes("contract")) return "contract";
	return "contract";
};

export const DirectDocumentsLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(isDocumentsTarget);
	const [initialTemplate, setInitialTemplate] = useState<DocumentTemplateKey>(getInitialTemplateFromUrl);

	const handleOpen = useCallback((e?: Event) => {
		const custom = (e as CustomEvent)?.detail;
		if (custom?.template) {
			setInitialTemplate(custom.template);
		}
		setIsOpen(true);
	}, []);

	const handleHash = useCallback(() => {
		if (isDocumentsTarget()) {
			setInitialTemplate(getInitialTemplateFromUrl());
			setIsOpen(true);
		}
	}, []);

	useEffect(() => {
		window.addEventListener("dente:open-documents", handleOpen);
		window.addEventListener("hashchange", handleHash);

		return () => {
			window.removeEventListener("dente:open-documents", handleOpen);
			window.removeEventListener("hashchange", handleHash);
		};
	}, [handleOpen, handleHash]);

	const handleClose = () => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("docs");
			url.searchParams.delete("documents");
			url.searchParams.delete("tax_certificate");
			url.searchParams.delete("standalone");
			const cleanHash = window.location.hash.replace(/#documents-studio|#tax-certificate|#documents|#contract/g, "");
			window.history.replaceState({}, "", url.pathname + (url.search || "") + cleanHash);
		}
	};

	if (!isOpen) return null;

	return (
		<DocumentsStudioModal
			isOpen={isOpen}
			onClose={handleClose}
			initialTemplate={initialTemplate}
			patientContext={{
				fullName: "Смирнов Алексей Петрович",
				birthDate: "12.04.1988",
				passport: "серия 4512 № 654321 выдан ОВД Тверского р-на г. Москвы",
				address: "г. Москва, ул. Тверская, д. 14, кв. 8",
				phone: "+7 (916) 123-45-67",
			}}
			doctorFullName="Смирнова Елена Сергеевна"
		/>
	);
};

export default DirectDocumentsLauncher;
