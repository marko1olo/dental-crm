/**
 * DirectWarehouseLauncher.tsx — Standalone лаунчер склада и расходных материалов.
 * Слушает хэши #warehouse, #inventory, #stock, query ?warehouse=1, ?inventory=1, ?stock=1
 * и системные события dente:open-warehouse (Мандаты 8aq, 8b: строго 70–80 строк).
 */

import React, { useEffect, useState, useCallback } from "react";
import { X, Package } from "lucide-react";
import { InventoryView } from "../InventoryView.js";

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
			["warehouse", "inventory", "stock", "warehouse-studio", "inventory-hub", "warehouse-hub"].forEach((k) => u.searchParams.delete(k));
			const cleanHash = window.location.hash.replace(/#(warehouse|inventory|stock|warehouse-studio|inventory-hub|warehouse-hub)/gi, "");
			window.history.replaceState({}, "", u.pathname + (u.search || "") + cleanHash);
		}
	}, []);

	if (!isOpen) return null;

	return (
		<div style={{ zIndex: 100000 }} className="fixed inset-0 flex items-center justify-center p-0 sm:p-3 bg-black/60 backdrop-blur-xs overflow-hidden" role="dialog" aria-modal="true" data-testid="direct-warehouse-modal">
			<div className="relative w-full h-full max-w-7xl max-h-[96vh] rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl flex flex-col overflow-hidden" data-testid="warehouse-studio-modal">
				<div className="px-4 py-2 border-b border-[var(--line)] flex items-center justify-between bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-2">
						<Package size={18} className="text-[var(--primary,#0d9488)]" />
						<span className="font-bold text-sm text-[var(--ink)]">Склад и учёт материалов</span>
					</div>
					<button type="button" onClick={handleClose} className="secondary-button p-1.5 text-[var(--muted)] hover:text-[var(--ink)] rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center" aria-label="Закрыть склад">
						<X size={18} />
					</button>
				</div>
				<div className="flex-1 min-h-0 overflow-hidden">
					<InventoryView organizationId="org-main-01" />
				</div>
			</div>
		</div>
	);
};

export default DirectWarehouseLauncher;
