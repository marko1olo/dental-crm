/**
 * DENTE Dental CRM — Leads Kanban Types, Constants & Booking Autonomy Helpers
 *
 * Mandate 8e (Doctor Autonomy) & Mandate 8n (Solo Doctor & Small Clinic Scale Sovereignty)
 */

import React from "react";
import {
	CalendarClock,
	Handshake,
	Phone,
	Plus,
	Trash2,
	UserCheck,
} from "lucide-react";
import type { Lead, LeadStatus } from "../../store/leadsStore";
export type { Lead, LeadStatus };

export type BookableDoctor = {
	id: string;
	fullName?: string;
	name?: string;
	role?: string;
	active?: boolean;
};

export type BookableChair = { id: string; name: string };

export const FALLBACK_SOLO_DOCTOR: BookableDoctor = {
	id: "default-doctor",
	fullName: "Дежурный врач (соло-практика)",
	name: "Дежурный врач (соло-практика)",
	role: "doctor",
	active: true,
};

export const FALLBACK_DEFAULT_CHAIR: BookableChair = {
	id: "default-chair",
	name: "Кресло №1 (Основное)",
};

export const DEFAULT_LEAD_VISIT_MINUTES = 30;

/**
 * Разрешает список доступных врачей для записи лида.
 * Если список врачей пуст (соло-практика или начальная настройка клиники),
 * возвращает дежурного врача-одиночку согласно Мандатам 8e и 8n.
 */
export function resolveLeadBookingStaff(
	staff: BookableDoctor[] | null | undefined,
): BookableDoctor[] {
	return staff && staff.length > 0 ? staff : [FALLBACK_SOLO_DOCTOR];
}

/**
 * Разрешает список доступных кресел для записи лида.
 * Если список кресел пуст, возвращает основное кресло согласно Мандатам 8e и 8n.
 */
export function resolveLeadBookingChairs(
	chairs: BookableChair[] | null | undefined,
): BookableChair[] {
	return chairs && chairs.length > 0 ? chairs : [FALLBACK_DEFAULT_CHAIR];
}

/**
 * Разрешает длительность приема для записи лида.
 * Если профиль клиники еще не загружен или defaultVisitMinutes не задан,
 * возвращает дефолтное значение 30 минут согласно Мандатам 8e и 8n.
 */
export function resolveLeadVisitMinutes(
	visitMinutes: number | null | undefined,
): number {
	return visitMinutes && visitMinutes > 0
		? visitMinutes
		: DEFAULT_LEAD_VISIT_MINUTES;
}

/**
 * Проверяет, заблокирована ли кнопка создания записи из лида.
 * Согласно Мандатам 8e и 8n, отсутствие врачей или кресел в базе клиники НЕ должно
 * блокировать конвертацию лида (применяются умные дефолты соло-практики).
 * Блокировка допустима только во время активного запроса бронирования (isBooking).
 */
export function isLeadBookingDisabled(isBooking: boolean): boolean {
	return isBooking;
}

/**
 * Причина отказа сервера человеческими словами.
 */
export async function bookingFailureMessage(response: Response): Promise<string> {
	let payload: { error?: unknown; message?: unknown } = {};
	try {
		payload = (await response.json()) as typeof payload;
	} catch {
		// Тело не разобралось — остаётся код ответа
	}
	if (
		typeof payload.message === "string" &&
		payload.message.trim() &&
		payload.message !== "Internal Server Error"
	) {
		return payload.message;
	}
	const code = typeof payload.error === "string" ? payload.error : "";
	if (code === "DoctorNotFound") {
		return "Выбранный врач больше не работает в клинике: выберите другого в списке.";
	}
	if (code === "ChairNotFound") {
		return "Выбранное кресло удалено из настроек клиники: выберите другое.";
	}
	if (code === "Lead not found" || response.status === 404) {
		return "Обращение уже удалено или записано кем-то другим: обновите доску.";
	}
	if (response.status === 401 || response.status === 403) {
		return "Нет прав на запись пациентов: войдите под сотрудником с доступом к расписанию.";
	}
	return `Запись не создана, сервер ответил кодом ${response.status}. Обращение осталось в прежнем столбце.`;
}

export const COLUMNS: {
	id: LeadStatus;
	label: string;
	color: string;
	icon: React.ReactNode;
}[] = [
	{
		id: "new",
		label: "1. Новые",
		color: "rgba(59, 130, 246, 0.2)",
		icon: React.createElement(Plus, { size: 16 }),
	},
	{
		id: "contacted",
		label: "2. В работе",
		color: "rgba(245, 158, 11, 0.2)",
		icon: React.createElement(Phone, { size: 16 }),
	},
	{
		id: "consult_booked",
		label: "3. Записаны",
		color: "rgba(16, 185, 129, 0.2)",
		icon: React.createElement(CalendarClock, { size: 16 }),
	},
	{
		id: "showed_up",
		label: "4. Дошли до клиники",
		color: "rgba(139, 92, 246, 0.2)",
		icon: React.createElement(UserCheck, { size: 16 }),
	},
	{
		id: "no_answer",
		label: "Недозвон",
		color: "rgba(107, 114, 128, 0.2)",
		icon: React.createElement(Handshake, { size: 16 }),
	},
	{
		id: "trash",
		label: "Отказ",
		color: "rgba(239, 68, 68, 0.2)",
		icon: React.createElement(Trash2, { size: 16 }),
	},
];

/** The 4 canonical active funnel stages for the primary clinic patient flow */
export const CORE_FUNNEL_COLUMNS = COLUMNS.slice(0, 4);

