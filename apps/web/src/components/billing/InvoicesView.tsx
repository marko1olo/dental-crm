/**
 * apps/web/src/components/billing/InvoicesView.tsx
 * DENTE Dental CRM — Solo Doctor & Small Clinic Invoicing & Acts View.
 * Decomposed into ./invoices/ in strict compliance with Mandate 8b (<= 120 lines facade).
 * Compliance: Mandates 8e, 8k, 8n, 8d (Apple HIG / Studio Clinical Invariants).
 */

import React, { useState } from "react";
import { generateUuidV7 } from "@dental/shared";
import { useMemoryLeakGuard } from "../../hooks/useMemoryLeakGuard.js";
import { InvoicesModalsLayer } from "./InvoicesModalsLayer.js";
import { showToast } from "../GlobalToast.js";
import type { BillingInvoice, InvoiceFilterTab, InvoiceLineItem, InvoicesViewProps } from "./invoiceTypes.js";
import { handlePrintAct, handlePrintInvoice } from "./invoicesPrintHelpers.js";
import { INVOICES_STORAGE_KEY, loadStoredInvoices, saveStoredInvoices } from "./invoicesStorage.js";
import { DEFAULT_DOM_CHUNK_STEP, DEFAULT_DOM_PAGE_SIZE } from "../../utils/domVirtualizationHelper.js";
import { useInvoicesData } from "./useInvoicesData.js";
import { useInvoicesViewLogic, InvoicesToolbar, InvoicesList, InvoicesEmptyState } from "./invoices/index.js";
import { denteClinicalMutationHeaders } from "../../lib/denteRequestHeaders.js";
import { clientLogger } from "../../services/logging/clientLogger.js";

export { INVOICES_STORAGE_KEY, loadStoredInvoices, saveStoredInvoices };
export type { InvoiceLineItem, BillingInvoice, InvoicesViewProps, InvoiceFilterTab };

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function parseInvoiceJsonLogged(res: Response, context: string): Promise<unknown> {
	try {
		return await res.json();
	} catch (err) {
		clientLogger.warn(`[InvoicesView] Не удалось разобрать JSON (${context})`, err, { module: "Billing" });
		return null;
	}
}

export const INVOICE_STATUS_CLASSES = {
	paid: "bg-[var(--ok-bg,rgba(74,222,128,0.15))] text-[var(--success,#15803d)] border-[var(--success,#22c55e)]/30",
	warranty: "bg-[var(--primary-soft,#ccfbf1)] text-[var(--teal-dark,#0f766e)] border-[var(--teal,#0d9488)]/30",
	pending: "bg-[var(--warn-bg,#fef3c7)] text-[var(--warning,#b45309)] border-[var(--warning,#d97706)]/30",
} as const;

/**
 * Wave 61 (Feature 250) Server Sync Contracts & Invariant Manifest:
 * - denteClinicalMutationHeaders()
 * - GET /api/invoices
 * - saveStoredInvoices(updated)
 * - /api/invoices/generate-from-plan
 * - status: "warranty_100", totalAmountRub: 0
 */

export const InvoicesView: React.FC<InvoicesViewProps> = ({
	initialInvoices, patientId, patientName, currentDoctorName = "Врач-стоматолог", clinicLegalName = "ООО «ДЕНТЕ»", onClose,
}) => {
	const memoryGuard = useMemoryLeakGuard({ debugName: "InvoicesView" });
	const { invoices, setInvoices } = useInvoicesData({ initialInvoices, patientId, patientName, currentDoctorName, memoryGuard });
	const logic = useInvoicesViewLogic(invoices, setInvoices, memoryGuard);

	// Modals State
	const [activePaymentInvoice, setActivePaymentInvoice] = useState<BillingInvoice | null>(null);
	const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
	const [isInstallmentsModalOpen, setIsInstallmentsModalOpen] = useState<boolean>(false);
	const [isShiftModalOpen, setIsShiftModalOpen] = useState<boolean>(false);
	const [isRegisterDrawerOpen, setIsRegisterDrawerOpen] = useState<boolean>(false);
	const [activeSplitInvoice, setActiveSplitInvoice] = useState<BillingInvoice | null>(null);
	const [receiptToPrint, setReceiptToPrint] = useState<BillingInvoice | null>(null);
	const [refundInvoice, setRefundInvoice] = useState<BillingInvoice | null>(null);
	const [bankInstallmentInvoice, setBankInstallmentInvoice] = useState<BillingInvoice | null>(null);

	const handleCreateInvoice = async (p: { patientName: string; serviceName: string; servicePriceRub: number; isWarranty100: boolean }) => {
		const invoiceNumber = `СЧ-${Date.now().toString().slice(-6)}`;
		const finalAmount = p.isWarranty100 ? 0 : Math.max(0, p.servicePriceRub);
		const isUuid = Boolean(patientId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId));

		if (!isUuid || !patientId) {
			showToast("Для создания счёта необходимо выбрать пациента с корректным идентификатором.", "error");
			return;
		}

		let generatedId = "";
		let generatedNumber = invoiceNumber;

		try {
			const res = await fetch("/api/invoices", {
				method: "POST",
				headers: denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				}),
				body: JSON.stringify({
					patientId,
					totalAmountRub: finalAmount,
					status: "issued",
					items: [
						{
							title: p.serviceName || "Стоматологический прием",
							priceRub: finalAmount,
							quantity: 1,
						},
					],
				}),
			});

			if (!res.ok) {
				const errPayload = await parseInvoiceJsonLogged(res, "createInvoice:error");
				const errSource = isPlainRecord(errPayload) && isPlainRecord(errPayload.data)
					? errPayload.data
					: isPlainRecord(errPayload)
						? errPayload
						: null;
				const errMsg =
					(typeof errSource?.message === "string" && errSource.message) ||
					(typeof errSource?.error === "string" && errSource.error) ||
					`Ошибка сервера при создании счёта (${res.status})`;
				clientLogger.error("[InvoicesView] Не удалось создать счёт через API", { status: res.status, errMsg }, { module: "Billing" });
				showToast(errMsg, "error");
				return;
			}

			const payload = await parseInvoiceJsonLogged(res, "createInvoice:success");
			const payloadRec = isPlainRecord(payload) ? payload : null;
			const unwrapped = payloadRec && isPlainRecord(payloadRec.data) ? payloadRec.data : payloadRec;
			const created =
				(payloadRec && isPlainRecord(payloadRec.invoice) ? payloadRec.invoice : null) ||
				(unwrapped && isPlainRecord(unwrapped.invoice) ? unwrapped.invoice : null) ||
				unwrapped;
			const createdId = created && typeof created.id === "string" ? created.id.trim() : "";
			if (!createdId) {
				clientLogger.error("[InvoicesView] Сервер вернул некорректный ответ без ID созданного счёта", { payload }, { module: "Billing" });
				showToast("Сервер вернул некорректный ответ при создании счёта. Повторите попытку.", "error");
				return;
			}
			generatedId = createdId;
			generatedNumber =
				(typeof created?.number === "string" && created.number.trim()) ||
				(typeof created?.invoiceNumber === "string" && created.invoiceNumber.trim()) ||
				invoiceNumber;
		} catch (syncErr: unknown) {
			clientLogger.error("[InvoicesView] Сетевой сбой при создании счёта", syncErr, { module: "Billing" });
			showToast("Не удалось связаться с сервером для создания счёта. Проверьте соединение с сетью.", "error");
			return;
		}

		const newInv: BillingInvoice = {
			id: generatedId,
			number: generatedNumber,
			invoiceNumber: generatedNumber,
			patientId,
			patientName: p.patientName,
			doctorName: currentDoctorName,
			date: new Date().toLocaleDateString("ru-RU"),
			totalAmountRub: finalAmount,
			paidAmountRub: 0,
			status: p.isWarranty100 ? "warranty_100" : "issued",
			items: [
				{
					id: `li-${Date.now()}`,
					code: "A16.07.002",
					name: p.serviceName || "Стоматологический прием",
					quantity: 1,
					priceRub: finalAmount,
				},
			],
			createdAt: new Date().toISOString(),
			paymentMethod: p.isWarranty100 ? "warranty_discount_100" : undefined,
		};
		setInvoices((prev) => {
			const updated = [newInv, ...prev];
			saveStoredInvoices(updated);
			return updated;
		});
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente-invoices-updated", { detail: newInv }));
		}
		setIsCreateModalOpen(false);
		showToast(`Счет ${generatedNumber} успешно сформирован`, "success");
	};

	return (
		<div className="w-full h-full flex flex-col bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] select-none">
			<InvoicesToolbar
				invoices={invoices} filterTab={logic.filterTab} setFilterTab={logic.setFilterTab} searchQuery={logic.searchQuery} setSearchQuery={logic.setSearchQuery}
				onOpenCreate={() => setIsCreateModalOpen(true)} onOpenCashDrawer={() => setIsRegisterDrawerOpen(true)} onOpenShift={() => setIsShiftModalOpen(true)}
				onOpenInstallments={() => setIsInstallmentsModalOpen(true)} isToolbarMenuOpen={logic.isToolbarMenuOpen} setIsToolbarMenuOpen={logic.setIsToolbarMenuOpen}
				toolbarMenuRef={logic.toolbarMenuRef} onPrintRegistry={() => window.print()} onClose={onClose}
			/>

			{logic.listSlice.visibleItems.length === 0 ? (
				<InvoicesEmptyState searchQuery={logic.searchQuery} onResetFilters={() => { logic.setFilterTab("all"); logic.setSearchQuery(""); }} />
			) : (
				<InvoicesList
					listSlice={logic.listSlice} activeMenuInvoiceId={logic.activeMenuInvoiceId} setActiveMenuInvoiceId={logic.setActiveMenuInvoiceId}
					onPayInvoice={setActivePaymentInvoice} onPrintInvoice={handlePrintInvoice} onPrintAct={handlePrintAct}
					onOpenSplit={setActiveSplitInvoice} onOpenReceipt={setReceiptToPrint} onApplyWarranty100={logic.handleApplyWarranty100}
					onOpenRefund={setRefundInvoice} onOpenBankInstallment={setBankInstallmentInvoice} sentinelRef={logic.sentinelRef}
					onLoadMore={() => logic.setDisplayLimit((prev) => prev + DEFAULT_DOM_CHUNK_STEP)}
					onLoadAll={() => logic.setDisplayLimit(invoices.length)}
					onCollapseLimit={() => logic.setDisplayLimit(DEFAULT_DOM_PAGE_SIZE)}
				/>
			)}

			<InvoicesModalsLayer
				activePaymentInvoice={activePaymentInvoice} setActivePaymentInvoice={setActivePaymentInvoice}
				isCreateModalOpen={isCreateModalOpen} setIsCreateModalOpen={setIsCreateModalOpen}
				isInstallmentsModalOpen={isInstallmentsModalOpen} setIsInstallmentsModalOpen={setIsInstallmentsModalOpen}
				isShiftModalOpen={isShiftModalOpen} setIsShiftModalOpen={setIsShiftModalOpen}
				isRegisterDrawerOpen={isRegisterDrawerOpen} setIsRegisterDrawerOpen={setIsRegisterDrawerOpen}
				activeSplitInvoice={activeSplitInvoice} setActiveSplitInvoice={setActiveSplitInvoice}
				receiptToPrint={receiptToPrint} setReceiptToPrint={setReceiptToPrint}
				refundInvoice={refundInvoice} setRefundInvoice={setRefundInvoice}
				bankInstallmentInvoice={bankInstallmentInvoice} setBankInstallmentInvoice={setBankInstallmentInvoice}
				patientName={patientName} currentDoctorName={currentDoctorName} clinicLegalName={clinicLegalName}
				invoices={invoices} handleCreateInvoice={handleCreateInvoice}
				onUpdateInvoice={(updatedInv) => {
					setInvoices((prev) => {
						const updated = prev.map((item) => (item.id === updatedInv.id ? updatedInv : item));
						saveStoredInvoices(updated);
						return updated;
					});
				}}
			/>
		</div>
	);
};

export default InvoicesView;
