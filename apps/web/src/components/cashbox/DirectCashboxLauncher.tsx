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
import { CashRegisterCheckoutModal } from "./CashRegisterCheckoutModal.js";
import { StandaloneCashboxSsotHost } from "../appLayout/modalsContainerModules/standalone/administrative/StandaloneCashboxSsotHost.js";

interface CashboxLauncherDetail {
	readonly mode?: "checkout" | "hub";
	readonly amountRub?: number;
	readonly patientId?: string;
	readonly patientName?: string;
	readonly invoiceId?: string;
	readonly cashierFullName?: string;
}

export const DirectCashboxLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [activeView, setActiveView] = useState<"checkout" | "hub">("hub");
	const [customData, setCustomData] = useState<CashboxLauncherDetail | null>(null);

	const checkUrl = useCallback(() => {
		if (typeof window === "undefined") return;
		const h = window.location.hash.toLowerCase();
		const s = window.location.search.toLowerCase();

		const isCheckout = h.includes("checkout") || h.includes("payment") || s.includes("checkout") || s.includes("payment");
		const isHub = h.includes("cashbox") || h.includes("cash-register") || h.includes("cash_register") || s.includes("cashbox");

		if (isCheckout) {
			setActiveView("checkout");
			setIsOpen(true);
		} else if (isHub) {
			setActiveView("hub");
			setIsOpen(true);
		}
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

		return () => {
			window.removeEventListener("hashchange", checkUrl);
			window.removeEventListener("popstate", checkUrl);
			window.removeEventListener("dente:open-cashbox", handleCustomOpen);
			window.removeEventListener("dente-open-cashbox", handleCustomOpen);
		};
	}, [checkUrl]);

	if (!isOpen) return null;

	const handleClose = () => {
		setIsOpen(false);
		setCustomData(null);
		if (typeof window !== "undefined") {
			const cleanHash = window.location.hash.replace(
				/#cashbox|#checkout|#cash-register|#payment|#cashbox_ssot|#cash_register/g,
				"",
			);
			const url = new URL(window.location.href);
			url.searchParams.delete("cashbox");
			url.searchParams.delete("checkout");
			url.searchParams.delete("payment");
			const newUrl = url.pathname + (url.search ? url.search : "") + cleanHash;
			window.history.replaceState({}, "", newUrl);
		}
	};

	if (activeView === "checkout") {
		return (
			<CashRegisterCheckoutModal
				isOpen={isOpen}
				onClose={handleClose}
				totalDueRub={customData?.amountRub ?? 6500}
				patientId={customData?.patientId ?? "pat-walkin-01"}
				patientName={customData?.patientName ?? "Пациент на приёме"}
				invoiceId={customData?.invoiceId}
				cashierFullName={customData?.cashierFullName ?? "Администратор / Кассир"}
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
