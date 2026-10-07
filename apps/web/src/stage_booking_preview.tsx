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

import { QuickBookingDrawer } from "./components/schedule/QuickBookingDrawer";
import type { QuickBookingSlotInfo } from "./components/schedule/QuickBookingDrawerTypes";
import { applyThemeToRoot, type ThemeMode } from "./lib/themeClasses";

const mockPatients = [
	{
		id: "demo-patient-volkov",
		fullName: "Волков Сергей Николаевич",
		phone: "+7 (916) 111-22-33",
		birthDate: "1988-04-12",
		balanceRub: 0,
		status: "active",
	},
	{
		id: "demo-patient-morozova",
		fullName: "Морозова Елена Викторовна",
		phone: "+7 (926) 444-55-66",
		birthDate: "1994-09-25",
		balanceRub: -2500,
		status: "active",
	},
];

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
		profile: {
			mode: "clinic",
			timezone: "Europe/Moscow",
		},
	},
	patients: mockPatients,
	appointments: [],
};

const mockStageSlot: QuickBookingSlotInfo = {
	dateKey: "2026-10-15",
	startTime: "11:00",
	startsAt: "2026-10-15T11:00:00",
	doctorUserId: "doc-smirnov",
	doctorName: "Д-р Смирнов А.П.",
	chairId: "chair-1",
	patientId: "demo-patient-volkov",
	patientName: "Волков Сергей Николаевич",
	treatmentPlanId: "PLAN-2026-VOLKOV",
	planId: "PLAN-2026-VOLKOV",
	stageId: "stage_2_therapy",
	stageNumber: 2,
	stageTitle: "Терапевтический этап: санация и эстетическая реставрация",
	estimatedDurationMinutes: 60,
	durationMinutes: 60,
	services: [
		{
			id: "srv-1",
			code804n: "A16.07.002",
			title: "Восстановление зуба пломбой (глубокий кариес)",
			toothNumber: 16,
			priceRub: 4500,
			quantity: 1,
		},
		{
			id: "srv-2",
			code804n: "A16.07.008",
			title: "Пломбирование корневого канала зуба",
			toothNumber: 16,
			priceRub: 3200,
			quantity: 1,
		},
		{
			id: "srv-3",
			code804n: "A16.07.025",
			title: "Избирательное пришлифовывание твердых тканей зуба",
			toothNumber: 16,
			priceRub: 1200,
			quantity: 1,
		},
	],
};

function PreviewApp() {
	const [theme, setTheme] = useState<ThemeMode>("light");
	const [isOpen, setIsOpen] = useState(true);

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const initialTheme = (params.get("theme") as ThemeMode) || "light";
		setTheme(initialTheme);
		applyThemeToRoot(initialTheme);
	}, []);

	return (
		<div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] p-8">
			<div className="max-w-4xl mx-auto space-y-4">
				<div className="flex items-center justify-between p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
					<h1 className="text-lg font-bold">
						Сквозная связка: Этап плана лечения ➔ Запись в расписание (DentalPRO Parity)
					</h1>
					<button
						type="button"
						onClick={() => setIsOpen(true)}
						className="px-4 py-2 rounded-xl bg-[var(--teal)] text-white font-semibold text-sm cursor-pointer shadow-sm"
					>
						Открыть быструю запись
					</button>
				</div>
			</div>

			<QuickBookingDrawer
				isOpen={isOpen}
				onClose={() => setIsOpen(false)}
				initialSlot={mockStageSlot}
				dashboard={mockDashboard as any}
				chairDoctorAssignments={{
					"chair-1": {
						chairId: "chair-1",
						doctorId: "doc-smirnov",
						doctorName: "Д-р Смирнов А.П.",
						shiftStart: "09:00",
						shiftEnd: "15:00",
						role: "doctor",
					},
				}}
			/>
		</div>
	);
}

const rootElement = document.getElementById("root");
if (rootElement) {
	ReactDOM.createRoot(rootElement).render(<PreviewApp />);
}
