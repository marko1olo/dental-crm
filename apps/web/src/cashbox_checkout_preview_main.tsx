import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/billing-checkout.css";
import "./styles/modules/finance.css";
import "./styles/modules/payments.css";
import { FastCheckoutModal } from "./components/finance/FastCheckoutModal";
import { PaymentModal } from "./components/billing/PaymentModal";
import { GlobalToast } from "./components/GlobalToast";

function CashboxCheckoutPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const themeParam = params.get("theme") || "light";
	const tabParam = (params.get("tab") || "cash") as any;
	const sumParam = Number(params.get("sum")) || 4500;

	const [theme, setTheme] = useState<string>(themeParam);
	const [isOpen, setIsOpen] = useState(true);

	useEffect(() => {
		const applyTheme = (th: string) => {
			document.documentElement.setAttribute("data-theme", th);
			if (th === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
			} else {
				document.documentElement.classList.add("light");
				document.documentElement.classList.remove("dark");
			}
			document.documentElement.style.colorScheme = th;
		};

		applyTheme(theme);

		const handleStorage = () => {
			const stored = localStorage.getItem("dente_theme") || localStorage.getItem("dente_theme_mode");
			if (stored && (stored === "light" || stored === "dark")) {
				setTheme(stored);
				applyTheme(stored);
			}
		};

		window.addEventListener("storage", handleStorage);
		return () => window.removeEventListener("storage", handleStorage);
	}, [theme]);

	const isPaymentModal = params.get("modal") === "payment" || !params.has("modal");

	return (
		<div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-0 sm:p-4 font-sans text-slate-900 dark:text-slate-100 antialiased">
			{isPaymentModal ? (
				<PaymentModal
					isOpen={isOpen}
					onClose={() => setIsOpen(true)}
					amountRub={sumParam}
					patientId="pat-101"
					patientName="Смирнов Алексей Викторович"
					patientPhone="+7 (999) 123-45-67"
					patientDepositRub={2500}
					patientFamilyBalanceRub={5000}
					cashierName="Д-р Воронов Алексей Владимирович"
					defaultMethod={
						tabParam === "cash"
							? "cash"
							: tabParam === "card"
							? "card_terminal"
							: tabParam === "sbp"
							? "sbp_qr"
							: tabParam === "deposit"
							? "family_deposit"
							: "sbp_qr"
					}
					onSuccess={(receipt) => {
						console.log("[Payment Completed]", receipt);
					}}
				/>
			) : (
				<FastCheckoutModal
					isOpen={isOpen}
					onClose={() => setIsOpen(true)}
					totalBillRub={sumParam}
					initialPaymentMethod={tabParam}
					patientId="pat-101"
					patientName="Смирнов Алексей Викторович"
					patientPhone="+7 (999) 123-45-67"
					patientEmail="smirnov.alex@mail.ru"
					patientDepositRub={2500}
					patientFamilyBalanceRub={5000}
					cashierFullName="Д-р Воронов Алексей Владимирович"
					attendingDoctorName="Д-р Воронов А. В."
					initialSimpleCashierMode={false}
					onPaymentComplete={(payload) => {
						console.log("[Payment Completed]", payload);
					}}
				/>
			)}
			<GlobalToast />
		</div>
	);
}

const container = document.getElementById("root");
if (container) {
	const root = createRoot(container);
	root.render(<CashboxCheckoutPreviewApp />);
}
