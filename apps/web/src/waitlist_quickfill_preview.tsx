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

import { WaitlistQuickFillModal } from "./components/schedule/WaitlistQuickFillModal";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";
import type { TargetSlotInfo } from "./components/schedule/waitlistCancellationEngine";

const mockTargetSlot: TargetSlotInfo = {
	appointmentId: "appt-freed-1",
	startsAt: "2026-10-15T10:00:00.000Z",
	endsAt: "2026-10-15T10:30:00.000Z",
	doctorUserId: "doc-smirnov",
	doctorName: "Д-р Смирнов А.П.",
	chairId: "chair-1",
	chairName: "Кабинет 1 (Терапия)",
	treatmentCategory: "Терапия",
	freedBecause: "Отмена пациентом за 2 часа (Освободилось окно)",
};

const mockDashboard = {
	clinicSettings: {
		name: "Клиника DENTE",
		chairs: [
			{ id: "chair-1", name: "Кабинет 1 (Терапия)", active: true },
			{ id: "chair-2", name: "Кабинет 2 (Хирургия)", active: true },
		],
		staff: [
			{ id: "doc-smirnov", name: "Д-р Смирнов А.П.", fullName: "Смирнов Алексей Петрович", role: "doctor", active: true },
			{ id: "doc-ivanova", name: "Д-р Иванова Е.В.", fullName: "Иванова Елена Васильевна", role: "doctor", active: true },
		],
	},
	patients: [
		{ id: "demo-patient-volkov", fullName: "Волков Сергей Николаевич", phone: "+7 (916) 111-22-33" },
		{ id: "demo-patient-morozova", fullName: "Морозова Елена Викторовна", phone: "+7 (926) 444-55-66" },
	],
	appointments: [],
};

import { DEMO_SHOWCASE_WAITLIST_ENTRIES } from "./components/schedule/waitlistMatchScoring";

// Mock fetch for /api/waitlist in standalone preview
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
	const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
	if (url.includes("/api/waitlist")) {
		return new Response(JSON.stringify(DEMO_SHOWCASE_WAITLIST_ENTRIES), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	}
	return originalFetch(input, init);
};

function WaitlistQuickFillPreviewApp() {
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
					DENTE Dental CRM — Лист ожидания и подбор на окно расписания
				</h1>
				<p className="text-xs text-[var(--muted)]">
					Тема: {rawTheme.toUpperCase()} | Интеллектуальный скоринг совпадения | Автономия врача
				</p>
			</div>

			<WaitlistQuickFillModal
				isOpen={isOpen}
				onClose={() => setIsOpen(false)}
				targetSlot={mockTargetSlot}
				dashboard={mockDashboard}
			/>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(<WaitlistQuickFillPreviewApp />);
}
