/**
 * Разбор ответа сервера для истории зуба.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ МОДУЛЬ. Панель истории зуба доверяла ответу целиком:
 * `const data = await res.json(); setEvents(data.events || [])`. Тип элемента
 * при этом объявлен интерфейсом `ToothEvent`, то есть компилятор считал поля
 * прочитанными, хотя не проверялось ни одно. Тот же дефект в смете уже закрыт
 * разбором `planItemFromServer` (./treatmentEstimatorPricing.ts) — здесь тот же
 * приём, и здесь он проверяется node:test без React и без браузера.
 *
 * ЧТО ЛОМАЛОСЬ. `data.events || []` превращает ЛЮБОЙ неожиданный ответ в пустую
 * историю: и `{}` от чужого маршрута, и `{"events": null}`. Пустая история — это
 * утверждение о пациенте («с этим зубом ничего не делали»), и делать его по
 * непрочитанному ответу нельзя. Поэтому «не тот ответ» здесь возвращает null, а
 * панель показывает отказ, а не пустоту.
 *
 * КОНТРАКТ СЕРВЕРА. apps/api/src/routes/toothHistory.ts отдаёт
 * `{ events: [{ type, date, description, authorId }] }`, где:
 *   `type` — "diary" | "plan" | "state_change";
 *   `date` — дата в виде строки после JSON (в базе это timestamp);
 *   `description` — у записи дневника это `treatmentDescription || anamnesis`,
 *     то есть БЫВАЕТ пустым, если врач не заполнил ни то, ни другое;
 *   `authorId` — либо идентификатор пользователя, либо ФИО врача, либо
 *     "System"/"Не указан". Поля вида «это точно UUID» в контракте нет.
 */

/** Вид события истории. `null` — сервер прислал вид, которого мы не знаем. */
export type ToothHistoryEventKind = "diary" | "plan" | "state_change";

export interface ToothHistoryEvent {
	/**
	 * Вид события, либо null для незнакомого вида.
	 *
	 * Незнакомый вид НЕ выбрасывает событие: оно всё равно произошло с зубом
	 * пациента, и спрятать его хуже, чем показать без значка. Придумывать ему
	 * один из известных видов тоже нельзя — значок соврёт о том, что было.
	 */
	readonly kind: ToothHistoryEventKind | null;
	/** Дата события как её прислал сервер, либо null — если она нечитаема. */
	readonly dateIso: string | null;
	/** Описание события, либо null — сервер прислал пустое. */
	readonly description: string | null;
	/** Автор как его прислал сервер: идентификатор, ФИО или служебное слово. */
	readonly author: string | null;
}

const KNOWN_KINDS: readonly string[] = ["diary", "plan", "state_change"];

/** Непустая строка или null. Пробелы значением не считаются. */
function trimmedOrNull(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed === "" ? null : trimmed;
}

/**
 * Одно событие из ответа сервера.
 *
 * null означает «показывать нечего»: не объект, либо объект без даты и без
 * описания одновременно. Событие с датой, но без описания, сохраняется — дата
 * лечения зуба это факт, и терять его нельзя.
 */
export function toothHistoryEventFromServer(
	raw: unknown,
): ToothHistoryEvent | null {
	if (typeof raw !== "object" || raw === null || Array.isArray(raw))
		return null;
	const row = raw as Record<string, unknown>;

	const rawType = trimmedOrNull(row.type);
	const kind: ToothHistoryEventKind | null =
		rawType !== null && KNOWN_KINDS.includes(rawType)
			? (rawType as ToothHistoryEventKind)
			: null;

	/*
	 * Дата проверяется на читаемость ЗДЕСЬ, а не в разметке. В разметке стояло
	 * `new Date(evt.date).toLocaleDateString()`, и на нечитаемой дате браузер
	 * печатает латиницей «Invalid Date» — англоязычный технический текст в
	 * медицинской карте.
	 */
	const rawDate = trimmedOrNull(row.date);
	const dateIso =
		rawDate !== null && Number.isFinite(Date.parse(rawDate)) ? rawDate : null;

	const description = trimmedOrNull(row.description);
	if (dateIso === null && description === null) return null;

	return {
		kind,
		dateIso,
		description,
		author: trimmedOrNull(row.authorId),
	};
}

/**
 * Все события из тела ответа.
 *
 * null — тело НЕ соответствует контракту сервера, и это отказ чтения, а не
 * «истории нет». Пустой массив — сервер честно ответил, что событий нет.
 */
/**
 * Строка «кто это сделал» для одной записи истории.
 *
 * ЧТО БЫЛО СЛОМАНО. В разметке стояло `Автор: {evt.authorId.substring(0, 8)}...`
 * — поле обрезалось до восьми знаков всегда, потому что его считали
 * идентификатором. Но сервер присылает сюда РАЗНОЕ: для смены статуса это ФИО
 * врача из `users.fullName`, для позиции плана — слово "System", для дневника —
 * идентификатор пользователя, а при отсутствии автора — "Не указан".
 *
 * Врач читал в карте «Автор: Иванова ...» (фамилия обрезана, имени и отчества
 * нет), «Автор: System...» — латиница в медицинской карте — и «Автор: Не
 * указа...», то есть обрубок русского слова. Имя того, кто поставил диагноз, в
 * карте обрезать нельзя: по нему выясняют, кто лечил.
 *
 * Служебный код в имя врача не превращается: если сервер прислал
 * идентификатор, так и сказано — имени в записи нет.
 */
export function toothHistoryAuthorLabel(author: string | null): string {
	if (author === null) return "Автор не указан";
	// Сервер сам пишет это слово, когда автора у записи нет.
	if (author === "Не указан") return "Автор не указан";
	// "System" ставится позициям плана лечения: человека за этой записью нет.
	if (author.toLowerCase() === "system") return "Записано программой";
	/*
	 * Опознаётся именно форма идентификатора, а не «в строке нет русских букв»:
	 * второе спрятало бы настоящее имя, записанное латиницей. Показать лишнее
	 * хуже нельзя — соврать про имя врача можно.
	 */
	const looksLikeId =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
			author,
		) || /^[0-9a-f]{24,}$/i.test(author);
	if (looksLikeId) return "Автор: имя в записи не сохранено";
	// Имя целиком. Обрезать ФИО в медицинской карте нельзя.
	return `Автор: ${author}`;
}

export function toothHistoryEventsFromResponseBody(
	rawBody: string,
): ToothHistoryEvent[] | null {
	const trimmed = rawBody.trim();
	if (trimmed === "") return null;
	let parsed: unknown;
	try {
		parsed = JSON.parse(trimmed);
	} catch {
		// Текст исключения английский, человеку он не показывается никогда.
		return null;
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
		return null;
	const events = (parsed as Record<string, unknown>).events;
	if (!Array.isArray(events)) return null;
	return events
		.map(toothHistoryEventFromServer)
		.filter((event): event is ToothHistoryEvent => event !== null);
}
