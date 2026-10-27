/**
 * DirectMarketingRoiLauncher.tsx — Прямой запуск модального окна маркетинга и ROMI.
 * Мандат 8b (<= 120 строк), Мандат 8e (Автономия врача), Мандат 8aq (Монтирование в UI).
 */

import React, { useEffect, useState } from "react";
import { MarketingRoiModal } from "./MarketingRoiModal";

export const DirectMarketingRoiLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			s.includes("marketing") ||
			h.includes("marketing") ||
			s.includes("roi") ||
			h.includes("roi") ||
			h.includes("romi") ||
			s.includes("romi")
		);
	});

	useEffect(() => {
		const handleOpen = () => setIsOpen(true);
		const handleHashChange = () => {
			const s = window.location.search || "";
			const h = window.location.hash || "";
			if (
				s.includes("marketing") ||
				h.includes("marketing") ||
				s.includes("roi") ||
				h.includes("roi") ||
				h.includes("romi") ||
				s.includes("romi")
			) {
				setIsOpen(true);
			}
		};

		window.addEventListener("dente-open-marketing-roi", handleOpen);
		window.addEventListener("dente:open-marketing-roi", handleOpen);
		window.addEventListener("hashchange", handleHashChange);

		return () => {
			window.removeEventListener("dente-open-marketing-roi", handleOpen);
			window.removeEventListener("dente:open-marketing-roi", handleOpen);
			window.removeEventListener("hashchange", handleHashChange);
		};
	}, []);

	if (!isOpen) return null;

	const handleClose = () => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("marketing");
			url.searchParams.delete("roi");
			url.searchParams.delete("romi");
			const cleanHash = window.location.hash.replace(
				/#marketing-roi|#marketing|#roi|#romi/g,
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
		<MarketingRoiModal
			isOpen={isOpen}
			onClose={handleClose}
		/>
	);
};
