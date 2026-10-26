/**
 * TELEGRAM MINI APP BOOKING — CONSTANTS & CALENDAR HELPERS
 */

import React from "react";
import { Activity, Crown, ShieldCheck, Sparkles } from "lucide-react";
import type { CalendarDayItem, DoctorProfile, SpecialistCategory } from "./bookingTypes";

export const SPECIALIST_CATEGORIES: Array<{
	id: SpecialistCategory;
	title: string;
	subtitle: string;
	icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
	{ id: "therapist", title: "Терапевт", subtitle: "Кариес, пломбы, каналы", icon: Activity },
	{ id: "surgeon", title: "Хирург / Имплантолог", subtitle: "Удаление, имплантация", icon: Crown },
	{ id: "orthodontist", title: "Ортодонт", subtitle: "Прикус, брекеты, элайнеры", icon: Sparkles },
	{ id: "hygienist", title: "Гигиенист", subtitle: "Чистка Air-Flow, дёсны", icon: ShieldCheck },
];

export const DEFAULT_DOCTORS_LIST: DoctorProfile[] = [
	{ id: "doc-1", name: "Д-р Смирнов А.В.", specialty: "Стоматолог-терапевт, эндодонтист", category: "therapist", experience: "12 лет", initials: "СА", rating: 4.9 },
	{ id: "doc-2", name: "Д-р Ковалев Д.М.", specialty: "Хирург-имплантолог, ЧЛХ", category: "surgeon", experience: "16 лет", initials: "КД", rating: 5.0 },
	{ id: "doc-3", name: "Д-р Морозова Е.С.", specialty: "Врач-ортодонт, гнатолог", category: "orthodontist", experience: "9 лет", initials: "МЕ", rating: 4.8 },
	{ id: "doc-4", name: "Д-р Волкова К.Н.", specialty: "Пародонтолог, гигиенист", category: "hygienist", experience: "7 лет", initials: "ВК", rating: 4.9 },
];

export function generateCalendarDays(): CalendarDayItem[] {
	const daysRu = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
	const monthsRu = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
	const result: CalendarDayItem[] = [];
	const now = new Date();
	for (let i = 0; i < 7; i++) {
		const d = new Date(now);
		d.setDate(now.getDate() + i);
		result.push({
			index: i,
			dateString: d.toISOString().split("T")[0] || "",
			dayOfWeek: i === 0 ? "Сегодня" : i === 1 ? "Завтра" : (daysRu[d.getDay()] || "Пн"),
			dayNum: d.getDate(),
			month: monthsRu[d.getMonth()] || "янв",
		});
	}
	return result;
}
