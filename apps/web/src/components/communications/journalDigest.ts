/**
 * Журнал связи: что именно случилось с каждым сообщением и сколько из них НЕ
 * дошло до пациента.
 *
 * ЧТО БЫЛО СЛОМАНО. В правой колонке раздела «Связь» стоял список событий и
 * зелёная плашка с их общим числом (`status-pill status-confirmed`). Число было
 * ОДНО на всё: доставленное, переданное шлюзу без подтверждения, пропущенное и
 * упавшее с отказом попадали в один счётчик и рисовались одинаковыми строками.
 * Клиника, у которой из двенадцати сообщений три не ушли, видела спокойную
 * зелёную «12» — и ни одного признака, что три пациента ничего не получили.
 * Это ровно тот вред, который стоит пропущенного приёма: отказ отправки,
 * показанный как успех.
 *
 * Второе: `direction` события («inbound» — написал пациент, «outbound» —
 * отправила клиника) не выводился нигде. Ответ пациента и рассылку клиники в
 * журнале было не отличить, хотя рабочий день администратора состоит в том
 * числе из «ответить на входящее».
 *
 * Третье: `status: "sent"` подписывался словарём как «отправлено». Для шлюза
 * это значит «сообщение принято к отправке», подтверждения доставки нет. Слово
 * «отправлено» администратор читает как «дошло».
 *
 * ПОЧЕМУ ОТДЕЛЬНЫЙ МОДУЛЬ, А НЕ УСЛОВИЯ В РАЗМЕТКЕ. Здесь нет ни React, ни
 * fetch, ни стилей — значит «что покажем, когда три сообщения упали» и «что
 * покажем, когда список не прочитан» проверяются обычным node:test, а не
 * глазами по скриншоту. Тот же приём, что в deliveryReportNotice.ts рядом.
 *
 * Согласование числа с существительным берётся у общей countLabel, второго
 * владельца этого правила в проекте быть не должно.
 */

import { countLabel } from "../../lib/russianPlural.js";

/**
 * Событие журнала в том виде, в каком его читает разметка. Поля объявлены
 * `unknown`, потому что ответ `/api/dashboard` на клиенте не проверяется схемой,
 * а приводится: `(await response.json()) as Dashboard`. Значит в рантайме здесь
 * может оказаться что угодно, включая отсутствующее поле.
 */
export type JournalEntryLike = {
	readonly direction?: unknown;
	readonly status?: unknown;
};

/** «Не дошло»: пациент не получил ничего и нужно действие человека. */
const UNDELIVERED_STATUSES = new Set(["failed", "skipped"]);

/** «Ещё в работе»: отправка не состоялась, но и не провалилась. */
const PENDING_STATUSES = new Set(["queued", "scheduled", "needs_call"]);

export type JournalPhase = "failed" | "empty" | "ready";

/**
 * Параметр типа нужен только разметке: она рисует по событию ещё и канал, текст
 * и дату, а этому модулю от события нужны лишь направление и статус. Так список
 * не приходится приводить обратно на месте отрисовки.
 */
export type JournalDigest<TEntry extends JournalEntryLike = JournalEntryLike> =
	{
		/**
		 * Три РАЗНЫХ состояния, которые раньше сливались в одно пустое место:
		 * `failed` — списка в ответе сервера не было вовсе;
		 * `empty` — сервер ответил, событий действительно ноль;
		 * `ready` — есть что показывать.
		 */
		readonly phase: JournalPhase;
		readonly entries: readonly TEntry[];
		readonly total: number;
		readonly undelivered: number;
		readonly pending: number;
		/** Подпись плашки с общим числом, уже согласованная: «12 записей». */
		readonly totalLabel: string;
		/**
		 * Плашка перестаёт быть зелёной, как только в журнале есть недоставленное:
		 * цвет — это первое, что читают, и он не должен обещать успех.
		 */
		readonly totalPillClass: string;
		/** Красная строка с числом недоставленных, либо `null`, если всё дошло. */
		readonly undeliveredLabel: string | null;
		/** Сколько ещё в очереди — это не отказ, но и не доставка. */
		readonly pendingLabel: string | null;
		/** Заголовок для состояний `failed` и `empty`; для `ready` — пустая строка. */
		readonly title: string;
		/** Что делать дальше. Пустота и отказ без подсказки — тупик. */
		readonly hint: string;
	};

const EMPTY_TITLE = "В журнале пока нет записей";

const EMPTY_HINT =
	"Здесь появятся отправленные подтверждения и напоминания, ответы пациентов и отказы шлюза — " +
	"сразу после первой отправки в «Отправке сообщений» выше или после закрытия задачи связи.";

/**
 * Причина названа по существу и без кода ответа: сервер ответил, но списка в
 * ответе не было. Придумывать причину, которой сервер не сообщал, нельзя,
 * поэтому здесь не «сервер недоступен» и не «нет прав».
 */
const FAILED_TITLE =
	"Журнал связи не прочитан: сервер ответил без списка событий";

const FAILED_HINT =
	"Не считайте, что сообщений не было. Обновите страницу; если строка осталась, сообщите администратору.";

/**
 * Разбор журнала. На входе — сырое значение поля `communicationEvents`, потому
 * что отличить «сервер не отдал список» от «список пуст» можно только до
 * подстановки `?? []`. Прежняя разметка делала эту подстановку первой строкой и
 * теряла различие навсегда.
 */
export function summarizeJournal<
	TEntry extends JournalEntryLike = JournalEntryLike,
>(rawEvents: unknown): JournalDigest<TEntry> {
	if (!Array.isArray(rawEvents)) {
		return {
			phase: "failed",
			entries: [],
			total: 0,
			undelivered: 0,
			pending: 0,
			totalLabel: "нет данных",
			totalPillClass: "status-pill status-cancelled",
			undeliveredLabel: null,
			pendingLabel: null,
			title: FAILED_TITLE,
			hint: FAILED_HINT,
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
		entries,
		total,
		undelivered,
		pending,
		totalLabel: countLabel(total, "запись", "записи", "записей"),
		totalPillClass:
			undelivered > 0
				? "status-pill status-cancelled"
				: "status-pill status-confirmed",
		undeliveredLabel:
			undelivered > 0
				? countLabel(
						undelivered,
						"сообщение не дошло",
						"сообщения не дошли",
						"сообщений не дошло",
					)
				: null,
		pendingLabel:
			pending > 0
				? countLabel(
						pending,
						"сообщение ещё не отправлено",
						"сообщения ещё не отправлены",
						"сообщений ещё не отправлено",
					)
				: null,
		title: total === 0 ? EMPTY_TITLE : "",
		hint: total === 0 ? EMPTY_HINT : "",
	};
}

/** Кто кому: без этого ответ пациента и рассылку клиники не отличить. */
export function journalDirectionLabel(direction: unknown): string {
	if (direction === "inbound") return "Пациент написал";
	if (direction === "outbound") return "Клиника отправила";
	return "Направление не указано";
}

/**
 * Строка предупреждения под событием — только там, где словарь статусов
 * недостаточен или прямо вводит в заблуждение. У доставленного события никакой
 * лишней строки нет: шум обесценивает предупреждение.
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
		// «Отправлено» из словаря статусов человек читает как «дошло». Шлюз этого
		// не подтверждал: он лишь принял сообщение.
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
