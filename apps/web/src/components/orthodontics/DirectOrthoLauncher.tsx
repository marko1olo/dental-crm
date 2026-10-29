/**
 * @dental/web/components/orthodontics/DirectOrthoLauncher.tsx
 * Автономный лаунчер ортодонтического кабинета и ТРГ в корне AppShell (Мандаты 8b 60-90 строк, 8aq).
 * Слушает хэши #ortho, #orthodontics, #ceph, #teleradiography и события dente:open-ortho.
 */

import React, { useEffect, useState, useCallback } from "react";
import { OrthodonticWorkspaceModal } from "./OrthodonticWorkspaceModal";

export const DirectOrthoLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const hash = window.location.hash.toLowerCase();
		const search = window.location.search.toLowerCase();
		return (
			hash.includes("#ortho") ||
			hash.includes("#ceph") ||
			hash.includes("#teleradiography") ||
			search.includes("ortho=") ||
			search.includes("ceph=")
		);
	});

	const [initialTab, setInitialTab] = useState<"visit" | "ceph" | "aligners">(() => {
		if (typeof window === "undefined") return "visit";
		const hash = window.location.hash.toLowerCase();
		if (hash.includes("#ceph") || hash.includes("#teleradiography")) return "ceph";
		if (hash.includes("#aligner")) return "aligners";
		return "visit";
	});

	const handleOpenEvent = useCallback((e?: Event) => {
		const customDetail = (e as CustomEvent)?.detail;
		if (customDetail?.tab === "ceph" || customDetail?.tab === "aligners") {
			setInitialTab(customDetail.tab);
		}
		setIsOpen(true);
	}, []);

	useEffect(() => {
		const handleHash = () => {
			const hash = window.location.hash.toLowerCase();
			if (hash.includes("#ceph") || hash.includes("#teleradiography")) {
				setInitialTab("ceph");
				setIsOpen(true);
			} else if (hash.includes("#ortho")) {
				setInitialTab("visit");
				setIsOpen(true);
			}
		};

		window.addEventListener("dente:open-ortho", handleOpenEvent);
		window.addEventListener("dente-open-ortho", handleOpenEvent);
		window.addEventListener("dente:open-ceph", () => {
			setInitialTab("ceph");
			setIsOpen(true);
		});
		window.addEventListener("hashchange", handleHash);

		return () => {
			window.removeEventListener("dente:open-ortho", handleOpenEvent);
			window.removeEventListener("dente-open-ortho", handleOpenEvent);
			window.removeEventListener("hashchange", handleHash);
		};
	}, [handleOpenEvent]);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const cleanHash = window.location.hash.replace(/#(ortho|orthodontics|ceph|teleradiography)/gi, "");
			const url = new URL(window.location.href);
			url.searchParams.delete("ortho");
			url.searchParams.delete("ceph");
			window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + cleanHash);
		}
	}, []);

	if (!isOpen) return null;

	return (
		<OrthodonticWorkspaceModal
			isOpen={isOpen}
			onClose={handleClose}
			initialTab={initialTab}
			patientName="Смирнова Екатерина Андреевна"
			doctorName="Д-р Соколов А. В."
		/>
	);
};

DirectOrthoLauncher.displayName = "DirectOrthoLauncher";
