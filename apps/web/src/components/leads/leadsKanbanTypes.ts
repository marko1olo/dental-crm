/**
 * DENTE Dental CRM — Leads Kanban Types, Constants & Booking Autonomy Helpers
 *
 * Mandate 8e (Doctor Autonomy), Mandate 8n (Solo Doctor & Small Clinic Scale Sovereignty),
 * and Clinical SLA / Speed-to-Lead Workstation Specification
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

export type ColumnConfig = {
	id: LeadStatus;
	label: string;
	color: string;
	icon: React.ReactNode;
};

export const COLUMNS: readonly [
	ColumnConfig,
	ColumnConfig,
	ColumnConfig,
	ColumnConfig,
] = [
	{
		id: "new",
		label: "1. Новое обращение",
		color: "var(--teal-soft)",
		icon: React.createElement(Plus, { size: 15 }),
	},
	{
		id: "contacted",
		label: "2. Звонок / Квалификация",
		color: "var(--amber-soft)",
		icon: React.createElement(Phone, { size: 15 }),
	},
	{
		id: "consult_booked",
		label: "3. Записан на приём",
		color: "var(--teal-soft)",
		icon: React.createElement(CalendarClock, { size: 15 }),
	},
	{
		id: "trash",
		label: "4. Архив / Нецелевой",
		color: "var(--paper)",
		icon: React.createElement(Trash2, { size: 15 }),
	},
];

/**
 * Проверяет принадлежность статуса лида к одной из 4 канонических колонок канбана.
 * Обратная совместимость для существующих статусов в БД:
 * - new -> new ("1. Новое обращение")
 * - contacted -> contacted ("2. Звонок / Квалификация")
 * - consult_booked, showed_up, converted -> consult_booked ("3. Записан на приём")
 * - trash, no_answer -> trash ("4. Архив / Нецелевой")
 */
export function isLeadInKanbanColumn(
	leadStatus: LeadStatus | string | null | undefined,
	columnId: LeadStatus,
): boolean {
	if (!leadStatus || leadStatus === "new") {
		return columnId === "new";
	}
	if (leadStatus === "contacted") {
		return columnId === "contacted";
	}
	if (
		leadStatus === "consult_booked" ||
		leadStatus === "showed_up" ||
		leadStatus === "converted"
	) {
		return columnId === "consult_booked";
	}
	if (leadStatus === "trash" || leadStatus === "no_answer") {
		return columnId === "trash";
	}
	return leadStatus === columnId;
}

/**
 * Возвращает конфигурацию канонической колонки для любого статуса лида
 */
export function getKanbanColumnForLeadStatus(
	status?: LeadStatus | string | null,
): ColumnConfig {
	if (!status || status === "new") {
		return COLUMNS[0];
	}
	if (status === "contacted") {
		return COLUMNS[1];
	}
	if (
		status === "consult_booked" ||
		status === "showed_up" ||
		status === "converted"
	) {
		return COLUMNS[2];
	}
	return COLUMNS[3];
}

export const STAGE_DISPLAY_LABELS: Record<LeadStatus, string> = {
	new: "«1. Новое обращение»",
	contacted: "«2. Звонок / Квалификация»",
	consult_booked: "«3. Записан на приём»",
	showed_up: "«3. Записан на приём»",
	converted: "«3. Записан на приём»",
	no_answer: "«4. Архив / Нецелевой»",
	trash: "«4. Архив / Нецелевой»",
};

/** The 4 canonical active funnel stages for the primary clinic patient flow */
export const CORE_FUNNEL_COLUMNS = COLUMNS;

/**
 * 1-клик перевод на следующий этап канонической воронки (SSOT)
 */
export const NEXT_STAGE_MAP: Partial<
	Record<LeadStatus, { status: LeadStatus; label: string }>
> = {
	new: { status: "contacted", label: "Звонок / Квалификация →" },
	contacted: { status: "consult_booked", label: "Записать на приём →" },
	consult_booked: { status: "trash", label: "В архив →" },
	showed_up: { status: "trash", label: "В архив →" },
	converted: { status: "trash", label: "В архив →" },
	no_answer: { status: "new", label: "Восстановить обращение →" },
	trash: { status: "new", label: "Восстановить обращение →" },
};

/* -------------------------------------------------------------------------- */
/* SPEED-TO-LEAD SLA & TIMERS LOGIC                                            */
/* -------------------------------------------------------------------------- */

export type LeadSlaUrgency = "fresh" | "warning" | "breached";

export interface LeadSlaInfo {
	urgency: LeadSlaUrgency;
	minutesElapsed: number;
	label: string;
	badgeColor: string;
	badgeBg: string;
	badgeBorder: string;
	isBreached: boolean;
	formattedDuration: string;
}

/**
 * Рассчитывает статус регламента ответа (Speed-to-Lead SLA).
 * - Для горячих обращений («Новые», status === "new"):
 *   * < 5 мин: Зеленый ("Свежий")
 *   * 5–15 мин: Янтарный ("Внимание")
 *   * >= 15 мин: Коралловый пульсирующий ("SLA просрочен (> 15м)") — Mandate 8n!
 * - Для остальных этапов:
 *   * < 15 мин: Зеленый ("Свежий")
 *   * 15–60 мин: Янтарный ("Внимание")
 *   * >= 60 мин: Коралловый пульсирующий ("SLA просрочен")
 */
export function getLeadSlaStatus(
	lead: {
		status?: LeadStatus | string | null | undefined;
		createdAt?: string | Date | null | undefined;
		stageEnteredAt?: string | Date | null | undefined;
	},
	now?: Date,
): LeadSlaInfo {
	const rawDate = lead.stageEnteredAt || lead.createdAt;
	const refTime = rawDate ? new Date(rawDate).getTime() : NaN;
	const currentTime = now ? now.getTime() : Date.now();

	if (Number.isNaN(refTime) || refTime <= 0) {
		return {
			urgency: "fresh",
			minutesElapsed: 0,
			label: "Свежий (< 15м)",
			badgeColor: "var(--ok-fg)",
			badgeBg: "var(--ok-bg)",
			badgeBorder: "var(--line)",
			isBreached: false,
			formattedDuration: "< 1м",
		};
	}

	const diffMs = Math.max(0, currentTime - refTime);
	const minutesElapsed = Math.floor(diffMs / 60000);

	// Режим горячего входящего лида (статус «Новые»)
	if (lead.status === "new") {
		if (minutesElapsed < 5) {
			const dur = minutesElapsed > 0 ? `${minutesElapsed}м` : "< 1м";
			return {
				urgency: "fresh",
				minutesElapsed,
				label: `Свежий (${dur})`,
				badgeColor: "var(--ok-fg)",
				badgeBg: "var(--ok-bg)",
				badgeBorder: "var(--line)",
				isBreached: false,
				formattedDuration: dur,
			};
		}

		if (minutesElapsed < 15) {
			const dur = `${minutesElapsed}м`;
			return {
				urgency: "warning",
				minutesElapsed,
				label: `Внимание (${dur})`,
				badgeColor: "var(--amber-dark, var(--amber))",
				badgeBg: "var(--amber-soft)",
				badgeBorder: "var(--amber)",
				isBreached: false,
				formattedDuration: dur,
			};
		}

		const hours = Math.floor(minutesElapsed / 60);
		const remMins = minutesElapsed % 60;
		const timeStr =
			hours > 0
				? remMins > 0
					? `${hours}ч ${remMins}м`
					: `${hours}ч`
				: `${minutesElapsed}м`;

		return {
			urgency: "breached",
			minutesElapsed,
			label: `SLA просрочен (> 15м: +${timeStr})`,
			badgeColor: "var(--rust)",
			badgeBg: "var(--rust-soft)",
			badgeBorder: "var(--rust)",
			isBreached: true,
			formattedDuration: `+${timeStr}`,
		};
	}

	// Общий расчет (для этапов в работе или при опущенном статусе)
	if (minutesElapsed < 15) {
		const dur = minutesElapsed > 0 ? `${minutesElapsed}м` : "< 1м";
		return {
			urgency: "fresh",
			minutesElapsed,
			label: `Свежий (${dur})`,
			badgeColor: "var(--ok-fg)",
			badgeBg: "var(--ok-bg)",
			badgeBorder: "var(--line)",
			isBreached: false,
			formattedDuration: dur,
		};
	}

	if (minutesElapsed < 60) {
		const dur = `${minutesElapsed}м`;
		return {
			urgency: "warning",
			minutesElapsed,
			label: `Внимание (${dur})`,
			badgeColor: "var(--amber-dark, var(--amber))",
			badgeBg: "var(--amber-soft)",
			badgeBorder: "var(--amber)",
			isBreached: false,
			formattedDuration: dur,
		};
	}

	const hours = Math.floor(minutesElapsed / 60);
	const remMins = minutesElapsed % 60;
	const timeStr = remMins > 0 ? `${hours}ч ${remMins}м` : `${hours}ч`;

	return {
		urgency: "breached",
		minutesElapsed,
		label: `SLA просрочен (+${timeStr})`,
		badgeColor: "var(--rust)",
		badgeBg: "var(--rust-soft)",
		badgeBorder: "var(--rust)",
		isBreached: true,
		formattedDuration: `+${timeStr}`,
	};
}

/* -------------------------------------------------------------------------- */
/* LEAD SORTING & FILTERING                                                   */
/* -------------------------------------------------------------------------- */

export type LeadSortOption =
	| "sla_urgent"
	| "created_desc"
	| "created_asc"
	| "revenue_desc"
	| "name_asc";

export function sortLeads(
	leads: Lead[],
	sortOption: LeadSortOption,
	now?: Date,
): Lead[] {
	const cloned = [...leads];

	switch (sortOption) {
		case "sla_urgent":
			return cloned.sort((a, b) => {
				const slaA = getLeadSlaStatus(a, now);
				const slaB = getLeadSlaStatus(b, now);
				// Breached first, then by elapsed minutes descending
				if (slaA.isBreached !== slaB.isBreached) {
					return slaA.isBreached ? -1 : 1;
				}
				return slaB.minutesElapsed - slaA.minutesElapsed;
			});

		case "created_desc":
			return cloned.sort((a, b) => {
				const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
				const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
				return timeB - timeA;
			});

		case "created_asc":
			return cloned.sort((a, b) => {
				const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
				const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
				return timeA - timeB;
			});

		case "revenue_desc":
			return cloned.sort((a, b) => {
				const revA = Number(a.expectedRevenue) || 0;
				const revB = Number(b.expectedRevenue) || 0;
				return revB - revA;
			});

		case "name_asc":
			return cloned.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ru"));

		default:
			return cloned;
	}
}

/* -------------------------------------------------------------------------- */
/* AUDIO & DURATION FORMATTING                                                */
/* -------------------------------------------------------------------------- */

export function formatAudioDuration(seconds?: number | null): string {
	if (!seconds || Number.isNaN(seconds) || seconds <= 0) return "0:00";
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

/* -------------------------------------------------------------------------- */
/* CSV EXPORT FOR FOCUS WORKSPACE                                             */
/* -------------------------------------------------------------------------- */

export function exportLeadsToCsv(leads: Lead[], columnTitle?: string): string {
	const BOM = "\uFEFF";
	const header = [
		"ID",
		"Имя пациента",
		"Телефон",
		"Источник рекламы",
		"Статус",
		"Выручка (₽)",
		"Время ожидания (SLA)",
		"Примечания / Жалобы",
		"Клинические теги",
		"Запись звонка (URL)",
	].join(";");

	const rows = leads.map((lead) => {
		const sla = getLeadSlaStatus(lead);
		const tags = Array.isArray(lead.clinicalTags) ? lead.clinicalTags.join(", ") : "";
		const sanitize = (val: string | null | undefined) =>
			`"${(val || "").replace(/"/g, '""').replace(/[\r\n]+/g, " ")}"`;

		return [
			sanitize(lead.id),
			sanitize(lead.name),
			sanitize(lead.phone),
			sanitize(lead.source),
			sanitize(lead.status),
			lead.expectedRevenue ? Number(lead.expectedRevenue) : 0,
			sanitize(sla.label),
			sanitize(lead.notes),
			sanitize(tags),
			sanitize(lead.audioRecordUrl),
		].join(";");
	});

	const meta = columnTitle ? `# Выгрузка этапа: ${columnTitle}\n` : "";
	return BOM + meta + header + "\n" + rows.join("\n");
}
