/**
 * apps/web/src/components/catalog/DirectPricelistLauncher.tsx
 *
 * Автономный маршрутизатор-лаунчер канонической студии прейскуранта DENTE (SSOT).
 * Мандаты: 8b/8zi (60-80 строк Sweet Spot), 8aq (Монтирование в живой UI), 8am.
 * Поддерживает: #pricelist, #prices, #services-catalog, ?pricelist=1, ?prices=1, ?catalog=1.
 */

import React, { useEffect, useState } from "react";
import { PricelistStudioModal } from "./PricelistStudioModal";

export const DirectPricelistLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		if (s.includes("documents") || h.includes("documents")) return false;
		return (
			s.includes("pricelist") ||
			s.includes("prices") ||
			s.includes("catalog") ||
			s.includes("services-catalog") ||
			h.includes("pricelist") ||
			h.includes("prices") ||
			h.includes("catalog") ||
			h.includes("services-catalog")
		);
	});

	useEffect(() => {
		const checkRequested = () => {
			const s = window.location.search || "";
			const h = window.location.hash || "";
			if (s.includes("documents") || h.includes("documents")) {
				setIsOpen(false);
				return;
			}
			const requested =
				s.includes("pricelist") ||
				s.includes("prices") ||
				s.includes("catalog") ||
				s.includes("services-catalog") ||
				h.includes("pricelist") ||
				h.includes("prices") ||
				h.includes("catalog") ||
				h.includes("services-catalog");
			if (requested) {
				setIsOpen(true);
			}
		};

		const handleOpenEvent = () => setIsOpen(true);
		window.addEventListener("dente-open-pricelist", handleOpenEvent);
		window.addEventListener("dente:open-pricelist", handleOpenEvent);
		window.addEventListener("hashchange", checkRequested);
		window.addEventListener("popstate", checkRequested);
		return () => {
			window.removeEventListener("dente-open-pricelist", handleOpenEvent);
			window.removeEventListener("dente:open-pricelist", handleOpenEvent);
			window.removeEventListener("hashchange", checkRequested);
			window.removeEventListener("popstate", checkRequested);
		};
	}, []);

	if (!isOpen) return null;

	const handleClose = () => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("pricelist");
			url.searchParams.delete("prices");
			url.searchParams.delete("catalog");
			url.searchParams.delete("services-catalog");
			const cleanHash = window.location.hash.replace(
				/#pricelist|#prices|#services-catalog|#catalog/g,
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
		<PricelistStudioModal
			isOpen={isOpen}
			onClose={handleClose}
			onSaveCatalog={() => {
				handleClose();
			}}
		/>
	);
};
