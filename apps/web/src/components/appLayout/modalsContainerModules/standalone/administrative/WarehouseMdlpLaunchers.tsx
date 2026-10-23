/**
 * WarehouseMdlpLaunchers — Standalone лаунчеры склада и маркировки МДЛП (?inventory=1, ?mdlp=1)
 * Мандат 8aq: Монтирование в живой UI. Мандат 8b: <= 120 строк.
 */

import React from "react";
import { MdlpScanningModal } from "../../../../mdlp/MdlpScanningModal";
import { InventoryView } from "../../../../InventoryView";

export function renderWarehouseMdlpLaunchers(): React.ReactElement | null {
	if (typeof window === "undefined") return null;
	const s = window.location.search || "";
	const h = window.location.hash || "";
	const search = new URLSearchParams(s);

	const isInventoryStandalone =
		search.get("inventory") === "1" ||
		search.get("warehouse") === "1" ||
		h.includes("inventory") ||
		h.includes("warehouse");

	const isMdlpStandalone =
		search.get("mdlp") === "1" ||
		search.get("chestny_znak") === "1" ||
		h.includes("mdlp") ||
		h.includes("chestny_znak");

	if (isMdlpStandalone) {
		return (
			<MdlpScanningModal
				isOpen={true}
				clinicName="ООО «Денте Стоматология»"
				onClose={() => {
					const u = new URL(window.location.href);
					u.searchParams.delete("mdlp");
					u.searchParams.delete("chestny_znak");
					window.history.replaceState({}, "", u.pathname + (u.search || ""));
				}}
			/>
		);
	}

	if (isInventoryStandalone) {
		return (
			<div className="w-screen h-screen flex flex-col bg-[var(--paper)] text-[var(--ink)] overflow-hidden">
				<InventoryView organizationId="demo-clinic-org" />
			</div>
		);
	}

	return null;
}

export const DirectWarehouseMdlpLauncher: React.FC = () => {
	return renderWarehouseMdlpLaunchers();
};
