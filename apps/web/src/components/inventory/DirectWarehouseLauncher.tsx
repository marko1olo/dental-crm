/**
 * DirectWarehouseLauncher.tsx — Standalone лаунчер склада и расходных материалов.
 * Слушает #warehouse, #inventory-hub, #stock и события dente:open-warehouse (Мандаты 8aq, 8b: 60–90 строк).
 */

import React, { useEffect, useState, useCallback } from "react";
import { WarehouseHubStudioModal } from "./WarehouseHubStudioModal.js";
import { WarehouseHubModal } from "./WarehouseHubModal.js";

const MATCH_PATTERN = /(#|\?)(warehouse|inventory-hub|inventory_hub|inventory|stock|warehouse-hub)/;

export const DirectWarehouseLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		return MATCH_PATTERN.test(window.location.search) || MATCH_PATTERN.test(window.location.hash);
	});

	const handleOpen = useCallback(() => setIsOpen(true), []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const onHash = () => MATCH_PATTERN.test(window.location.hash) && setIsOpen(true);

		window.addEventListener("dente:open-warehouse", handleOpen);
		window.addEventListener("dente:open-inventory", handleOpen);
		window.addEventListener("dente-open-warehouse", handleOpen);
		window.addEventListener("hashchange", onHash);

		return () => {
			window.removeEventListener("dente:open-warehouse", handleOpen);
			window.removeEventListener("dente:open-inventory", handleOpen);
			window.removeEventListener("dente-open-warehouse", handleOpen);
			window.removeEventListener("hashchange", onHash);
		};
	}, [handleOpen]);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const u = new URL(window.location.href);
			["warehouse", "inventory", "stock", "inventory_hub"].forEach((k) => u.searchParams.delete(k));
			const cleanHash = window.location.hash.replace(
				/#(inventory-hub|inventory_hub|warehouse-hub|warehouse|inventory|stock)/g,
				"",
			);
			window.history.replaceState({}, "", u.pathname + (u.search || "") + cleanHash);
		}
	}, []);

	if (!isOpen) return null;

	const isStudio =
		typeof window !== "undefined" &&
		(window.location.hash.includes("inventory-hub") ||
			window.location.search.includes("inventory_hub=1") ||
			window.location.hash.includes("studio"));

	if (isStudio) {
		return <WarehouseHubStudioModal isOpen={isOpen} onClose={handleClose} />;
	}

	return <WarehouseHubModal isOpen={isOpen} onClose={handleClose} />;
};

export default DirectWarehouseLauncher;
