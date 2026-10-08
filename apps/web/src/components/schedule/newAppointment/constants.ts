import type { QuickAppointmentReasonPreset } from "./types";

export const DURATION_PRESETS = [15, 30, 45, 60, 90, 120] as const;

export const QUICK_APPOINTMENT_REASON_PRESETS: QuickAppointmentReasonPreset[] = [
	{
		id: "consultation",
		testId: "quick-reason-consultation",
		label: "Осмотр и консультация (30 мин)",
		reason: "Осмотр и консультация",
		durationMinutes: 30,
		iconName: "Stethoscope",
	},
	{
		id: "caries",
		testId: "quick-reason-caries",
		label: "Лечение кариеса (60 мин)",
		reason: "Лечение кариеса",
		durationMinutes: 60,
		iconName: "Check",
	},
	{
		id: "endo",
		testId: "quick-reason-endo",
		label: "Эндодонтия / пульпит (90 мин)",
		reason: "Эндодонтическое лечение",
		durationMinutes: 90,
		iconName: "Clock",
	},
	{
		id: "surgery",
		testId: "quick-reason-surgery",
		label: "Удаление зуба / хирургия (45 мин)",
		reason: "Хирургическое лечение / удаление зуба",
		durationMinutes: 45,
		iconName: "Sparkles",
	},
	{
		id: "hygiene",
		testId: "quick-reason-hygiene",
		label: "Профгигиена / Air-Flow (60 мин)",
		reason: "Профессиональная гигиена полости рта",
		durationMinutes: 60,
		iconName: "Sparkles",
	},
	{
		id: "emergency",
		testId: "quick-reason-emergency",
		label: "Срочная запись (Острая боль)",
		reason: "Срочно! Острая боль",
		durationMinutes: 30,
		iconName: "AlertTriangle",
		tone: "emergency",
	},
	{
		id: "orthopedics",
		testId: "quick-reason-orthopedics",
		label: "Ортопедия / примерка (45 мин)",
		reason: "Ортопедический приём / примерка",
		durationMinutes: 45,
		iconName: "Clock",
	},
];
