import React from "react";
import { createRoot } from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/modules/patients.css";
import "./styles/patients-redesign.css";
import "./styles/premium.css";
import "./styles/dente-redesign.css";
import "./styles/modules/header.css";
import "./styles/modules/documents.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/overflow-fixes.css";
import "./styles/contrast-fixes.css";
import "./styles/dente-operations.css";
import "./styles/themes.css";
import "./styles/theme-overrides.css";
import "./theme.css";
import { AppLogicProvider } from "./contexts/AppLogicContext";
import { WaitlistQuickFillModal } from "./components/schedule/WaitlistQuickFillModal";
import type { TargetSlotInfo } from "./components/schedule/waitlistCancellationEngine";
import { DEMO_SHOWCASE_WAITLIST_ENTRIES } from "./components/schedule/waitlistMatchScoring";

// Setup theme based on URL query
const params = new URLSearchParams(window.location.search);
const themeMode = params.get("theme") || "light";
document.documentElement.setAttribute("data-theme", themeMode);
if (themeMode === "dark") {
	document.documentElement.classList.add("dark");
	document.documentElement.classList.remove("light");
} else {
	document.documentElement.classList.add("light");
	document.documentElement.classList.remove("dark");
}

const mockTargetSlot: TargetSlotInfo = {
	appointmentId: "demo-cancelled-slot-1",
	startsAt: "2026-10-14T11:00:00.000Z",
	endsAt: "2026-10-14T12:00:00.000Z",
	doctorUserId: "doc-1",
	doctorName: "Д-р Смирнов А. В.",
	chairId: "chair-1",
	chairName: "Кабинет 1 (Терапия)",
	freedBecause: "Пациент отменил визит за 2 часа (окно свободно)",
};

const mockDashboard = {
	clinicSettings: {
		name: "Клиника DENTE",
		staff: [
			{ id: "doc-1", fullName: "Д-р Смирнов А. В.", role: "doctor", active: true },
			{ id: "doc-2", fullName: "Д-р Ковалева Е. М.", role: "doctor", active: true },
		],
		chairs: [
			{ id: "chair-1", name: "Кабинет 1 (Терапия)", active: true },
			{ id: "chair-2", name: "Кабинет 2 (Хирургия)", active: true },
		],
	},
	patients: [
		{ id: "p-1", fullName: "Иванов Иван Иванович", phone: "+7 (999) 111-22-33" },
		{ id: "p-2", fullName: "Петрова Анна Сергеевна", phone: "+7 (999) 222-33-44" },
		{ id: "p-3", fullName: "Сидоров Алексей Петрович", phone: "+7 (999) 333-44-55" },
	],
	appointments: [],
};

const mockAuth = {
	denteClinicalReadHeaders: () => ({}),
};

function PreviewApp() {
	return (
		<AppLogicProvider value={{ dashboard: mockDashboard, auth: mockAuth } as any}>
			<div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center p-6">
				<WaitlistQuickFillModal
					isOpen={true}
					onClose={() => {}}
					targetSlot={mockTargetSlot}
					dashboard={mockDashboard}
					auth={mockAuth}
				/>
			</div>
		</AppLogicProvider>
	);
}

const container = document.getElementById("root");
if (container) {
	const root = createRoot(container);
	root.render(<PreviewApp />);
}
