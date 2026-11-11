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
	readonly amount?: number;
	readonly patientId?: string;
	readonly patientName?: string;
	readonly patientPhone?: string;
	readonly invoiceId?: string;
	readonly cashierFullName?: string;
}

interface ParsedCashboxUrl {
	readonly isOpen: boolean;
	readonly view: "checkout" | "hub";
	readonly params?: {
		readonly patientId?: string;
		readonly patientName?: string;
		readonly patientPhone?: string;
		readonly invoiceId?: string;
		readonly amountRub?: number;
		readonly cashierFullName?: string;
	};
}

function parseCashboxUrl(): ParsedCashboxUrl {
	if (typeof window === "undefined") return { isOpen: false, view: "hub" };
	const h = window.location.hash;
	const s = window.location.search;
	const hLower = h.toLowerCase();
	const sLower = s.toLowerCase();

	const isCheckout =
		hLower.includes("checkout") ||
		hLower.includes("payment") ||
		hLower.includes("fast-checkout") ||
		hLower.includes("quick-checkout") ||
		hLower.includes("cashbox-pay") ||
		hLower.includes("bonus-payment") ||
		sLower.includes("checkout") ||
		sLower.includes("payment") ||
		sLower.includes("fast-checkout") ||
		sLower.includes("quick-checkout") ||
		sLower.includes("cashbox-pay") ||
		sLower.includes("bonus-payment");

	const isHub =
		!isCheckout &&
		(hLower.includes("cashbox") ||
			hLower.includes("cashbox_ssot") ||
			hLower.includes("cash-register") ||
			hLower.includes("cash_register") ||
			hLower.includes("shift_closing") ||
			hLower.includes("shift_journal") ||
			hLower.includes("cashier") ||
			hLower.includes("receipt") ||
			hLower.includes("kassa") ||
			sLower.includes("cashbox") ||
			sLower.includes("cashbox_ssot") ||
			sLower.includes("cash_register") ||
			sLower.includes("cashier") ||
			sLower.includes("kassa"));

	if (!isCheckout && !isHub) {
		return { isOpen: false, view: "hub" };
	}

	// [DEF-CASH-02] Честный парсинг query-параметров из window.location.search и hash-query
	const searchParams = new URLSearchParams(s);
	let hashQueryString = "";
	if (h.includes("?")) {
		hashQueryString = h.slice(h.indexOf("?") + 1);
	} else if (h.includes("&")) {
		hashQueryString = h.slice(h.indexOf("&") + 1);
	}
	const hashParams = new URLSearchParams(hashQueryString);

	const getParam = (key: string): string | undefined => {
		return hashParams.get(key) || searchParams.get(key) || undefined;
	};

	const patientId = getParam("patientId") || getParam("patient_id");
	const patientName = getParam("patientName") || getParam("patient_name");
	const patientPhone = getParam("patientPhone") || getParam("patient_phone") || getParam("phone");
	const invoiceId = getParam("invoiceId") || getParam("invoice_id");
	const cashierFullName = getParam("cashierFullName") || getParam("cashier_name") || getParam("cashier");
	const rawAmount = getParam("amount") || getParam("amountRub") || getParam("amount_rub") || getParam("totalDueRub");
	const parsedAmount = rawAmount ? parseFloat(rawAmount) : undefined;
	const amountRub = Number.isFinite(parsedAmount) ? parsedAmount : undefined;

	return {
		isOpen: true,
		view: isCheckout ? "checkout" : "hub",
		params: {
			patientId,
			patientName,
			patientPhone,
			invoiceId,
			amountRub,
			cashierFullName,
		},
	};
}

export const DirectCashboxLauncher: React.FC = () => {
	const [urlState, setUrlState] = useState<ParsedCashboxUrl>(() => parseCashboxUrl());
	const [customData, setCustomData] = useState<CashboxLauncherDetail | null>(null);

	const isOpen = urlState.isOpen;
	const activeView = urlState.view;

	const checkUrl = useCallback(() => {
		const parsed = parseCashboxUrl();
		setUrlState(parsed);
	}, []);

	useEffect(() => {
		checkUrl();
		window.addEventListener("hashchange", checkUrl);
		window.addEventListener("popstate", checkUrl);

		const handleCustomOpen = (e: Event) => {
			const customEvent = e as CustomEvent<CashboxLauncherDetail>;
			const d = customEvent.detail;
			if (d) {
				const rawAmt = d.amountRub ?? d.amount;
				const parsedAmt = typeof rawAmt === "number" ? rawAmt : (rawAmt ? parseFloat(String(rawAmt)) : undefined);
				setCustomData({
					mode: d.mode || "checkout",
					amountRub: Number.isFinite(parsedAmt) ? parsedAmt : undefined,
					patientId: d.patientId,
					patientName: d.patientName,
					patientPhone: d.patientPhone,
					invoiceId: d.invoiceId,
					cashierFullName: d.cashierFullName,
				});
				setUrlState({
					isOpen: true,
					view: d.mode === "hub" ? "hub" : "checkout",
				});
			} else {
				setUrlState({
					isOpen: true,
					view: "checkout",
				});
			}
		};

		window.addEventListener("dente:open-cashbox", handleCustomOpen);
		window.addEventListener("dente-open-cashbox", handleCustomOpen);
		window.addEventListener("dente:open-cashier", handleCustomOpen);
		window.addEventListener("dente-open-cashier", handleCustomOpen);
		window.addEventListener("dente:open-fast-checkout", handleCustomOpen);
		window.addEventListener("dente-open-fast-checkout", handleCustomOpen);
		window.addEventListener("dente:open-payment-modal", handleCustomOpen);
		window.addEventListener("dente-open-payment-modal", handleCustomOpen);

		return () => {
			window.removeEventListener("hashchange", checkUrl);
			window.removeEventListener("popstate", checkUrl);
			window.removeEventListener("dente:open-cashbox", handleCustomOpen);
			window.removeEventListener("dente-open-cashbox", handleCustomOpen);
			window.removeEventListener("dente:open-cashier", handleCustomOpen);
			window.removeEventListener("dente-open-cashier", handleCustomOpen);
			window.removeEventListener("dente:open-fast-checkout", handleCustomOpen);
			window.removeEventListener("dente-open-fast-checkout", handleCustomOpen);
			window.removeEventListener("dente:open-payment-modal", handleCustomOpen);
			window.removeEventListener("dente-open-payment-modal", handleCustomOpen);
		};
	}, [checkUrl]);

	if (!isOpen) return null;

	const handleClose = () => {
		setUrlState({ isOpen: false, view: "hub" });
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
				"bonus-payment", "cashbox-pay", "patientId", "patient_id", "patientName", "patient_name",
				"invoiceId", "invoice_id", "amount", "amountRub", "amount_rub", "totalDueRub",
			].forEach((k) => url.searchParams.delete(k));
			const newUrl = url.pathname + (url.search ? url.search : "") + cleanHash;
			window.history.replaceState({}, "", newUrl);
		}
	};

	if (activeView === "checkout") {
		const demoFallback = isDemoShowcaseMode() ? getDemoUnpaidInvoices()[0] : undefined;
		const effectiveAmountRub = customData?.amountRub ?? urlState.params?.amountRub ?? demoFallback?.amountRub;
		const effectivePatientId = customData?.patientId ?? urlState.params?.patientId ?? demoFallback?.patientId;
		const effectivePatientName = customData?.patientName ?? urlState.params?.patientName ?? demoFallback?.patientName;
		const effectivePatientPhone = customData?.patientPhone ?? urlState.params?.patientPhone ?? demoFallback?.patientPhone;
		const effectiveDoctorFullName = demoFallback?.doctorName;
		const effectiveServiceTitle = demoFallback?.serviceTitle;
		const effectiveDepositRub = demoFallback?.depositRub;
		const effectiveFamilyBalanceRub = demoFallback?.familyBalanceRub;
		const effectiveInvoiceId = customData?.invoiceId ?? urlState.params?.invoiceId ?? demoFallback?.id;

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
				cashierFullName={customData?.cashierFullName ?? urlState.params?.cashierFullName ?? "Кассир"}
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
