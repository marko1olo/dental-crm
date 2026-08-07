import { showToast } from "../GlobalToast";
import { actionFailureToast } from "../../lib/panelStateText";
/**
 * Общая загрузка данных для виджетов раздела «Аналитика» и безопасный разбор
 * полей ответа.
 *
 * ЧТО БЫЛО СЛОМАНО. Все три виджета папки повторяли одну и ту же цепочку
 * `fetch(...).then((res) => res.json())` без проверки `res.ok`. Последствия:
 *
 * 1. Ответ 401 или 500 отдаёт тело `{"message":"…"}` — это корректный JSON, он
 *    разбирался без ошибки, `Array.isArray` давал false, список оставался
 *    пустым, и виджет писал «Правила повторной записи пусты». То есть провал
 *    запроса показывался пользователю как достоверное «данных нет».
 * 2. Пустое тело (например 204 или обрыв соединения) роняет `res.json()`
 *    исключением с английским текстом; его глотал `catch`, и получалось то же
 *    ложное «пусто».
 * 3. Поля элементов брались без проверки: `rule.creditedRole.toUpperCase()`
 *    на строке без роли бросало TypeError уже во время отрисовки, а это ронял
 *    весь раздел «Аналитика» в заглушку «Раздел временно не открылся».
 *
 * ПРАВИЛО. Тело читается один раз строкой, разбирается чистой функцией, и
 * каждый элемент списка проходит через нормализацию вызывающего виджета. После
 * неё в разметке не остаётся ни одного обращения к полю, которого может не
 * быть. Состояния ровно три: загрузка, ошибка, пусто — и они не подменяют друг
 * друга.
 */

import { staffRoleLabels } from "../../workspaceUiLabels";

/**
 * Единый текст ошибки для виджетов. Причину (401, 500, обрыв сети) пользователь
 * исправить не может, а вот обновить страницу — может.
 */
export const WIDGET_LOAD_ERROR_MESSAGE =
	"Не удалось загрузить, обновите страницу";

/** Состояние виджета. Ровно одно из трёх, без промежуточных комбинаций. */
export type WidgetListState<T> =
	| { readonly status: "loading" }
	| { readonly status: "error"; readonly message: string }
	| { readonly status: "ready"; readonly items: readonly T[] };

export type WidgetListResult<T> =
	| { readonly ok: true; readonly items: T[] }
	| { readonly ok: false; readonly message: string };

/** Запись-объект или null. Массив записью не считается. */
function asRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

/**
 * Разбор ответа списочного эндпоинта из УЖЕ прочитанного тела.
 *
 * Чистая функция: ни fetch, ни DOM. Поэтому «401 с телом-объектом» и «пустое
 * тело» — обычные тест-кейсы, а не то, что проверяется вручную по экрану.
 */
export function parseWidgetListPayload<T>(
	status: number,
	rawBody: string,
	toItem: (row: Record<string, unknown>) => T,
): WidgetListResult<T> {
	if (status < 200 || status >= 300) {
		return { ok: false, message: WIDGET_LOAD_ERROR_MESSAGE };
	}
	const trimmed = rawBody.trim();
	if (trimmed.length === 0) {
		// Пустое тело на успешном статусе — не пустой список, а испорченный ответ.
		return { ok: false, message: WIDGET_LOAD_ERROR_MESSAGE };
	}
	let payload: unknown;
	try {
		payload = JSON.parse(trimmed);
	} catch {
		return { ok: false, message: WIDGET_LOAD_ERROR_MESSAGE };
	}
	// Некоторые эндпоинты отдают список внутри конверта {success,data}.
	const envelope = asRecord(payload);
	const list = Array.isArray(payload)
		? payload
		: envelope && Array.isArray(envelope.data)
			? (envelope.data as unknown[])
			: null;
	if (!list) {
		return { ok: false, message: WIDGET_LOAD_ERROR_MESSAGE };
	}
	// Элементы, не являющиеся объектами, отбрасываются здесь: иначе они дошли бы
	// до разметки и уронили её на первом же обращении к полю.
	return {
		ok: true,
		items: list.flatMap((row) =>
			asRecord(row) ? [toItem(asRecord(row)!)] : [],
		),
	};
}

/**
 * Загрузка списка. Возвращает готовое состояние виджета — сам виджет о статусах
 * ответа и разборе тела больше ничего не знает.
 */
export async function fetchWidgetList<T>(
	url: string,
	headers: Record<string, string>,
	toItem: (row: Record<string, unknown>) => T,
	signal?: AbortSignal,
): Promise<WidgetListResult<T>> {
	try {
		// `signal` подставляется только когда он есть: при exactOptionalPropertyTypes
		// поле `signal: undefined` в RequestInit не проходит проверку типов.
		const response = await fetch(
			url,
			signal ? { headers, signal } : { headers },
		);
		const raw = await response.text();
		return parseWidgetListPayload(response.status, raw, toItem);
	} catch (error) {
			showToast(actionFailureToast("Ошибка выполнения операции", (error as { status?: number })?.status ?? null), "error");
		// Текст исключения наружу не идёт ни при каких условиях: он английский.
		console.error(`[analytics widget fetch error] ${url}:`, error);
		return { ok: false, message: WIDGET_LOAD_ERROR_MESSAGE };
	}
}

/* ------------------------------------------------------------------ */
/*  Безопасное чтение полей элемента                                   */
/* ------------------------------------------------------------------ */

/** Непустая строка или заранее заданная подпись. Никогда не undefined. */
export function textOr(value: unknown, fallback: string): string {
	return typeof value === "string" && value.trim().length > 0
		? value.trim()
		: fallback;
}

/** Число или null. Строки и мусор к нулю не приводятся: ноль — это утверждение. */
export function numberOrNull(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim().length > 0) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

/** Прочерк (U+2014) там, где числа нет. Не «0» и не пустая ячейка. */
export const UNKNOWN_VALUE_TEXT = "—";

/**
 * Название роли по-русски.
 *
 * Источник названий один — `staffRoleLabels` из workspaceUiLabels.ts, вторая
 * карта названий ролей в проекте не заводится. Здесь только приведение ключа:
 * данные приходят в верхнем регистре (`DOCTOR`), а сокращение `ADMIN` в карте
 * отсутствует, потому что штатная роль называется `administrator`.
 *
 * Незнакомое непустое значение возвращается как есть: придумывать ему роль
 * нельзя, а прятать — значит скрыть от пользователя то, что записано в базе.
 */
const ROLE_KEY_ALIASES: Record<string, keyof typeof staffRoleLabels> = {
	admin: "administrator",
	administrator: "administrator",
	doctor: "doctor",
	assistant: "assistant",
	owner: "owner",
	manager: "manager",
};

export function roleLabel(
	value: unknown,
	fallback = "роль не указана",
): string {
	const raw = typeof value === "string" ? value.trim() : "";
	if (raw.length === 0) return fallback;
	const key = ROLE_KEY_ALIASES[raw.toLowerCase()];
	return key ? staffRoleLabels[key] : raw;
}
