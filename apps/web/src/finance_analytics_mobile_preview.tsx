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
import "./styles/contrast-fixes.css";
import "./styles/themes.css";
import "./styles/theme-overrides.css";
import "./components/payments/checkout/fastCheckout.css";
import "./components/analytics/clinicAnalyticsDashboard.css";

import { FastCheckoutModal } from "./components/finance/FastCheckoutModal";
import { DEFAULT_TREATMENT_STAGES } from "./components/payments/checkout/fastCheckoutEngine";
import { ClinicAnalyticsDashboard } from "./components/analytics/ClinicAnalyticsDashboard";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";

import type { RawPaymentItem, RawInvoiceItem } from "./components/analytics/financialAnalyticsEngine";
import type { RawAppointmentItem } from "./components/analytics/chairUtilizationEngine";
import type { RawDoctorVisitItem } from "./components/analytics/doctorProductivityEngine";

const SAMPLE_PAYMENTS: RawPaymentItem[] = [
	{
		id: "pay-1",
		amountKopecks: 1450000,
		status: "paid",
		paymentMethod: "card",
		patientId: "pat-101",
		isPrimaryPatient: true,
		paidAt: new Date().toISOString(),
	},
	{
		id: "pay-2",
		amountKopecks: 820000,
		status: "paid",
		paymentMethod: "cash",
		patientId: "pat-102",
		isPrimaryPatient: false,
		paidAt: new Date().toISOString(),
	},
	{
		id: "pay-3",
		amountKopecks: 2400000,
		status: "paid",
		paymentMethod: "sbp",
		patientId: "pat-103",
		isPrimaryPatient: true,
		paidAt: new Date().toISOString(),
	},
];

const SAMPLE_INVOICES: RawInvoiceItem[] = [
	{
		id: "inv-1",
		totalAmountKopecks: 1450000,
		paidAmountKopecks: 1450000,
		status: "paid",
		patientId: "pat-101",
	},
	{
		id: "inv-2",
		totalAmountKopecks: 1200000,
		paidAmountKopecks: 800000,
		status: "issued",
		patientId: "pat-104",
		dueDate: "2026-10-15",
	},
];

const SAMPLE_APPOINTMENTS: RawAppointmentItem[] = [
	{
		id: "app-1",
		chairId: "chair-1",
		chairName: "Кресло 1 (Терапия)",
		startsAt: "2026-10-04T09:00:00Z",
		endsAt: "2026-10-04T10:30:00Z",
		status: "completed",
		revenueKopecks: 1450000,
		doctorId: "doc-1",
		doctorName: "Д-р Смирнов А.В.",
		patientId: "pat-101",
	},
	{
		id: "app-2",
		chairId: "chair-2",
		chairName: "Кресло 2 (Ортопедия)",
		startsAt: "2026-10-04T11:00:00Z",
		endsAt: "2026-10-04T12:45:00Z",
		status: "completed",
		revenueKopecks: 3800000,
		doctorId: "doc-2",
		doctorName: "Д-р Ковалева Е.И.",
		patientId: "pat-102",
	},
	{
		id: "app-3",
		chairId: "chair-3",
		chairName: "Хирургический кабинет",
		startsAt: "2026-10-04T13:30:00Z",
		endsAt: "2026-10-04T15:00:00Z",
		status: "completed",
		revenueKopecks: 5400000,
		doctorId: "doc-3",
		doctorName: "Д-р Захаров М.А.",
		patientId: "pat-103",
	},
];

const SAMPLE_DOCTOR_VISITS: RawDoctorVisitItem[] = [
	{
		id: "docv-1",
		doctorId: "doc-3",
		doctorName: "Д-р Захаров М.А.",
		specialty: "Хирург-имплантолог",
		status: "completed",
		patientId: "pat-103",
		isPrimaryPatient: true,
		billedKopecks: 5400000,
		paidKopecks: 5400000,
	},
	{
		id: "docv-2",
		doctorId: "doc-2",
		doctorName: "Д-р Ковалева Е.И.",
		specialty: "Ортопед",
		status: "completed",
		patientId: "pat-102",
		isPrimaryPatient: false,
		billedKopecks: 3800000,
		paidKopecks: 3800000,
	},
	{
		id: "docv-3",
		doctorId: "doc-1",
		doctorName: "Д-р Смирнов А.В.",
		specialty: "Терапевт",
		status: "completed",
		patientId: "pat-101",
		isPrimaryPatient: true,
		billedKopecks: 1450000,
		paidKopecks: 1450000,
	},
];

function FinanceAnalyticsMobilePreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const rawTheme = (params.get("theme") || "light") as ThemeMode;
	const view = params.get("view") || "checkout"; // 'checkout' | 'analytics'
	const tab = (params.get("tab") || "overview") as any;

	useEffect(() => {
		const resolved = resolveTheme(rawTheme, false);
		applyThemeToRoot(document.documentElement, resolved);
		document.body.className = `theme-${resolved.theme} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen`;
	}, [rawTheme]);

	return (
		<div className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col">
			{view === "checkout" ? (
				<FastCheckoutModal
					isOpen={true}
					onClose={() => {}}
					totalBillRub={15500}
					totalBillKop={1550000}
					patientName="Алексеев Владимир Сергеевич"
					patientPhone="+7 (916) 123-45-67"
					patientEmail="alekseev@example.com"
					patientDepositRub={5000}
					patientFamilyBalanceRub={12000}
					familyPayerName="Алексеева Е.В."
					orderId="2026-0492"
					stages={DEFAULT_TREATMENT_STAGES}
					cashierFullName="Петрова М.С."
					attendingDoctorName="Д-р Смирнов А.В."
					initialSimpleCashierMode={true}
					initialPaymentMethod="bank_card"
				/>
			) : (
				<ClinicAnalyticsDashboard
					initialPeriod="month"
					initialTab={tab}
					customPayments={SAMPLE_PAYMENTS}
					customInvoices={SAMPLE_INVOICES}
					customAppointments={SAMPLE_APPOINTMENTS}
					customDoctorVisits={SAMPLE_DOCTOR_VISITS}
				/>
			)}
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(
		<React.StrictMode>
			<FinanceAnalyticsMobilePreviewApp />
		</React.StrictMode>,
	);
}
