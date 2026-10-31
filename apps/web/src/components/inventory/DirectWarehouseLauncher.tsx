/**
 * DirectWarehouseLauncher.tsx — Standalone лаунчер склада и расходных материалов.
 * Слушает #warehouse, #inventory, #stock, query ?warehouse=1, ?inventory=1
 * и системные события dente:open-warehouse (Мандаты: 8aq, 8b: строго 70–90 строк).
 */

import React, { useEffect, useState, useCallback } from "react";
import { WarehouseStudioModal } from "./WarehouseStudioModal.js";

const MATCH_PATTERN = /(#|\?)(warehouse|inventory-hub|inventory_hub|inventory|stock|warehouse-hub)/;

export const DirectWarehouseLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		return MATCH_PATTERN.test(window.location.search) || MATCH_PATTERN.test(window.location.hash);
	});

	const handleOpen = useCallback(() => setIsOpen(true), []);

	useEffect(() => {
		if (typeof window === "undefined") return;

		const onHash = () => {
			if (MATCH_PATTERN.test(window.location.hash) || MATCH_PATTERN.test(window.location.search)) {
				setIsOpen(true);
			}
		};

		window.addEventListener("dente:open-warehouse", handleOpen);
		window.addEventListener("dente:open-inventory", handleOpen);
		window.addEventListener("dente-open-warehouse", handleOpen);
		window.addEventListener("hashchange", onHash);
		window.addEventListener("popstate", onHash);

		return () => {
			window.removeEventListener("dente:open-warehouse", handleOpen);
			window.removeEventListener("dente:open-inventory", handleOpen);
			window.removeEventListener("dente-open-warehouse", handleOpen);
			window.removeEventListener("hashchange", onHash);
			window.removeEventListener("popstate", onHash);
		};
	}, [handleOpen]);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const u = new URL(window.location.href);
			["warehouse", "inventory", "stock", "inventory_hub", "inventory-hub", "warehouse-hub"].forEach((k) => {
				u.searchParams.delete(k);
			});
			const cleanHash = window.location.hash.replace(
				/#(inventory-hub|inventory_hub|warehouse-hub|warehouse|inventory|stock)/g,
				"",
			);
			window.history.replaceState({}, "", u.pathname + (u.search || "") + cleanHash);
		}
	}, []);

	if (!isOpen) return null;

	return (
		<WarehouseStudioModal
			isOpen={isOpen}
			onClose={handleClose}
			organizationId="org-main-01"
		/>
	);
};

export default DirectWarehouseLauncher;
