/**
 * DENTE Dental CRM — Direct Fast Checkout & Cashbox Launcher
 * Mandate 8b (<= 120 lines), Mandate 8e (Doctor Autonomy), Mandate 8aq (Mounted in UI Tree).
 */

import React, { useEffect, useState } from "react";
import { FastCheckoutModal } from "./FastCheckoutModal.js";

export const DirectFastCheckoutLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			s.includes("quick-checkout") ||
			s.includes("bonus-payment") ||
			s.includes("cashbox-pay") ||
			h.includes("quick-checkout") ||
			h.includes("bonus-payment") ||
			h.includes("cashbox-pay")
		);
	});

	useEffect(() => {
		const handleOpen = () => setIsOpen(true);
		window.addEventListener("dente-open-fast-checkout", handleOpen);
		window.addEventListener("dente:open-fast-checkout", handleOpen);
		return () => {
			window.removeEventListener("dente-open-fast-checkout", handleOpen);
			window.removeEventListener("dente:open-fast-checkout", handleOpen);
		};
	}, []);

	if (!isOpen) return null;

	const handleClose = () => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("quick-checkout");
			url.searchParams.delete("bonus-payment");
			url.searchParams.delete("cashbox-pay");
			const cleanHash = window.location.hash.replace(
				/#quick-checkout|#bonus-payment|#cashbox-pay/g,
				"",
			);
			const newUrl =
				url.pathname +
				(url.search ? url.search : "") +
				cleanHash;
			window.history.replaceState({}, "", newUrl);
		}
	};

	return (
		<FastCheckoutModal
			isOpen={isOpen}
			onClose={handleClose}
			totalBillRub={4500}
			totalBillKop={450000}
			patientId="pat-demo-01"
			patientName="Воронова Светлана Николаевна"
			patientPhone="+7 (926) 555-01-92"
			patientFamilyBalanceRub={1200}
			patientBonusPointsRub={1500}
			patientLoyaltyPoints={1500}
			orderId="CHK-DEMO-001"
			onPaymentComplete={() => {
				handleClose();
			}}
		/>
	);
};
