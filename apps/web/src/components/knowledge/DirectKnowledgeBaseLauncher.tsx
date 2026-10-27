/**
 * DENTE CRM — Direct Knowledge Base & Clinical Guides Launcher
 * Authority: Mandate 8b (<= 120 lines), Mandate 8e (Doctor Autonomy), Mandate 8aq (Mounted in UI Tree)
 */

import React, { useEffect, useState } from "react";
import { KnowledgeBaseHubModal } from "./KnowledgeBaseHubModal.js";
import type { ClinicalGuideTab } from "../help/index.js";

export const DirectKnowledgeBaseLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			s.includes("knowledge_base") ||
			s.includes("knowledge-base") ||
			s.includes("help=1") ||
			h.includes("knowledge_base") ||
			h.includes("knowledge-base") ||
			h.includes("help")
		);
	});
	const [initialTab, setInitialTab] = useState<ClinicalGuideTab>("schedule");

	useEffect(() => {
		const handleOpen = (e: Event) => {
			const customEvent = e as CustomEvent<{ tab?: ClinicalGuideTab }>;
			if (customEvent.detail?.tab) {
				setInitialTab(customEvent.detail.tab);
			}
			setIsOpen(true);
		};
		window.addEventListener("dente:open-knowledge-hub", handleOpen);
		window.addEventListener("dente-open-knowledge-hub", handleOpen);
		return () => {
			window.removeEventListener("dente:open-knowledge-hub", handleOpen);
			window.removeEventListener("dente-open-knowledge-hub", handleOpen);
		};
	}, []);

	if (!isOpen) return null;

	const handleClose = () => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("knowledge_base");
			url.searchParams.delete("knowledge-base");
			url.searchParams.delete("help");
			const cleanHash = window.location.hash.replace(
				/#knowledge_base|#knowledge-base|#help/g,
				"",
			);
			const newUrl =
				url.pathname +
				(url.search ? url.search : "") +
				cleanHash;
			window.history.replaceState({}, "", newUrl);
		}
	};

	return (
		<KnowledgeBaseHubModal
			isOpen={isOpen}
			onClose={handleClose}
			initialTab={initialTab}
		/>
	);
};

DirectKnowledgeBaseLauncher.displayName = "DirectKnowledgeBaseLauncher";
