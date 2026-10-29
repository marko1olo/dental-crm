/**
 * DirectWarehouseLauncher.tsx — Standalone лаунчер склада и расходных материалов.
 * Слушает #warehouse, #inventory, #stock и события dente:open-warehouse (Мандаты 8aq, 8b: 60–90 строк).
 */

import React, { useEffect, useState, useCallback } from "react";
import { WarehouseHubModal } from "./WarehouseHubModal.js";

export const DirectWarehouseLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			s.includes("warehouse=1") ||
			s.includes("inventory=1") ||
			s.includes("stock=1") ||
			s.includes("warehouse_hub=1") ||
			h.includes("#warehouse") ||
			h.includes("#inventory") ||
			h.includes("#stock") ||
			h.includes("#warehouse-hub") ||
			h.includes("#warehouse_hub")
		);
	});

	const handleOpen = useCallback(() => setIsOpen(true), []);

	useEffect(() => {
		if (typeof window === "undefined") return;

		const handleHashChange = () => {
			const h = window.location.hash || "";
			if (
				h.includes("#warehouse") ||
				h.includes("#inventory") ||
				h.includes("#stock") ||
				h.includes("#warehouse-hub") ||
				h.includes("#warehouse_hub")
			) {
				setIsOpen(true);
			}
		};

		window.addEventListener("dente:open-warehouse", handleOpen);
		window.addEventListener("dente:open-inventory", handleOpen);
		window.addEventListener("dente-open-warehouse", handleOpen);
		window.addEventListener("hashchange", handleHashChange);

		return () => {
			window.removeEventListener("dente:open-warehouse", handleOpen);
			window.removeEventListener("dente:open-inventory", handleOpen);
			window.removeEventListener("dente-open-warehouse", handleOpen);
			window.removeEventListener("hashchange", handleHashChange);
		};
	}, [handleOpen]);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("warehouse");
			url.searchParams.delete("inventory");
			url.searchParams.delete("stock");
			url.searchParams.delete("warehouse_hub");
			const cleanHash = window.location.hash.replace(/#(warehouse-hub|warehouse_hub|warehouse|inventory|stock)/g, "");
			const newUrl = url.pathname + (url.search ? url.search : "") + cleanHash;
			window.history.replaceState({}, "", newUrl);
		}
	}, []);

	if (!isOpen) return null;

	return (
		<WarehouseHubModal
			isOpen={isOpen}
			onClose={handleClose}
			organizationId="01a00000-0000-0000-0000-000000000000"
		/>
	);
};

export default DirectWarehouseLauncher;
