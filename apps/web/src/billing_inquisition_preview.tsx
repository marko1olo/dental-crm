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

import {
	CashRegisterCheckoutModal,
	SplitPaymentModal,
	DepositTopupModal,
} from "./components/billing/index.js";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses.js";

type PreviewView = "checkout" | "split" | "deposit";

function BillingInquisitionPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const initialView = (params.get("view") || "checkout") as PreviewView;
	const rawTheme = (params.get("theme") || "light") as ThemeMode;

	const [activeView, setActiveView] = useState<PreviewView>(initialView);
	const [isCheckoutOpen, setIsCheckoutOpen] = useState(true);
	const [isSplitOpen, setIsSplitOpen] = useState(true);
	const [isDepositOpen, setIsDepositOpen] = useState(true);

	useEffect(() => {
		const resolved = resolveTheme(rawTheme, false);
		applyThemeToRoot(document.documentElement, resolved);
		document.body.className = `theme-${resolved.theme} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen`;
	}, [rawTheme]);

	return (
		<div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] p-4 flex flex-col items-center justify-start">
			{/* Preview Navigation Strip */}
			<div className="w-full max-w-4xl flex items-center justify-between p-3 mb-4 rounded-xl border border-[var(--line)] bg-[var(--paper-card)] shadow-xs">
				<div className="flex items-center gap-3">
					<div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
					<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
						54-ФЗ Billing Inquisition Stand (Wave 7)
					</span>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						data-testid="preview-btn-checkout"
						onClick={() => {
							setActiveView("checkout");
							setIsCheckoutOpen(true);
						}}
						className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
							activeView === "checkout"
								? "bg-[var(--accent)] text-white shadow-xs"
								: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
						}`}
					>
						Касса 54-ФЗ (15 сек)
					</button>
					<button
						type="button"
						data-testid="preview-btn-split"
						onClick={() => {
							setActiveView("split");
							setIsSplitOpen(true);
						}}
						className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
							activeView === "split"
								? "bg-[var(--accent)] text-white shadow-xs"
								: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
						}`}
					>
						Сплит-Оплата
					</button>
					<button
						type="button"
						data-testid="preview-btn-deposit"
						onClick={() => {
							setActiveView("deposit");
							setIsDepositOpen(true);
						}}
						className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
							activeView === "deposit"
								? "bg-[var(--accent)] text-white shadow-xs"
								: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
						}`}
					>
						Пополнение Депозита
					</button>
				</div>
			</div>

			{/* Main Active Modal Render */}
			{activeView === "checkout" && (
				<CashRegisterCheckoutModal
					isOpen={isCheckoutOpen}
					onClose={() => setIsCheckoutOpen(true)}
					totalDueRub={12500}
					patientId="pat-401"
					patientName="Иванова Екатерина Сергеевна"
					patientPhone="+7 (926) 789-01-23"
					patientEmail="ivanova.dental@example.com"
					patientDepositRub={3500}
					patientFamilyBalanceRub={2000}
					invoiceId="INV-2026-0042"
					visitId="VIS-2026-0042"
					cashierFullName="Барабаш С. В. (Кассир)"
					doctorFullName="Д-р Воронов М. А."
					clinicLegalName="ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
					onOpenSplitPayment={() => {
						setActiveView("split");
						setIsSplitOpen(true);
					}}
					onOpenDepositTopup={() => {
						setActiveView("deposit");
						setIsDepositOpen(true);
					}}
				/>
			)}

			{activeView === "split" && (
				<SplitPaymentModal
					isOpen={isSplitOpen}
					onClose={() => setIsSplitOpen(true)}
					totalDueRub={20000}
					patientId="pat-402"
					patientName="Смирнов Алексей Владимирович"
					patientPhone="+7 (916) 123-45-67"
					patientDepositRub={5000}
					patientFamilyBalanceRub={3000}
					invoiceId="INV-2026-0089"
					visitId="VIS-2026-0089"
					cashierFullName="Барабаш С. В. (Кассир)"
					clinicLegalName="ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
				/>
			)}

			{activeView === "deposit" && (
				<DepositTopupModal
					isOpen={isDepositOpen}
					onClose={() => setIsDepositOpen(true)}
					patientId="pat-403"
					patientName="Кузнецова Мария Дмитриевна"
					patientPhone="+7 (903) 987-65-43"
					patientEmail="kuznetsova@example.com"
					currentDepositRub={7500}
					isFamilyShared={false}
					cashierFullName="Барабаш С. В."
					clinicLegalName="ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
				/>
			)}
		</div>
	);
}

const rootElement = document.getElementById("root");
if (rootElement) {
	ReactDOM.createRoot(rootElement).render(<BillingInquisitionPreviewApp />);
}
