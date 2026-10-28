/**
 * WarehouseMdlpLaunchers — Standalone лаунчеры склада и маркировки МДЛП (?inventory=1, ?mdlp=1)
 * Мандат 8aq: Монтирование в живой UI. Мандат 8b: <= 120 строк.
 */

import React from "react";
import { MdlpScanningModal } from "../../../../mdlp/MdlpScanningModal";
import { MdlpDisposalQueueModal } from "../../../../inventory/mdlp/MdlpDisposalQueueModal";
import { InventoryView } from "../../../../InventoryView";
import { InventoryInboundInvoiceModal } from "../../../../InventoryInboundInvoiceModal";
import { WarehouseBatchWriteoffModal } from "../../../../inventory/WarehouseBatchWriteoffModal";

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

	const isBatchWriteoffStandalone =
		search.get("batch_writeoff") === "1" ||
		search.get("shift_deduct") === "1" ||
		h.includes("batch_writeoff");

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

	const getEffectiveOrgId = () => {
		try {
			if (typeof window !== "undefined") {
				const cached = localStorage.getItem("dente_cached_active_staff_user") || localStorage.getItem("dental-crm:active-user:v1");
				if (cached) {
					const u = JSON.parse(cached);
					if (u?.organizationId) return String(u.organizationId);
				}
				return localStorage.getItem("dente_organization_id") || "";
			}
		} catch (_) {}
		return "01a00000-0000-0000-0000-000000000000";
	};

	if (isInventoryStandalone) {
		return (
			<div className="fixed inset-0 z-[99999] w-full h-full flex flex-col bg-[var(--paper)] text-[var(--ink)] overflow-hidden">
				<InventoryView organizationId={getEffectiveOrgId()} />
			</div>
		);
	}

	if (isInboundInvoiceStandalone) {
		return (
			<InventoryInboundInvoiceModal
				isOpen={true}
				organizationId={getEffectiveOrgId()}
				inventoryItems={[]}
				onClose={() => {
					const u = new URL(window.location.href);
					u.searchParams.delete("inbound_invoice");
					u.searchParams.delete("inbound");
					window.history.replaceState({}, "", u.pathname + (u.search || ""));
				}}
			/>
		);
	}

	if (isBatchWriteoffStandalone) {
		return (
			<WarehouseBatchWriteoffModal
				isOpen={true}
				organizationId={getEffectiveOrgId()}
				onClose={() => {
					const u = new URL(window.location.href);
					u.searchParams.delete("batch_writeoff");
					u.searchParams.delete("shift_deduct");
					window.history.replaceState({}, "", u.pathname + (u.search || ""));
				}}
			/>
		);
	}

	return null;
}

export const DirectWarehouseMdlpLauncher: React.FC = () => {
	return renderWarehouseMdlpLaunchers();
};
