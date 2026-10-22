import type { JournalEntryLike } from "./journalDigestTypes";

/** Кто кому: без этого ответ пациента и рассылку клиники не отличить. */
export function journalDirectionLabel(direction: unknown): string {
	if (direction === "inbound") return "Пациент написал";
	if (direction === "outbound") return "Клиника отправила";
	return "Направление не указано";
}

/**
 * Строка предупреждения под событием — только там, где словарь статусов
 * недостаточен или прямо вводит в заблуждение.
 */
export function journalEntryNotice(entry: JournalEntryLike): string | null {
	const status = typeof entry?.status === "string" ? entry.status : "";
	const isInbound = entry?.direction === "inbound";
	if (status === "failed") {
		return isInbound
			? "Входящее сообщение не принято — ответьте пациенту сами, по телефону."
			: "Пациент это не получил. Причина отказа и повторная отправка — в «Отправке сообщений», раздел «Журнал отправки».";
	}
	if (status === "skipped") {
		return "Отправка пропущена: сообщение не ушло. Проверьте, есть ли у пациента канал связи и согласие на рассылку.";
	}
	if (status === "sent") {
		return "Передано шлюзу, подтверждения доставки нет.";
	}
	if (status === "queued" || status === "scheduled") {
		return "Ещё не отправлено — сообщение ждёт в очереди отправки.";
	}
	if (status === "needs_call") {
		return "Нужен звонок: сообщением этот вопрос не закрыть.";
	}
	return null;
}
