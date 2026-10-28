/**
 * paymentModalPreviewEntry.tsx — Preview entry for PaymentModal (Mandate 8b <= 120 lines).
 */

import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/overflow-fixes.css";
import "./styles/contrast-fixes.css";
import "./styles/themes.css";
import "./styles/theme-overrides.css";
import "./theme.css";
import { PaymentModal } from "./components/finance/PaymentModal";

function PaymentModalPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const themeParam = params.get("theme") || "light";
	const isDark = themeParam === "dark" || themeParam === "night";

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
		if (isDark) {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
		}
	}, [isDark]);

	return (
		<div className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col items-center justify-end md:justify-center p-0">
			<PaymentModal
				isOpen={true}
				onClose={() => {}}
				patientId="00000000-0000-0000-0000-000000000001"
				patientName="Воронов Дмитрий Игоревич"
				patientPhone="+7 (925) 876-54-32"
				amountRub={14500}
				patientDepositRub={5000}
				patientFamilyBalanceRub={12000}
				cashierName="Администратор Иванова Е."
				doctorName="Д-р Соколов А. В."
				items={[
					{ id: "1", name: "Прием (осмотр, консультация) врача-стоматолога", priceRub: 2500, quantity: 1 },
					{ id: "2", name: "Лечение глубокого кариеса с реставрацией", priceRub: 12000, quantity: 1 },
				]}
			/>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	createRoot(rootEl).render(<PaymentModalPreviewApp />);
}
