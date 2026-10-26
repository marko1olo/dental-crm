/**
 * refusalMessages.ts — Клинические тексты отказов и локализованные сообщения (Мандат 8b <= 120 строк).
 */

import { type CtPlanningMarkup, ctPlanningMarkupIsEmpty } from "./types";

function serverMessageForOperator(body: unknown): string | null {
	if (!body || typeof body !== "object") return null;
	const message = (body as Record<string, unknown>).message;
	if (typeof message !== "string") return null;
	const trimmed = message.trim();
	if (!trimmed || !/[А-Яа-яЁё]/.test(trimmed)) return null;
	return trimmed;
}

export function ctPlanningSaveRefusalText(status: number | null, body: unknown): string {
	const fromServer = serverMessageForOperator(body);
	if (fromServer) return fromServer;
	if (status === null) {
		return "Разметка не сохранена — сервер не ответил. Проверьте связь с сервером клиники и нажмите «Сохранить разметку».";
	}
	if (status === 401 || status === 403) {
		return "Разметка не сохранена — рабочий кабинет не определён. Войдите в кабинет клиники заново.";
	}
	if (status === 404) {
		return "Разметка не сохранена — карточка пациента не найдена. Откройте снимок из карточки пациента.";
	}
	return "Разметка не сохранена — сервер не смог её записать. Повторите через минуту.";
}

export function ctPlanningLoadRefusalText(status: number | null, body: unknown): string {
	const fromServer = serverMessageForOperator(body);
	if (fromServer) return fromServer;
	if (status === null) {
		return "Сохранённую разметку не удалось прочитать — сервер не ответил. Проверьте связь с сервером.";
	}
	if (status === 401 || status === 403) {
		return "Сохранённую разметку не удалось прочитать — сессия истекла. Войдите заново.";
	}
	if (status === 404) {
		return "Сохранённую разметку не удалось прочитать — карточка пациента не найдена.";
	}
	return "Сохранённую разметку не удалось прочитать — сервер ответил ошибкой.";
}

export function pluralizeRu(n: number, one: string, few: string, many: string): string {
	const absN = Math.abs(Math.round(n));
	const mod10 = absN % 10;
	const mod100 = absN % 100;
	if (mod100 >= 11 && mod100 <= 19) return `${n} ${many}`;
	if (mod10 === 1) return `${n} ${one}`;
	if (mod10 >= 2 && mod10 <= 4) return `${n} ${few}`;
	return `${n} ${many}`;
}

export function ctPlanningRestoredLabel(markup: CtPlanningMarkup): string | null {
	if (ctPlanningMarkupIsEmpty(markup)) return null;
	const parts: string[] = [];
	if (markup.splinePoints.length > 0) {
		parts.push(`${pluralizeRu(markup.splinePoints.length, "точка", "точки", "точек")} дуги`);
	}
	if (markup.nervePoints.length > 0) {
		parts.push(`${pluralizeRu(markup.nervePoints.length, "точка", "точки", "точек")} канала`);
	}
	if (markup.implants.length > 0) {
		parts.push(pluralizeRu(markup.implants.length, "имплантат", "имплантата", "имплантатов"));
	}
	return `Разметка этого снимка восстановлена из базы: ${parts.join(", ")}.`;
}
