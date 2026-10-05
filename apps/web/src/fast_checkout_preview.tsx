import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/modules/patients.css";
import "./styles/patients-redesign.css";
import "./styles/premium.css";
import "./styles/dente-redesign.css";
import "./styles/modules/header.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/overflow-fixes.css";
import "./components/billing/paymentModalStudio.css";

import { FastCheckoutModal } from "./components/finance/FastCheckoutModal";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";

function FastCheckoutPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const rawTheme = (params.get("theme") || "light") as ThemeMode;
	const [isOpen, setIsOpen] = useState(true);

	useEffect(() => {
		const resolved = resolveTheme(rawTheme, false);
		applyThemeToRoot(document.documentElement, resolved);
		document.body.className = `theme-${resolved.theme} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen`;
	}, [rawTheme]);

	return (
		<div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] p-4 flex flex-col items-center justify-center">
			<div className="text-center mb-4">
				<h1 className="text-lg font-bold text-[var(--ink)]">
					DENTE Clinical POS — Быстрый Расчёт и Сплит-Оплата 54-ФЗ
				</h1>
				<p className="text-xs text-[var(--muted)]">
					Тема: {rawTheme.toUpperCase()} | Мульти-сплит | Нал + Терминал + СБП + Депозит | ФФД 1.2
				</p>
			</div>

			<FastCheckoutModal
				isOpen={isOpen}
				onClose={() => setIsOpen(false)}
				patientId="pat-101"
				visitId="vis-101"
				patientName="Иванова Екатерина Сергеевна"
				patientPhone="+7 (926) 789-01-23"
				patientEmail="ivanova@example.com"
				totalBillRub={14500}
				patientDepositRub={3500}
				patientFamilyBalanceRub={2000}
				familyPayerName="Иванов С. В. (Супруг)"
				orderId="VIS-2026-0042"
				cashierFullName="Барабаш С. В. (Кассир)"
				attendingDoctorName="Д-р Воронов М. А."
				initialPaymentMethod="bank_card"
				initialSimpleCashierMode={false}
			/>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(
		<React.StrictMode>
			<FastCheckoutPreviewApp />
		</React.StrictMode>
	);
}
