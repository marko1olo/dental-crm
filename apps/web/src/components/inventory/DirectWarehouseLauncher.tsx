/**
 * DirectWarehouseLauncher.tsx — Standalone лаунчер склада и расходных материалов.
 * Слушает хэши #warehouse, #inventory, #stock, query ?warehouse=1, ?inventory=1, ?stock=1
 * и системные события dente:open-warehouse (Мандаты 8aq, 8b: строго 70–80 строк).
 */

import React, { useEffect, useState, useCallback } from "react";
import { WarehouseStudioModal } from "./WarehouseStudioModal.js";

const WAREHOUSE_PATTERN = /(#|\?|&)(warehouse|inventory|stock|warehouse-studio|inventory-hub|warehouse-hub)/i;

export const DirectWarehouseLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		return WAREHOUSE_PATTERN.test(window.location.search) || WAREHOUSE_PATTERN.test(window.location.hash);
	});

	const handleOpen = useCallback(() => setIsOpen(true), []);

	useEffect(() => {
		if (typeof window === "undefined") return;

		const onHashOrPop = () => {
			if (WAREHOUSE_PATTERN.test(window.location.hash) || WAREHOUSE_PATTERN.test(window.location.search)) {
				setIsOpen(true);
			}
		};

		window.addEventListener("dente:open-warehouse", handleOpen);
		window.addEventListener("dente:open-inventory", handleOpen);
		window.addEventListener("dente-open-warehouse", handleOpen);
		window.addEventListener("hashchange", onHashOrPop);
		window.addEventListener("popstate", onHashOrPop);

		return () => {
			window.removeEventListener("dente:open-warehouse", handleOpen);
			window.removeEventListener("dente:open-inventory", handleOpen);
			window.removeEventListener("dente-open-warehouse", handleOpen);
			window.removeEventListener("hashchange", onHashOrPop);
			window.removeEventListener("popstate", onHashOrPop);
		};
	}, [handleOpen]);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const u = new URL(window.location.href);
			const params = ["warehouse", "inventory", "stock", "warehouse-studio", "inventory-hub", "warehouse-hub"];
			params.forEach((k) => {
				u.searchParams.delete(k);
			});
			const cleanHash = window.location.hash.replace(
				/#(warehouse|inventory|stock|warehouse-studio|inventory-hub|warehouse-hub)/gi,
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
