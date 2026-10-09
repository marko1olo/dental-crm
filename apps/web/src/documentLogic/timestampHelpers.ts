import { DOCUMENT_TIMESTAMP_FIELDS, type DocumentState } from "./types";

/**
 * Форматирует дату в формате ru-RU с временем (ДД.ММ.ГГГГ, чч:мм:сс).
 */
export function formatRuDateTime(date = new Date()): string {
	return date.toLocaleString("ru-RU");
}

/**
 * Форматирует дату в формате ru-RU без времени (ДД.ММ.ГГГГ).
 */
export function formatRuDate(date = new Date()): string {
	return date.toLocaleDateString("ru-RU");
}

/**
 * Календарный день по местному времени в формате ГГГГ-ММ-ДД.
 * toISOString() отдаёт день по UTC и при положительном смещении часового пояса
 * вечером даёт УЖЕ ЗАВТРАШНЮЮ дату: в Самаре (+04:00) после 20:00 карта 043/у
 * открывалась бы завтрашним числом.
 */
export function formatIsoDate(date = new Date()): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Формат для полей ввода datetime-local (ГГГГ-ММ-ДДTчч:мм).
 */
export function formatDateTimeLocal(date = new Date()): string {
	const isoDate = formatIsoDate(date);
	return `${isoDate}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/**
 * Подставить настоящее время в пустые отметки документа.
 *
 * Вызывается один раз при создании документа и ДО проверки полей: пустая
 * обязательная дата иначе упёрлась бы в валидатор и потребовала от человека
 * вписать то, что программа знает сама.
 *
 * Значения, введённые руками, не трогаются — только пустые. Возвращается новый
 * объект: хранилище остаётся пустым, чтобы следующий документ снова получил своё
 * время, а не время предыдущего.
 */
export function withDocumentCreationTimestamps(
	state: DocumentState,
): DocumentState {
	const now = new Date();
	const asDateTime = formatRuDateTime(now);
	const asDate = formatRuDate(now);
	const asIsoDate = formatIsoDate(now);
	const asDateTimeLocal = formatDateTimeLocal(now);

	const filled: DocumentState = { ...state };
	for (const [field, shape] of DOCUMENT_TIMESTAMP_FIELDS) {
		const current = filled[field];
		if (typeof current === "string" && current.trim() !== "") continue;
		if (shape === "dateTime") filled[field] = asDateTime;
		else if (shape === "date") filled[field] = asDate;
		else if (shape === "dateTimeLocal") filled[field] = asDateTimeLocal;
		else filled[field] = asIsoDate;
	}
	return filled;
}
