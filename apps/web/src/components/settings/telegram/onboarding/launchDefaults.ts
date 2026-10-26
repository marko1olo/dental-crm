import type { BotLeadItem } from "./types";

export const DEFAULT_LEADS: BotLeadItem[] = [
	{
		id: "lead-1",
		patientName: "Волкова Екатерина С.",
		phone: "+7 (916) 432-88-19",
		action: "Онлайн-запись к терапевту",
		detail: "Завтра 14:00 (Смирнова Е.А.)",
		status: "success",
		statusLabel: "Записана",
		time: "5 минут назад",
	},
	{
		id: "lead-2",
		patientName: "Михайлов Денис В.",
		phone: "+7 (925) 880-12-40",
		action: "Напоминание за 24 часа",
		detail: "Визит подтвержден пациентом",
		status: "confirmed",
		statusLabel: "Подтвердил",
		time: "24 минуты назад",
	},
	{
		id: "lead-3",
		patientName: "Соколова Ольга М.",
		phone: "+7 (903) 119-45-77",
		action: "Отзыв после профгигиены",
		detail: "Переход на Яндекс.Карты (5 звезд)",
		status: "review",
		statusLabel: "Оценка 5.0",
		time: "1 час назад",
	},
];
