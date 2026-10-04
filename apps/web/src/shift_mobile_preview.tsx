import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/premium.css";
import "./styles/dente-redesign.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/modules/mobile-shift.css";
import "./styles/overflow-fixes.css";
import "./styles/contrast-fixes.css";
import "./styles/themes.css";
import "./styles/theme-overrides.css";

import { ShiftView } from "./ShiftView";
import { AppLogicProvider } from "./contexts/AppLogicContext";
import { applyThemeToRoot, resolveTheme } from "./lib/themeClasses";
import type { Dashboard } from "@dental/shared";

const TODAY_ISO = "2026-10-05";

const PREVIEW_DASHBOARD: Dashboard = {
	todayIso: TODAY_ISO,
	clinicName: "Клиника DENTE",
	clinicSettings: {
		profile: {
			clinicName: "Клиника DENTE",
			address: "г. Москва, ул. Арбат, 24",
			phone: "+7 (495) 123-45-67",
			timezone: "Europe/Moscow",
			mode: "small_clinic",
			organizationId: "org-1",
			inn: "7701234567",
			defaultVisitMinutes: 45,
		},
		staff: [
			{
				id: "doc-1",
				fullName: "Д-р Афанасьев Д.А.",
				role: "doctor",
				specialty: "Стоматолог-терапевт, ортопед",
				active: true,
			},
			{
				id: "doc-2",
				fullName: "Д-р Васильев В.П.",
				role: "doctor",
				specialty: "Хирург-имплантолог",
				active: true,
			},
		],
		chairs: [
			{ id: "chair-1", name: "Кабинет №1" },
			{ id: "chair-2", name: "Кабинет №2" },
		],
	},
	activeDoctor: {
		id: "doc-1",
		fullName: "Д-р Афанасьев Д.А.",
		role: "doctor",
		specialty: "Стоматолог-терапевт, ортопед",
	},
	shiftOpenedAt: "2026-10-05T08:30:00.000Z",
	shiftNumber: 104,
	patients: [
		{
			id: "pat-101",
			fullName: "Барабаш Сергей Владимирович",
			phone: "+7 (916) 123-45-67",
			birthDate: "1988-04-12",
			gender: "male",
			allergies: ["Лидокаин (в анамнезе)"],
			status: "active",
			balanceRub: 0,
			familyGroupId: null,
			balance: 0,
			lastVisitDate: "2026-10-01",
			upcomingVisitDate: "2026-10-15",
			totalVisits: 6,
		},
		{
			id: "pat-102",
			fullName: "Смирнова Елена Александровна",
			phone: "+7 (926) 987-65-43",
			birthDate: "1994-08-25",
			gender: "female",
			allergies: [],
			status: "active",
			balanceRub: 0,
			familyGroupId: null,
			balance: 0,
			lastVisitDate: "2026-09-20",
			upcomingVisitDate: "2026-10-16",
			totalVisits: 3,
		},
		{
			id: "pat-103",
			fullName: "Ковалев Дмитрий Игоревич",
			phone: "+7 (903) 555-44-33",
			birthDate: "1982-11-03",
			gender: "male",
			allergies: ["Пенициллин"],
			status: "active",
			balanceRub: 0,
			familyGroupId: null,
			balance: 0,
			lastVisitDate: "2026-08-11",
			upcomingVisitDate: "2026-10-05",
			totalVisits: 4,
		},
		{
			id: "pat-104",
			fullName: "Мельникова Анна Сергеевна",
			phone: "+7 (985) 234-56-78",
			birthDate: "1991-03-17",
			gender: "female",
			allergies: [],
			status: "active",
			balanceRub: 0,
			familyGroupId: null,
			balance: 0,
			lastVisitDate: "2026-07-22",
			upcomingVisitDate: "2026-10-05",
			totalVisits: 2,
		},
	],
	appointments: [
		{
			id: "app-101",
			patientId: "pat-101",
			patientFullName: "Барабаш Сергей Владимирович",
			startsAt: "2026-10-05T09:00:00.000Z",
			endsAt: "2026-10-05T10:00:00.000Z",
			status: "completed",
			doctorUserId: "doc-1",
			cabinetName: "Кабинет №1",
			reason: "Лечение кариеса 2.6 (Filtek A2)",
			priceRub: 6500,
		},
		{
			id: "app-102",
			patientId: "pat-102",
			patientFullName: "Смирнова Елена Александровна",
			startsAt: "2026-10-05T10:30:00.000Z",
			endsAt: "2026-10-05T11:45:00.000Z",
			status: "completed",
			doctorUserId: "doc-1",
			cabinetName: "Кабинет №1",
			reason: "Керамическая накладка e.max (фиксация)",
			priceRub: 24500,
		},
		{
			id: "app-103",
			patientId: "pat-103",
			patientFullName: "Ковалев Дмитрий Игоревич",
			startsAt: "2026-10-05T12:00:00.000Z",
			endsAt: "2026-10-05T13:30:00.000Z",
			status: "in_chair",
			doctorUserId: "doc-1",
			cabinetName: "Кабинет №1",
			reason: "Эндодонтия 1.6 (механическая и медикаментозная обработка)",
			priceRub: 14000,
		},
		{
			id: "app-104",
			patientId: "pat-104",
			patientFullName: "Мельникова Анна Сергеевна",
			startsAt: "2026-10-05T14:00:00.000Z",
			endsAt: "2026-10-05T15:00:00.000Z",
			status: "confirmed",
			doctorUserId: "doc-1",
			cabinetName: "Кабинет №1",
			reason: "Комплексная профгигиена полости рта Air-Flow",
			priceRub: 5500,
		},
	],
	payments: [
		{
			id: "pay-101",
			appointmentId: "app-101",
			amountRub: 6500,
			status: "paid",
			paidAt: "2026-10-05T10:05:00.000Z",
		},
		{
			id: "pay-102",
			appointmentId: "app-102",
			amountRub: 24500,
			status: "paid",
			paidAt: "2026-10-05T11:50:00.000Z",
		},
		{
			id: "pay-103",
			appointmentId: "app-103",
			amountRub: 14000,
			status: "paid",
			paidAt: "2026-10-05T13:35:00.000Z",
		},
	],
	patientInsights: [],
	communicationTasks: [],
	communicationEvents: [],
	communicationTemplates: [],
} as any;

function MobileShiftPreviewApp() {
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const rawTheme = (params.get("theme") || "light") as any;
		const resolved = resolveTheme(rawTheme, false);
		applyThemeToRoot(document.documentElement, resolved);
		document.body.className = `theme-${resolved.theme} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen`;
	}, []);

	return (
		<div
			style={{
				width: "100%",
				maxWidth: "100vw",
				minHeight: "100dvh",
				overflowX: "clip",
				margin: 0,
				padding: 0,
				background: "var(--paper)",
			}}
		>
			<AppLogicProvider value={{ dashboard: PREVIEW_DASHBOARD } as any}>
				<ShiftView forceMobile={true} dashboard={PREVIEW_DASHBOARD} />
			</AppLogicProvider>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(<MobileShiftPreviewApp />);
}
