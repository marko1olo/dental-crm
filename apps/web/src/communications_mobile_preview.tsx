import React, { useEffect, useState } from "react";
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
import "./styles/overflow-fixes.css";
import "./styles/contrast-fixes.css";
import "./styles/themes.css";
import "./styles/theme-overrides.css";

import { MobileCommunicationsMessenger } from "./components/communications/MobileCommunicationsMessenger";
import { applyThemeToRoot, resolveTheme } from "./lib/themeClasses";
import type { Dashboard } from "@dental/shared";

// Honest Clinic Demonstration & Production Data
const PREVIEW_DASHBOARD: Dashboard = {
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
			balanceRub: 1500,
			familyGroupId: null,
			balance: 1500,
			lastVisitDate: "2026-09-15",
			upcomingVisitDate: null,
			totalVisits: 12,
		},
		{
			id: "pat-104",
			fullName: "Морозова Анна Михайловна",
			phone: "+7 (985) 222-11-00",
			birthDate: "2001-02-14",
			gender: "female",
			allergies: [],
			status: "active",
			balanceRub: 0,
			familyGroupId: null,
			balance: 0,
			lastVisitDate: "2026-10-02",
			upcomingVisitDate: "2026-10-20",
			totalVisits: 2,
		},
	],
	communicationEvents: [
		{
			id: "ev-1-prompt",
			patientId: "pat-101",
			patientName: "Барабаш Сергей Владимирович",
			patientPhone: "+7 (916) 123-45-67",
			channel: "whatsapp",
			direction: "outbound",
			message: "Здравствуйте! Напоминаем о вашей записи на приём завтра в 11:30 к доктору Смирновой Е.А. Подтвердите, пожалуйста, визит.",
			createdAt: new Date(Date.now() - 180 * 60000).toISOString(),
			status: "read",
			deliveryStatus: "delivered",
			sender: "clinic",
		},
		{
			id: "ev-1",
			patientId: "pat-101",
			patientName: "Барабаш Сергей Владимирович",
			patientPhone: "+7 (916) 123-45-67",
			channel: "whatsapp",
			direction: "inbound",
			message: "Здравствуйте! Подтверждаю визит на завтра в 11:30 к доктору Смирновой.",
			createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
			status: "unread",
			deliveryStatus: "delivered",
			sender: "patient",
		},
		{
			id: "ev-1-ack",
			patientId: "pat-101",
			patientName: "Барабаш Сергей Владимирович",
			patientPhone: "+7 (916) 123-45-67",
			channel: "whatsapp",
			direction: "outbound",
			message: "Отлично, Сергей Владимирович! Будем ждать вас. Пожалуйста, подойдите за 5 минут до начала приёма.",
			createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
			status: "delivered",
			deliveryStatus: "delivered",
			sender: "clinic",
		},
		{
			id: "ev-2",
			patientId: "pat-102",
			patientName: "Смирнова Елена Александровна",
			patientPhone: "+7 (926) 987-65-43",
			channel: "telegram",
			direction: "outbound",
			message: "Здравствуйте, Елена! Памятка после местной анестезии: воздержитесь от горячей пищи 2 часа.",
			createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
			status: "read",
			deliveryStatus: "delivered",
			sender: "clinic",
		},
		{
			id: "ev-3",
			patientId: "pat-103",
			patientName: "Ковалев Дмитрий Игоревич",
			patientPhone: "+7 (903) 555-44-33",
			channel: "sms",
			direction: "inbound",
			message: "Подскажите, готова ли справка для налогового вычета за прошлый год?",
			createdAt: new Date(Date.now() - 240 * 60000).toISOString(),
			status: "unread",
			deliveryStatus: "delivered",
			sender: "patient",
		},
		{
			id: "ev-4",
			patientId: "pat-104",
			patientName: "Морозова Анна Михайловна",
			patientPhone: "+7 (985) 222-11-00",
			channel: "whatsapp",
			direction: "outbound",
			message: "Анна, добрый день! Ваша коронка поступила из ЗТЛ и готова к постоянной фиксации.",
			createdAt: new Date(Date.now() - 480 * 60000).toISOString(),
			status: "read",
			deliveryStatus: "delivered",
			sender: "clinic",
		},
	],
	communicationTasks: [
		{
			id: "task-1",
			patientId: "pat-101",
			patientName: "Барабаш Сергей Владимирович",
			channel: "whatsapp",
			intent: "appointment_confirmation",
			priority: "urgent",
			status: "pending",
			dueDate: new Date().toISOString(),
			assigneeRole: "admin",
			assigneeStaffId: "staff-1",
			metadata: { note: "Подтвердить время визита на гигиену" },
		},
		{
			id: "task-2",
			patientId: "pat-103",
			patientName: "Ковалев Дмитрий Игоревич",
			channel: "sms",
			intent: "document_ready",
			priority: "normal",
			status: "pending",
			dueDate: new Date().toISOString(),
			assigneeRole: "admin",
			assigneeStaffId: "staff-1",
			metadata: { note: "Выдать справку КНД 1151156 на ресепшн" },
		},
	],
	appointments: [],
	clinicSettings: {
		profile: {
			clinicName: "Клиника DENTE",
			address: "г. Москва, ул. Арбат, 24",
			phone: "+7 (495) 123-45-67",
			timezone: "Europe/Moscow",
			mode: "small_clinic",
			organizationId: "org-1",
			inn: "7701234567",
			defaultVisitMinutes: 30,
		},
		staff: [],
		chairs: [],
	},
	todayIso: new Date().toISOString().split("T")[0]!,
} as any;

function MobileCommunicationsPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const rawTheme = (params.get("theme") || "light") as any;

	useEffect(() => {
		const updateTheme = () => {
			const currentTheme = (document.documentElement.getAttribute("data-theme") || rawTheme) as any;
			const resolved = resolveTheme(currentTheme, false);
			applyThemeToRoot(document.documentElement, resolved);
			const isDark = currentTheme === "dark";
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.documentElement.setAttribute("data-theme", currentTheme);
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";
			document.body.className = `theme-${resolved.theme} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen`;
		};
		updateTheme();
		const observer = new MutationObserver(updateTheme);
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
		return () => observer.disconnect();
	}, [rawTheme]);

	const initialPatient = params.get("chat") === "1" ? "pat-101" : null;

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
			<MobileCommunicationsMessenger
				dashboard={PREVIEW_DASHBOARD}
				initialPatientId={initialPatient}
				onGoToSchedule={() => {}}
			/>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(<MobileCommunicationsPreviewApp />);
}
