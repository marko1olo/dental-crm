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

import { PaymentModal } from "./components/billing/PaymentModal";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";

function PaymentModalPreviewApp() {
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
					DENTE Studio Clinical HIG — Оплата и Кассовый чек 54-ФЗ
				</h1>
				<p className="text-xs text-[var(--muted)]">
					Тема: {rawTheme.toUpperCase()} | Экспресс-касса соло-врача | Термолента 80мм ФФД 1.2
				</p>
			</div>

			<PaymentModal
				isOpen={isOpen}
				onClose={() => setIsOpen(false)}
				patientId="pat-101"
				patientName="Смирнов Алексей Игоревич"
				patientPhone="+7 (916) 123-45-67"
				amountRub={12500}
				defaultMethod="cash"
				doctorName="Д-р Смирнов А. И."
				clinicLegalName="ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
			/>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(
		<React.StrictMode>
			<PaymentModalPreviewApp />
		</React.StrictMode>
	);
}
