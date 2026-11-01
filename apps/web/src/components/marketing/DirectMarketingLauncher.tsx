/**
 * apps/web/src/components/marketing/DirectMarketingLauncher.tsx
 *
 * Автономный лаунчер Студии маркетинга, акций и ROMI для живого UI (Мандаты 8b 50–70 строк, 8e, 8aq).
 * Реагирует на хэши #marketing, #romi, #campaigns, search ?marketing=1 и событие dente:open-marketing.
 */

import React, { useEffect, useState, useCallback } from "react";
import { MarketingStudioModal } from "./MarketingStudioModal";

export const DirectMarketingLauncher: React.FC = () => {
	const checkUrlMatch = useCallback((): boolean => {
		if (typeof window === "undefined") return false;
		const h = window.location.hash || "";
		const s = window.location.search || "";
		const params = new URLSearchParams(s);
		return (
			h === "#marketing" ||
			h === "#romi" ||
			h === "#campaigns" ||
			h.includes("marketing-studio") ||
			params.get("marketing") === "1" ||
			params.get("romi") === "1"
		);
	}, []);

	const [isOpen, setIsOpen] = useState<boolean>(checkUrlMatch);

	useEffect(() => {
		const handleOpen = () => setIsOpen(true);
		const handleHashChange = () => {
			if (checkUrlMatch()) setIsOpen(true);
		};

		window.addEventListener("dente:open-marketing", handleOpen);
		window.addEventListener("dente-open-marketing", handleOpen);
		window.addEventListener("hashchange", handleHashChange);

		return () => {
			window.removeEventListener("dente:open-marketing", handleOpen);
			window.removeEventListener("dente-open-marketing", handleOpen);
			window.removeEventListener("hashchange", handleHashChange);
		};
	}, [checkUrlMatch]);

	const handleClose = () => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("marketing");
			url.searchParams.delete("romi");
			const cleanHash = window.location.hash.replace(/#marketing|#romi|#campaigns|#marketing-studio/g, "");
			const newUrl = url.pathname + (url.search ? url.search : "") + cleanHash;
			window.history.replaceState({}, "", newUrl);
		}
	};

	if (!isOpen) return null;

	return <MarketingStudioModal isOpen={isOpen} onClose={handleClose} />;
};

export default DirectMarketingLauncher;
