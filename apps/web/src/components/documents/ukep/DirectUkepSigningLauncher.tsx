/**
 * DirectUkepSigningLauncher.tsx — Канонический автономный лончер Студии ЭЦП/УКЭП КриптоПро
 * Обрабатывает deep-links: #ukep, #cryptopro, ?ukep=1, ?cryptopro=1
 * Мандаты: 8b (Sweet Spot <= 90 строк), 8e (Автономия врача), 8aq (Монтирование в живой UI).
 */

import React, { useState, useEffect, useCallback } from "react";
import { UkepDocumentSigningModal } from "./UkepDocumentSigningModal";

export const isUkepTarget = (): boolean => {
	if (typeof window === "undefined") return false;
	const s = window.location.search || "";
	const h = window.location.hash || "";
	return (
		h === "#ukep" ||
		h === "#cryptopro" ||
		h.startsWith("#ukep?") ||
		h.startsWith("#cryptopro?") ||
		s.includes("ukep=1") ||
		s.includes("cryptopro=1") ||
		s.includes("standalone=ukep")
	);
};

export const DirectUkepSigningLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(isUkepTarget);

	const handleOpen = useCallback(() => setIsOpen(true), []);
	const handleHash = useCallback(() => {
		if (isUkepTarget()) setIsOpen(true);
	}, []);

	useEffect(() => {
		window.addEventListener("dente:open-ukep", handleOpen);
		window.addEventListener("dente:open-cryptopro", handleOpen);
		window.addEventListener("hashchange", handleHash);

		return () => {
			window.removeEventListener("dente:open-ukep", handleOpen);
			window.removeEventListener("dente:open-cryptopro", handleOpen);
			window.removeEventListener("hashchange", handleHash);
		};
	}, [handleOpen, handleHash]);

	const handleClose = () => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("ukep");
			url.searchParams.delete("cryptopro");
			url.searchParams.delete("standalone");
			const cleanHash = window.location.hash.replace(/#ukep|#cryptopro/g, "");
			window.history.replaceState(null, "", url.pathname + (url.search ? url.search : "") + cleanHash);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="w-full min-h-screen bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] flex items-center justify-center">
			<UkepDocumentSigningModal
				isOpen={true}
				onClose={handleClose}
				onPrintPaper={() => {
					window.print();
				}}
			/>
		</div>
	);
};

export default DirectUkepSigningLauncher;
