/**
 * cashboxPreviewEntry.tsx — Preview entry for Cashbox SSOT (CashRegisterCheckoutModal & CashShiftJournalView).
 * Governed by Mandates 8e, 8n, 8am, Apple HIG.
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
import { CashRegisterCheckoutModal } from "./components/cashbox/CashRegisterCheckoutModal";
import { CashShiftJournalView } from "./components/cashbox/CashShiftJournalView";

function CashboxPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const themeParam = params.get("theme") || "light";
	const viewParam = params.get("view") || "checkout";
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

	if (viewParam === "journal") {
		return (
			<div className="w-full min-h-screen bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] p-4 sm:p-6 md:p-8 flex flex-col items-center justify-start max-w-6xl mx-auto box-border">
				<div className="w-full flex items-center justify-between mb-6 pb-4 border-b border-[var(--line,#e2e8f0)]">
					<div>
						<h1 className="text-xl sm:text-2xl font-bold text-[var(--ink,#0f172a)] tracking-tight">
							Касса и чеки
						</h1>
						<p className="text-xs text-[var(--muted,#64748b)]">
							Журнал кассовых смен, фискализация и закрытие смен
						</p>
					</div>
				</div>
				<div className="w-full">
					<CashShiftJournalView
						clinicName="ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
						cashierFullName="Администратор / Кассир"
						onOpenShiftCloseModal={() => {}}
						onOpenNewShift={() => {}}
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full min-h-screen bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] p-4 sm:p-6 md:p-8 flex flex-col items-center justify-start max-w-6xl mx-auto box-border">
			<div className="w-full flex items-center justify-between mb-6 pb-4 border-b border-[var(--line,#e2e8f0)]">
				<div>
					<h1 className="text-xl sm:text-2xl font-bold text-[var(--ink,#0f172a)] tracking-tight">
						Касса и чеки
					</h1>
					<p className="text-xs text-[var(--muted,#64748b)]">
						Журнал кассовых смен, приём оплаты и фискализация чеков
					</p>
				</div>
			</div>
			<div className="w-full">
				<CashShiftJournalView
					clinicName="ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
					cashierFullName="Администратор Иванова Е. С."
					onOpenShiftCloseModal={() => {}}
					onOpenNewShift={() => {}}
				/>
			</div>
			<CashRegisterCheckoutModal
				isOpen={true}
				onClose={() => {}}
				totalDueRub={8500}
				patientId="pat-1002"
				patientName="Воронов Дмитрий Игоревич"
				patientPhone="+7 (925) 876-54-32"
				patientDepositRub={3000}
				patientFamilyBalanceRub={5000}
				cashierFullName="Администратор Иванова Е. С."
				doctorFullName="Д-р Соколов А. В."
				clinicLegalName="ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
				defaultMethod="card"
			/>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	createRoot(rootEl).render(<CashboxPreviewApp />);
}
