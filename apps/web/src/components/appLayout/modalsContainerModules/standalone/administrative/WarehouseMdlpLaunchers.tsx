/**
 * WarehouseMdlpLaunchers — Standalone лаунчеры склада и маркировки МДЛП (?inventory=1, ?mdlp=1)
 * Мандат 8aq: Монтирование в живой UI. Мандат 8b: <= 120 строк.
 */

import React from "react";
import { MdlpScanningModal } from "../../../../mdlp/MdlpScanningModal";
import { MdlpDisposalQueueModal } from "../../../../inventory/mdlp/MdlpDisposalQueueModal";
import { InventoryView } from "../../../../InventoryView";
import { InventoryInboundInvoiceModal } from "../../../../InventoryInboundInvoiceModal";

export function renderWarehouseMdlpLaunchers(): React.ReactElement | null {
	if (typeof window === "undefined") return null;
	const s = window.location.search || "";
	const h = window.location.hash || "";
	const search = new URLSearchParams(s);

	const isMdlpDisposalStandalone =
		search.get("mdlp_disposal") === "1" ||
		search.get("disposal_queue") === "1" ||
		h.includes("mdlp_disposal") ||
		h.includes("disposal_queue");

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

	const isInboundInvoiceStandalone =
		search.get("inbound_invoice") === "1" ||
		search.get("inbound") === "1" ||
		h.includes("inbound_invoice") ||
		h.includes("inbound_modal");

	if (isMdlpDisposalStandalone) {
		return (
			<MdlpDisposalQueueModal
				isOpen={true}
				patientName="Иванов И.И."
				doctorName="Д-р Смирнов"
				onClose={() => {
					const u = new URL(window.location.href);
					u.searchParams.delete("mdlp_disposal");
					u.searchParams.delete("disposal_queue");
					window.history.replaceState({}, "", u.pathname + (u.search || ""));
				}}
			/>
		);
	}

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
			<div className="fixed inset-0 z-[99999] w-screen h-screen flex flex-col bg-[var(--paper)] text-[var(--ink)] overflow-hidden">
				<InventoryView organizationId="demo-clinic-org" />
			</div>
		);
	}

	if (isInboundInvoiceStandalone) {
		return (
			<div className="fixed inset-0 z-[99999] w-screen h-screen flex flex-col bg-[var(--paper)] text-[var(--ink)] overflow-hidden">
				<InventoryInboundInvoiceModal
					isOpen={true}
					organizationId="demo-clinic-org"
					inventoryItems={[]}
					onClose={() => {
						const u = new URL(window.location.href);
						u.searchParams.delete("inbound_invoice");
						u.searchParams.delete("inbound");
						window.history.replaceState({}, "", u.pathname + (u.search || ""));
					}}
				/>
			</div>
		);
	}

	return null;
}

export const DirectWarehouseMdlpLauncher: React.FC = () => {
	return renderWarehouseMdlpLaunchers();
};
