import { countLabel } from "../../lib/russianPlural.js";
import type { JournalDigest, JournalEntryLike } from "./journalDigestTypes.js";

export * from "./journalDigestTypes.js";
export * from "./journalEntryNotice.js";

const UNDELIVERED_STATUSES = new Set(["failed", "skipped"]);
const PENDING_STATUSES = new Set(["queued", "scheduled", "needs_call"]);

const EMPTY_TITLE = "В журнале пока нет записей";
const EMPTY_HINT =
	"Здесь появятся отправленные подтверждения и напоминания, ответы пациентов и отказы шлюза — " +
	"сразу после первой отправки в «Отправке сообщений» выше или после закрытия задачи связи.";
const FAILED_TITLE = "Журнал связи не прочитан: сервер ответил без списка событий";
const FAILED_HINT =
	"Не считайте, что сообщений не было. Обновите страницу; если строка осталась, сообщите администратору.";

export function summarizeJournal<TEntry extends JournalEntryLike = JournalEntryLike>(
	rawEvents: unknown,
): JournalDigest<TEntry> {
	if (!Array.isArray(rawEvents)) {
		return {
			phase: "failed", entries: [], total: 0, undelivered: 0, pending: 0,
			totalLabel: "нет данных", totalPillClass: "status-pill status-cancelled",
			undeliveredLabel: null, pendingLabel: null, title: FAILED_TITLE, hint: FAILED_HINT,
		};
	}

	const entries = rawEvents as readonly TEntry[];
	let undelivered = 0;
	let pending = 0;
	for (const entry of entries) {
		const status = typeof entry?.status === "string" ? entry.status : "";
		if (UNDELIVERED_STATUSES.has(status)) undelivered += 1;
		else if (PENDING_STATUSES.has(status)) pending += 1;
	}

	const total = entries.length;
	return {
		phase: total === 0 ? "empty" : "ready",
		entries, total, undelivered, pending,
		totalLabel: countLabel(total, "запись", "записи", "записей"),
		totalPillClass: undelivered > 0 ? "status-pill status-cancelled" : "status-pill status-confirmed",
		undeliveredLabel: undelivered > 0 ? countLabel(undelivered, "сообщение не дошло", "сообщения не дошли", "сообщений не дошло") : null,
		pendingLabel: pending > 0 ? countLabel(pending, "сообщение ещё не отправлено", "сообщения ещё не отправлены", "сообщений не дошло") : null,
		title: total === 0 ? EMPTY_TITLE : "",
		hint: total === 0 ? EMPTY_HINT : "",
	};
}
