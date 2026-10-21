import type { ShiftArchetype, ShiftArchetypeId } from "./types";

/**
 * Standard shift archetypes compliant with Russian healthcare labor standards
 */
export const SHIFT_ARCHETYPES: Record<ShiftArchetypeId, ShiftArchetype> = {
	morning_shift: {
		id: "morning_shift",
		name: "Утренняя смена (6.0 ч)", shortName: "Утро",
		startTime: "08:30", endTime: "14:30",
		durationHours: 6.0, breakMinutes: 0,
		isNight: false, nightHours: 0, nightMultiplier: 1.0,
		color: "#0284c7", t13Code: "Я",
		description: "08:30–14:30 — Базовая утренняя смена врача (норма 33 ч/нед)",
	},
	evening_shift: {
		id: "evening_shift",
		name: "Вечерняя смена (6.0 ч)", shortName: "Вечер",
		startTime: "14:30", endTime: "20:30",
		durationHours: 6.0, breakMinutes: 0,
		isNight: false, nightHours: 0, nightMultiplier: 1.0,
		color: "#d97706", t13Code: "Я",
		description: "14:30–20:30 — Вторая смена приема пациентов",
	},
	saturday_shift: {
		id: "saturday_shift",
		name: "Субботняя смена (7.0 ч)", shortName: "Суббота",
		startTime: "09:00", endTime: "17:00",
		durationHours: 7.0, breakMinutes: 60,
		isNight: false, nightHours: 0, nightMultiplier: 1.0,
		color: "#7c3aed", t13Code: "Я",
		description: "09:00–17:00 (8 ч с обедом 1 час / 7.0 раб. часов)",
	},
	sunday_duty: {
		id: "sunday_duty",
		name: "Воскресное дежурство (6.0 ч)", shortName: "Дежурство",
		startTime: "10:00", endTime: "16:00",
		durationHours: 6.0, breakMinutes: 0,
		isNight: false, nightHours: 0, nightMultiplier: 1.0,
		color: "#0d9488", t13Code: "Я",
		description: "10:00–16:00 — Дежурный прием по острой боли и неотложной помощи",
	},
	night_duty: {
		id: "night_duty",
		name: "Ночное дежурство (12.0 ч / x1.2)", shortName: "Ночь",
		startTime: "20:00", endTime: "08:00",
		durationHours: 12.0, breakMinutes: 60,
		isNight: true, nightHours: 8.0, nightMultiplier: 1.2,
		color: "#334155", t13Code: "Н",
		description: "20:00–08:00 — Круглосуточная неотложная служба (ночная надбавка 20%)",
	},
	day_off: {
		id: "day_off",
		name: "Выходной день", shortName: "Выходной",
		startTime: "", endTime: "",
		durationHours: 0, breakMinutes: 0,
		isNight: false, nightHours: 0, nightMultiplier: 1.0,
		color: "#94a3b8", t13Code: "В",
		description: "Плановый выходной день по графику сменности",
	},
	sick_leave: {
		id: "sick_leave",
		name: "Листок нетрудоспособности", shortName: "Больничный",
		startTime: "", endTime: "",
		durationHours: 0, breakMinutes: 0,
		isNight: false, nightHours: 0, nightMultiplier: 1.0,
		color: "#ef4444", t13Code: "Б",
		description: "Временная нетрудоспособность (ЭЛН ФСС)",
	},
	vacation: {
		id: "vacation",
		name: "Ежегодный отпуск", shortName: "Отпуск",
		startTime: "", endTime: "",
		durationHours: 0, breakMinutes: 0,
		isNight: false, nightHours: 0, nightMultiplier: 1.0,
		color: "#10b981", t13Code: "ОТ",
		description: "Ежегодный основной оплачиваемый отпуск",
	},
};
