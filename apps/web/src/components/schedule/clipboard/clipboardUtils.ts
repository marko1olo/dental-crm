import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import { actionFailureToast } from "../../../lib/panelStateText";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";

export function clipboardWriteHeaders(): Record<string, string> {
	return denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });
}

export function formatCopiedAt(iso: string): string {
	const parsed = new Date(iso);
	if (Number.isNaN(parsed.getTime())) return iso;
	return parsed.toLocaleString("ru-RU", {
		day: "numeric",
		month: "long",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function formatDuration(minutes: number): string {
	if (!Number.isFinite(minutes) || minutes <= 0) return "";
	if (minutes < 60) return `${minutes} мин`;
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	return rest > 0 ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

/** datetime-local value in local wall clock for the control. */
export function defaultPasteLocalValue(): string {
	const d = new Date();
	d.setMinutes(0, 0, 0);
	d.setHours(d.getHours() + 1);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convert datetime-local string to ISO with timezone offset. */
export function localValueToIso(localValue: string): string | null {
	if (!localValue?.trim()) return null;
	const parsed = new Date(localValue);
	if (Number.isNaN(parsed.getTime())) return null;
	return parsed.toISOString();
}

export function loadFailureText(status: number, serverMessage: string | null): string {
	if (serverMessage && /[а-яё]/i.test(serverMessage)) return serverMessage;
	if (status === 401 || status === 403) {
		return "Нет прав смотреть буфер расписания: доступ закрыт или истёк вход в программу.";
	}
	if (status === 404) return "Раздел буфера расписания не отвечает.";
	if (status >= 500) return "Сбой на сервере клиники: список буфера не собран.";
	return `Программа не смогла получить буфер расписания (ответ ${status}).`;
}

export async function writeFailureText(response: Response, action: string): Promise<string> {
	const body = await response.json().catch((err) => {
		logger.error("[Dente]", err);
		showToast(
			actionFailureToast(
				"Ответ сервера не прочитан",
				(err as { status?: number })?.status ?? null,
			),
			"error",
		);
		return null;
	});
	const serverMessage = body && typeof body.message === "string" ? body.message.trim() : "";
	if (serverMessage && /[а-яё]/i.test(serverMessage)) return serverMessage;
	if (response.status === 401 || response.status === 403) {
		return `Не удалось ${action}: нет прав. Введите секрет администратора расписания и повторите.`;
	}
	if (response.status === 404) {
		return `Не удалось ${action}: запись уже убрал кто-то другой. Обновите список.`;
	}
	if (response.status >= 500) {
		return `Не удалось ${action}: сервер клиники ответил отказом. Повторите, а если повторится — сообщите администратору.`;
	}
	return `Не удалось ${action}. Повторите, а если повторится — сообщите администратору.`;
}
