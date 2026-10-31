/**
 * apps/web/src/components/loyalty/DirectLoyaltyLauncher.tsx
 * Автономный лаунчер программы лояльности, семейного баланса и сертификатов DENTE CRM.
 * Монтируется в AppShell.tsx & StandaloneLaunchers.tsx (Мандаты 8b 60–100 строк, 8e, 8aq).
 */

import React, { useEffect, useState } from "react";
import { LoyaltyStudioModal } from "./LoyaltyStudioModal";

function isLoyaltyRequested(): boolean {
	if (typeof window === "undefined") return false;
	const s = window.location.search || "";
	const h = window.location.hash || "";
	return (
		h === "#loyalty" ||
		h === "#bonuses" ||
		h === "#points" ||
		h === "#family-pool" ||
		h === "#loyalty-studio" ||
		h.startsWith("#loyalty?") ||
		h.startsWith("#loyalty/") ||
		s.includes("loyalty=1") ||
		s.includes("bonuses=1") ||
		s.includes("loyalty=direct")
	);
}

export const DirectLoyaltyLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(isLoyaltyRequested);

	useEffect(() => {
		const handleOpen = () => setIsOpen(true);
		const handleHashChange = () => {
			if (isLoyaltyRequested()) {
				setIsOpen(true);
			}
		};

		window.addEventListener("dente:open-loyalty", handleOpen);
		window.addEventListener("dente-open-loyalty", handleOpen);
		window.addEventListener("dente:open-bonuses", handleOpen);
		window.addEventListener("hashchange", handleHashChange);
		window.addEventListener("popstate", handleHashChange);

		return () => {
			window.removeEventListener("dente:open-loyalty", handleOpen);
			window.removeEventListener("dente-open-loyalty", handleOpen);
			window.removeEventListener("dente:open-bonuses", handleOpen);
			window.removeEventListener("hashchange", handleHashChange);
			window.removeEventListener("popstate", handleHashChange);
		};
	}, []);

	if (!isOpen) return null;

	const handleClose = () => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("loyalty");
			url.searchParams.delete("bonuses");
			const cleanHash = window.location.hash.replace(
				/#loyalty|#bonuses|#points|#family-pool|#loyalty-studio/g,
				"",
			);
			const newUrl = url.pathname + (url.search ? url.search : "") + cleanHash;
			window.history.replaceState({}, "", newUrl || "/");
		}
	};

	return (
		<LoyaltyStudioModal
			isOpen={isOpen}
			onClose={handleClose}
		/>
	);
};

export default DirectLoyaltyLauncher;
