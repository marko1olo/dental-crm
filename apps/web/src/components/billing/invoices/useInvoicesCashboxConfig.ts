/**
 * apps/web/src/components/billing/invoices/useInvoicesCashboxConfig.ts
 *
 * Dedicated Cashbox Config Resolver for InvoicesModalsLayer (Mandate 8b).
 * Unifies checkout, shift management, split-tender, and drawer into exactly ONE CashRegisterStudioModal mounting.
 */

import { useMemo } from "react";
import { rublesToKopecks } from "@dental/shared";
import { showToast } from "../../GlobalToast.js";
import type { CashRegisterStudioModalProps } from "../../cashbox/CashRegisterStudioModal.js";
import type { BillingInvoice } from "../invoiceTypes.js";

export interface InvoicesCashboxConfigParams {
	readonly isShiftModalOpen: boolean;
	readonly setIsShiftModalOpen: (open: boolean) => void;
	readonly activePaymentInvoice: BillingInvoice | null;
	readonly setActivePaymentInvoice: (inv: BillingInvoice | null) => void;
	readonly activeSplitInvoice: BillingInvoice | null;
	readonly setActiveSplitInvoice: (inv: BillingInvoice | null) => void;
	readonly isRegisterDrawerOpen: boolean;
	readonly setIsRegisterDrawerOpen: (open: boolean) => void;
	readonly invoices: BillingInvoice[];
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly currentDoctorName: string;
	readonly clinicLegalName: string;
	readonly onUpdateInvoice?: ((inv: BillingInvoice) => void) | undefined;
}

export function useInvoicesCashboxConfig(
	params: InvoicesCashboxConfigParams,
): CashRegisterStudioModalProps | null {
	const {
		isShiftModalOpen, setIsShiftModalOpen, activePaymentInvoice, setActivePaymentInvoice,
		activeSplitInvoice, setActiveSplitInvoice, isRegisterDrawerOpen, setIsRegisterDrawerOpen,
		invoices, patientId, patientName, currentDoctorName, clinicLegalName, onUpdateInvoice,
	} = params;

	return useMemo((): CashRegisterStudioModalProps | null => {
		if (isShiftModalOpen) {
			return {
				isOpen: true,
				onClose: () => setIsShiftModalOpen(false),
				mode: "shift",
				initialTab: "reconciliation",
				clinicLegalName,
				cashierFullName: currentDoctorName,
				containerTestId: "cash-register-modal",
				submitButtonTestId: "btn-confirm-close-shift-z-report",
				title: "Касса и чеки · Управление сменой и Z-отчёт",
			};
		}

		if (activePaymentInvoice) {
			return {
				isOpen: true,
				onClose: () => setActivePaymentInvoice(null),
				mode: "checkout",
				initialTab: "checkout",
				totalDueKopecks: rublesToKopecks(activePaymentInvoice.totalAmountRub),
				amountKopecks: rublesToKopecks(activePaymentInvoice.totalAmountRub),
				patientId: activePaymentInvoice.patientId,
				patientName: activePaymentInvoice.patientName,
				patientPhone: activePaymentInvoice.patientPhone,
				doctorFullName: activePaymentInvoice.doctorName,
				cashierFullName: currentDoctorName,
				clinicLegalName,
				invoiceId: activePaymentInvoice.id,
				onSuccess: (payload: unknown) => {
					const isObject = typeof payload === "object" && payload !== null;
					const isOffline = isObject && "offlineBuffered" in payload ? Boolean(payload.offlineBuffered) : false;
					const method = isObject && "method" in payload && typeof payload.method === "string" ? payload.method : undefined;
					const paidRub = isObject && "totalRub" in payload && typeof payload.totalRub === "number" ? payload.totalRub : activePaymentInvoice.totalAmountRub;
					const isDeferredInstallment = method === "installment" && paidRub === 0;
					const invoiceStatus: BillingInvoice["status"] = isDeferredInstallment
						? "partially_paid"
						: method === "warranty_100" || paidRub === 0
							? "warranty_100"
							: "paid";

					onUpdateInvoice?.({
						...activePaymentInvoice,
						status: invoiceStatus,
						paidAmountRub: isDeferredInstallment ? 0 : paidRub,
						...(isDeferredInstallment ? {} : { paidAt: new Date().toISOString() }),
						paymentMethod: method,
						fiscalStatus: isOffline ? "pending_fiscal_sync" : "fiscalized",
						isOfflineQueued: isOffline,
					});
					setActivePaymentInvoice(null);
					showToast(
						isDeferredInstallment
							? `По счёту ${activePaymentInvoice.number} оформлена рассрочка`
							: `Счет ${activePaymentInvoice.number} успешно закрыт`,
						"success",
					);
				},
			};
		}

		if (activeSplitInvoice) {
			return {
				isOpen: true,
				onClose: () => setActiveSplitInvoice(null),
				mode: "checkout",
				initialTab: "checkout",
				defaultMethod: "split",
				totalDueKopecks: rublesToKopecks(activeSplitInvoice.totalAmountRub),
				amountKopecks: rublesToKopecks(activeSplitInvoice.totalAmountRub),
				patientId: activeSplitInvoice.patientId,
				patientName: activeSplitInvoice.patientName,
				patientPhone: activeSplitInvoice.patientPhone,
				doctorFullName: activeSplitInvoice.doctorName,
				cashierFullName: currentDoctorName,
				clinicLegalName,
				invoiceId: activeSplitInvoice.id,
				onSuccess: (payload: unknown) => {
					const isOffline = typeof payload === "object" && payload !== null && "offlineBuffered" in payload
						? Boolean(payload.offlineBuffered)
						: false;
					onUpdateInvoice?.({
						...activeSplitInvoice,
						status: "paid",
						paidAmountRub: activeSplitInvoice.totalAmountRub,
						paidAt: new Date().toISOString(),
						paymentMethod: "split",
						fiscalStatus: isOffline ? "pending_fiscal_sync" : "fiscalized",
						isOfflineQueued: isOffline,
					});
					setActiveSplitInvoice(null);
					showToast(`Сплит-оплата по счету ${activeSplitInvoice.number} успешно проведена`, "success");
				},
			};
		}

		if (isRegisterDrawerOpen) {
			return {
				isOpen: true,
				onClose: () => setIsRegisterDrawerOpen(false),
				mode: "studio",
				initialTab: "checkout",
				cashierFullName: currentDoctorName,
				clinicLegalName,
				patientName: patientName || undefined,
				patientId: patientId || undefined,
				totalDueKopecks: 0,
				amountKopecks: 0,
				onSuccess: () => {
					showToast("Оплата успешно зафиксирована в кассе", "success");
				},
			};
		}

		return null;
	}, [
		isShiftModalOpen, setIsShiftModalOpen, activePaymentInvoice, setActivePaymentInvoice,
		activeSplitInvoice, setActiveSplitInvoice, isRegisterDrawerOpen, setIsRegisterDrawerOpen,
		invoices, patientId, patientName, currentDoctorName, clinicLegalName, onUpdateInvoice,
	]);
}
