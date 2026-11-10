/**
 * apps/web/src/components/cashbox/DirectCashboxLauncher.tsx
 *
 * Canonical UI Mount Launcher for Cashbox, Checkout & 54-FZ Fiscal Register.
 * Governed by:
 * - Mandate 8aq: Mounted directly in AppShell live DOM tree.
 * - Mandate 8e: Doctor & Cashier Autonomy.
 * - Mandate 8b: Launcher facade <= 120 lines.
 */

import React, { useEffect, useState, useCallback } from "react";
import { CashRegisterStudioModal } from "./CashRegisterStudioModal.js";
import { StandaloneCashboxSsotHost } from "../appLayout/modalsContainerModules/standalone/administrative/StandaloneCashboxSsotHost.js";
import { isDemoShowcaseMode } from "../../lib/demoMode.js";
import { getDemoUnpaidInvoices } from "./cashRegisterCatalogData.js";

interface CashboxLauncherDetail {
	readonly mode?: "checkout" | "hub";
	readonly amountRub?: number;
	readonly patientId?: string;
	readonly patientName?: string;
	readonly invoiceId?: string;
	readonly cashierFullName?: string;
}

function parseCashboxUrl(): { isOpen: boolean; view: "checkout" | "hub" } {
	if (typeof window === "undefined") return { isOpen: false, view: "hub" };
	const h = window.location.hash.toLowerCase();
	const s = window.location.search.toLowerCase();
	if (
		h.includes("checkout") ||
		h.includes("payment") ||
		h.includes("fast-checkout") ||
		h.includes("quick-checkout") ||
		h.includes("cashbox-pay") ||
		h.includes("bonus-payment") ||
		s.includes("checkout") ||
		s.includes("payment") ||
		s.includes("fast-checkout") ||
		s.includes("quick-checkout") ||
		s.includes("cashbox-pay") ||
		s.includes("bonus-payment")
	) {
		return { isOpen: true, view: "checkout" };
	}
	if (
		h.includes("cashbox") ||
		h.includes("cashbox_ssot") ||
		h.includes("cash-register") ||
		h.includes("cash_register") ||
		h.includes("shift_closing") ||
		h.includes("shift_journal") ||
		h.includes("cashier") ||
		h.includes("receipt") ||
		h.includes("kassa") ||
		s.includes("cashbox") ||
		s.includes("cashbox_ssot") ||
		s.includes("cash_register") ||
		s.includes("cashier") ||
		s.includes("kassa")
	) {
		return { isOpen: true, view: "hub" };
	}
	return { isOpen: false, view: "hub" };
}

export const DirectCashboxLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => parseCashboxUrl().isOpen);
	const [activeView, setActiveView] = useState<"checkout" | "hub">(() => parseCashboxUrl().view);
	const [customData, setCustomData] = useState<CashboxLauncherDetail | null>(null);

	const checkUrl = useCallback(() => {
		const parsed = parseCashboxUrl();
		setActiveView(parsed.view);
		setIsOpen(parsed.isOpen);
	}, []);

	useEffect(() => {
		checkUrl();
		window.addEventListener("hashchange", checkUrl);
		window.addEventListener("popstate", checkUrl);

		const handleCustomOpen = (e: Event) => {
			const customEvent = e as CustomEvent<CashboxLauncherDetail>;
			if (customEvent.detail) {
				setCustomData(customEvent.detail);
				setActiveView(customEvent.detail.mode === "checkout" ? "checkout" : "hub");
			} else {
				setActiveView("checkout");
			}
			setIsOpen(true);
		};

		window.addEventListener("dente:open-cashbox", handleCustomOpen);
		window.addEventListener("dente-open-cashbox", handleCustomOpen);
		window.addEventListener("dente:open-cashier", handleCustomOpen);
		window.addEventListener("dente-open-cashier", handleCustomOpen);
		window.addEventListener("dente:open-fast-checkout", handleCustomOpen);
		window.addEventListener("dente-open-fast-checkout", handleCustomOpen);

		return () => {
			window.removeEventListener("hashchange", checkUrl);
			window.removeEventListener("popstate", checkUrl);
			window.removeEventListener("dente:open-cashbox", handleCustomOpen);
			window.removeEventListener("dente-open-cashbox", handleCustomOpen);
			window.removeEventListener("dente:open-cashier", handleCustomOpen);
			window.removeEventListener("dente-open-cashier", handleCustomOpen);
			window.removeEventListener("dente:open-fast-checkout", handleCustomOpen);
			window.removeEventListener("dente-open-fast-checkout", handleCustomOpen);
		};
	}, [checkUrl]);

	if (!isOpen) return null;

	const handleClose = () => {
		setIsOpen(false);
		setCustomData(null);
		if (typeof window !== "undefined") {
			const cleanHash = window.location.hash.replace(
				/#(cashbox_ssot|cashbox|checkout|cash-register|cash_register|shift_closing|shift_journal|payment|cashier|receipt|kassa|fast-checkout|quick-checkout|bonus-payment|cashbox-pay)[^&]*/g,
				"",
			);
			const url = new URL(window.location.href);
			[
				"cashbox", "cashbox_ssot", "cash_register", "shift_closing", "shift_journal",
				"checkout", "payment", "cashier", "kassa", "fast-checkout", "quick-checkout",
				"bonus-payment", "cashbox-pay",
			].forEach((k) => url.searchParams.delete(k));
			const newUrl = url.pathname + (url.search ? url.search : "") + cleanHash;
			window.history.replaceState({}, "", newUrl);
		}
	};

	if (activeView === "checkout") {
		const demoFallback = isDemoShowcaseMode() ? getDemoUnpaidInvoices()[0] : undefined;
		const effectiveAmountRub = customData?.amountRub ?? demoFallback?.amountRub;
		const effectivePatientId = customData?.patientId ?? demoFallback?.patientId;
		const effectivePatientName = customData?.patientName ?? demoFallback?.patientName;
		const effectivePatientPhone = demoFallback?.patientPhone;
		const effectiveDoctorFullName = demoFallback?.doctorName;
		const effectiveServiceTitle = demoFallback?.serviceTitle;
		const effectiveDepositRub = demoFallback?.depositRub;
		const effectiveFamilyBalanceRub = demoFallback?.familyBalanceRub;
		const effectiveInvoiceId = customData?.invoiceId ?? demoFallback?.id;

		return (
			<CashRegisterStudioModal
				isOpen={isOpen}
				onClose={handleClose}
				mode="checkout"
				initialTab="checkout"
				containerTestId="cash-register-checkout-modal"
				submitButtonTestId="btn-confirm-checkout-payment"
				title="Касса · Оплата приёма"
				totalDueRub={effectiveAmountRub}
				patientId={effectivePatientId}
				patientName={effectivePatientName}
				patientPhone={effectivePatientPhone}
				doctorFullName={effectiveDoctorFullName}
				serviceTitle={effectiveServiceTitle}
				patientDepositRub={effectiveDepositRub}
				patientFamilyBalanceRub={effectiveFamilyBalanceRub}
				invoiceId={effectiveInvoiceId}
				cashierFullName={customData?.cashierFullName ?? "Кассир"}
				onSuccess={handleClose}
			/>
		);
	}

	return (
		<div className="fixed inset-0 z-[9999] overflow-y-auto bg-[var(--paper-soft,#f8fafc)]">
			<StandaloneCashboxSsotHost onClose={handleClose} />
		</div>
	);
};

export default DirectCashboxLauncher;
