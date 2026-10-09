/**
 * constants.ts — Layer 0: Константы, метки и чистые утилиты форматирования
 */

import { actionFailureToast } from "../../../lib/panelStateText";
import { showToast } from "../../GlobalToast";

export const channelLabels: Record<string, string> = {
	sms: "SMS",
	email: "Почта",
	whatsapp: "WhatsApp",
	telegram: "Телеграм",
	vk: "ВКонтакте",
	max: "MAX",
	phone: "Звонок",
	in_person: "В кабинете",
};

export const intentLabels: Record<string, string> = {
	appointment_confirmation: "Подтверждение приёма",
	payment_reminder: "Напоминание об оплате",
	post_visit_instruction: "Памятка после приёма",
	recall: "Повторный визит",
	document_ready: "Документ готов",
	imaging_review: "Снимок",
	general: "Произвольное",
};

/**
 * Подписи статусов очереди. `suppressed` намеренно отделён от `failed`: это не
 * «шлюз отклонил», а «отправлять было нечем или некому», и действие
 * администратора здесь другое.
 */
export const statusLabels: Record<string, string> = {
	queued: "В очереди",
	sending: "Отправляется",
	sent: "Отправлено",
	delivered: "Доставлено",
	failed: "Ошибка",
	cancelled: "Отменено",
	suppressed: "Не отправлено",
};

/** Вид состояния. Цвет дублируется значком: он читается и без цветовосприятия. */
export const statusTone: Record<string, "ok" | "warn" | "bad" | "info" | "muted"> = {
	queued: "info",
	sending: "info",
	sent: "info",
	delivered: "ok",
	failed: "bad",
	cancelled: "muted",
	suppressed: "warn",
};

export function minutesToTime(minutes: number): string {
	const hours = Math.floor(minutes / 60) % 24;
	const rest = minutes % 60;
	return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function timeToMinutes(value: string): number | null {
	const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
	if (!match) return null;
	const hours = Number.parseInt(match[1] ?? "", 10);
	const minutes = Number.parseInt(match[2] ?? "", 10);
	if (
		!Number.isFinite(hours) ||
		!Number.isFinite(minutes) ||
		hours > 23 ||
		minutes > 59
	)
		return null;
	return hours * 60 + minutes;
}

export async function readJson<T>(response: Response): Promise<T> {
	const payload = (await response.json().catch((err) => {
		showToast(
			actionFailureToast(
				"Ошибка ответа сервера",
				(err as { status?: number })?.status ?? null,
			),
			"error",
		);
		return null;
	})) as unknown;
	if (!response.ok) {
		const message =
			payload &&
			typeof payload === "object" &&
			"message" in payload &&
			typeof payload.message === "string"
				? payload.message
				: `Сервер ответил ${response.status}`;
		throw new Error(message);
	}
	return payload as T;
}
