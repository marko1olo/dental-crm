/**
 * Настройки MAX-бота: чтение с сервера, черновики полей формы и сохранение.
 *
 * ЧТО БЫЛО СЛОМАНО — ЭТО ПОТЕРЯ ДАННЫХ, А НЕ КОСМЕТИКА.
 *
 * 1. Провал чтения не выходил за пределы хука. `GET /api/max/settings` отвечает
 *    401/403, когда у смены нет прав (preHandler requireNonDoctorAccess), и 500
 *    при сбое базы; запрос может и вовсе не дойти до сервера. Всё это уходило
 *    только в console.error: наружу хук отдавал `settings: null` и пустые
 *    черновики — ровно то же самое, что при честном 404 «бот ещё не настроен».
 *    Панель рисовала пустую форму и бейдж «Не подключён», то есть
 *    НЕПРОЧИТАННОЕ показывалось как «канала нет».
 *
 * 2. Следом сохранение затирало живые настройки клиники. Черновики оставались
 *    на инициализаторах (botId="", webhookUrl="", isActive=false,
 *    staffRouting={defaultUserId:null,rules:[]}), а PUT отправляет их ВСЕ
 *    безусловно, и серверный обработчик пишет каждое присутствующее поле
 *    (routes/max.ts: `if (input.webhookUrl !== undefined) ...`). Достаточно
 *    было одного изменения, которое панель считает изменением (Bot ID, тумблер
 *    «Активен», токен), чтобы сохранённый webhookUrl обнулился, а роутинг
 *    входящих сообщений стал пустым. Полей ввода для webhookUrl и staffRouting
 *    в панели MAX нет вовсе — администратор не мог увидеть, что стёр их.
 *
 * 3. Текст ошибки сохранения был машинный. `res.json()` на пустом теле или на
 *    HTML от прокси бросал исключение, и `String(err)` печатал администратору
 *    английское «SyntaxError: Unexpected token '<'».
 *
 * ЧТО СТАЛО. Состояния чтения объявлены явно и не подменяют друг друга:
 * загрузка / прочитано / отказ, причём 404 — это «прочитано, ещё не настроено»,
 * а не отказ. Сохранение разрешено только после того, как черновики хотя бы раз
 * заполнены ответом сервера (`canSave`): иначе `save()` не отправляет запрос
 * вовсе и пишет в `saveError` человеческий текст с подсказкой, что делать. Тело
 * ответа читается строкой и разбирается чистой функцией — образец взят из
 * components/analytics/analyticsWidgetData.ts, поэтому «500 с телом-объектом» и
 * «пустое тело» проверяются тестом, а не глазами по экрану.
 *
 * ЧЕГО ЗДЕСЬ НЕТ (долг панели). MaxSettingsPanel.tsx пока не рисует отказ
 * чтения. `loadState`, `loadFailureStatus` и `MAX_SETTINGS_PANEL_SUBJECT`
 * отдаются готовыми для <PanelLoadFailure>, но подключает их владелец панели.
 * До этого администратор увидит запрет сохранения в уже существующем
 * <p role="alert"> под кнопкой, но не причину отказа.
 */

import { useCallback, useEffect, useState } from "react";

import { denteAdminSecretRequestHeaders } from "../AppHelpers";
import { actionFailureToast, type PanelSubject } from "../lib/panelStateText";

export interface MaxStaffRoutingRule {
	intent: string;
	assignToUserId: string | null;
}

export interface MaxStaffRouting {
	defaultUserId: string | null;
	rules: MaxStaffRoutingRule[];
}

export interface MaxSettings {
	id: string;
	organizationId: string;
	botId: string | null;
	hasToken: boolean;
	webhookUrl: string | null;
	enabledFeatures: string[];
	staffRouting: MaxStaffRouting;
	isActive: boolean;
	updatedAt: string;
}

export interface MaxConnectionStatus {
	channel: "max";
	connected: boolean;
	detail: string | null;
}

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Состояние чтения настроек. Ровно одно из трёх, без промежуточных комбинаций.
 * `configured: false` — сервер ответил 404: бота ещё не настраивали, и это
 * честная пустота, при которой сохранение (создание) разрешено.
 */
export type MaxSettingsLoadState =
	| { readonly phase: "loading" }
	| { readonly phase: "ready"; readonly configured: boolean }
	/** `status` — код ответа; null означает, что до сервера не дошли вовсе. */
	| { readonly phase: "failed"; readonly status: number | null };

/**
 * Как называется содержимое панели MAX — для <PanelLoadFailure> и любого
 * другого места, где нужен текст трёх состояний. Лежит рядом с загрузкой, а не
 * в разметке: именно решение «что показать при отказе» и ошибалось.
 */
export const MAX_SETTINGS_PANEL_SUBJECT: PanelSubject = {
	// Целая согласованная строка: слова «не загружены» больше не дописывает общий
	// модуль, поэтому число и род называет тот, кто знает существительное.
	notLoadedTitle: "Настройки MAX не загружены",
	accusative: "настройки MAX",
	emptyTitle: "MAX ещё не подключён",
	emptyHint:
		"Заведите бота на business.max.ru, впишите Bot ID и API Token и нажмите «Сохранить».",
	failureConsequence:
		"Не считайте, что канал не настроен: настройки не прочитаны. Сохранение выключено, чтобы не затереть то, что уже сохранено в клинике.",
};

/**
 * Почему сохранение запрещено. Текст отвечает на три вопроса: что случилось,
 * почему и что делать — и попадает в то же поле `saveError`, которое панель уже
 * печатает под кнопкой.
 */
export const MAX_SETTINGS_SAVE_BLOCKED_MESSAGE =
	"Настройки не сохранены: текущие настройки MAX не прочитаны, а сохранение затёрло бы их пустыми значениями. Нажмите «Обновить» слева от кнопки сохранения и повторите.";

export const MAX_SETTINGS_SAVE_WHILE_LOADING_MESSAGE =
	"Настройки не сохранены: настройки MAX ещё читаются с сервера. Дождитесь загрузки — иначе ваши правки перезапишутся тем, что придёт с сервера.";

/** Решение «можно ли сохранять» и человеческий текст запрета. */
export type MaxSaveGuardVerdict =
	| { readonly allowed: true }
	| { readonly allowed: false; readonly message: string };

/**
 * Можно ли отправлять черновики на сервер.
 *
 * Правило вынесено из хука по той же причине, по которой resolvePanelPhase
 * вынесен из разметки в lib/panelStateText.ts: ошибались именно в нём, а здесь
 * его проверяет обычный node:test, без React и браузера.
 *
 * Порядок ветвей обязателен: пока чтение идёт, «дождитесь загрузки» — точная
 * подсказка, а «нажмите Обновить» отправила бы администратора жать кнопку,
 * которая и так нажата.
 */
export function maxSaveGuardVerdict(input: {
	readonly loading: boolean;
	readonly draftsSeeded: boolean;
}): MaxSaveGuardVerdict {
	if (input.loading) {
		return { allowed: false, message: MAX_SETTINGS_SAVE_WHILE_LOADING_MESSAGE };
	}
	if (!input.draftsSeeded) {
		return { allowed: false, message: MAX_SETTINGS_SAVE_BLOCKED_MESSAGE };
	}
	return { allowed: true };
}

/** Итог чтения без React и fetch: разбирается и проверяется отдельно от них. */
export type MaxSettingsLoadOutcome =
	| { readonly ok: true; readonly settings: MaxSettings | null }
	| { readonly ok: false; readonly status: number | null };

/* --------------------------------------------------------------------- */
/*  Безопасное чтение полей ответа                                        */
/*                                                                        */
/*  Разбор намеренно повторён в useWhatsappSettings.ts: общего модуля      */
/*  настроек мессенджеров пока нет, а тянуть в настройки список-разборщик  */
/*  виджетов аналитики — хуже, чем два коротких набора помощников.         */
/* --------------------------------------------------------------------- */

/** Запись-объект или null. Массив записью не считается. */
function asRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

/** Непустая строка или заранее заданная подпись. Никогда не undefined. */
function textOr(value: unknown, fallback: string): string {
	return typeof value === "string" && value.trim().length > 0
		? value.trim()
		: fallback;
}

/** Непустая строка или null — для полей, у которых «не задано» законно. */
function textOrNull(value: unknown): string | null {
	return typeof value === "string" && value.trim().length > 0
		? value.trim()
		: null;
}

/** Список строк. Не массив и мусор внутри отбрасываются. */
function stringList(value: unknown): string[] {
	return Array.isArray(value)
		? value.filter((item): item is string => typeof item === "string")
		: [];
}

/** Пустой роутинг. Одна функция, чтобы начальное состояние и загрузка не разошлись. */
function emptyMaxStaffRouting(): MaxStaffRouting {
	return { defaultUserId: null, rules: [] };
}

/**
 * Роутинг из ответа сервера.
 *
 * Сервер собирает это поле через parseJsonSafe (routes/max.ts), и на испорченной
 * строке в БД оттуда законно приходит `null`. Панель передаёт значение как есть в
 * MessengerRoutingRules, где `routing.rules.map(...)` роняет весь раздел
 * настроек. Поэтому объект восстанавливается здесь, а не проверяется в разметке.
 */
export function normalizeMaxStaffRouting(value: unknown): MaxStaffRouting {
	const record = asRecord(value);
	const rawRules = record && Array.isArray(record.rules) ? record.rules : [];
	return {
		defaultUserId: textOrNull(record?.defaultUserId),
		rules: rawRules.flatMap((row) => {
			const rule = asRecord(row);
			const intent = rule ? textOrNull(rule.intent) : null;
			// Правило без типа запроса серверу не нужно, а в разметке оно даёт
			// <select> с пустым value и молча меняет чужое правило при первом клике.
			return intent
				? [{ intent, assignToUserId: textOrNull(rule?.assignToUserId) }]
				: [];
		}),
	};
}

/**
 * Разбор ответа `GET /api/max/settings` из УЖЕ прочитанного тела.
 *
 * Чистая функция: ни fetch, ни DOM. 404 отделён от отказа намеренно — это
 * единственный код, при котором пустые черновики законны.
 */
export function parseMaxSettingsPayload(
	status: number,
	rawBody: string,
): MaxSettingsLoadOutcome {
	if (status === 404) {
		return { ok: true, settings: null };
	}
	if (status < 200 || status >= 300) {
		return { ok: false, status };
	}
	const trimmed = rawBody.trim();
	if (trimmed.length === 0) {
		// Пустое тело на успешном статусе — не «настроек нет», а испорченный ответ.
		return { ok: false, status };
	}
	let payload: unknown;
	try {
		payload = JSON.parse(trimmed);
	} catch {
		return { ok: false, status };
	}
	const record = asRecord(payload);
	if (!record) {
		return { ok: false, status };
	}
	// Каждое поле приводится здесь, чтобы в разметке не осталось обращений к
	// полю, которого может не быть.
	return {
		ok: true,
		settings: {
			id: textOr(record.id, ""),
			organizationId: textOr(record.organizationId, ""),
			botId: textOrNull(record.botId),
			hasToken: record.hasToken === true,
			webhookUrl: textOrNull(record.webhookUrl),
			enabledFeatures: stringList(record.enabledFeatures),
			staffRouting: normalizeMaxStaffRouting(record.staffRouting),
			isActive: record.isActive === true,
			updatedAt: textOr(record.updatedAt, ""),
		},
	};
}

/**
 * Человеческий текст отказа сохранения.
 *
 * Сервер MAX отвечает на отказ телом {error,message} по-русски — его и
 * показываем. Но 502 от прокси и пустое тело роняли `res.json()`, и в поле
 * ошибки уходило английское исключение; поэтому тело читается строкой, а
 * запасная формулировка берётся из общего lib/panelStateText.ts.
 */
async function maxSaveFailureMessage(res: Response): Promise<string> {
	let raw = "";
	try {
		raw = await res.text();
	} catch {
		raw = "";
	}
	let payload: unknown = null;
	try {
		payload = raw.trim().length > 0 ? JSON.parse(raw) : null;
	} catch {
		payload = null;
	}
	const serverMessage = textOrNull(asRecord(payload)?.message);
	return (
		serverMessage ??
		actionFailureToast("Настройки MAX не сохранены", res.status)
	);
}

export function useMaxSettings() {
	const [settings, setSettings] = useState<MaxSettings | null>(null);
	const [status, setStatus] = useState<MaxConnectionStatus | null>(null);
	// Первый запрос назначен эффектом ниже, поэтому «загрузка» истинна с первого
	// рендера: иначе кнопка «Обновить» доступна в момент, когда запрос уже идёт.
	const [loading, setLoading] = useState(true);
	const [loadState, setLoadState] = useState<MaxSettingsLoadState>({
		phase: "loading",
	});
	// Черновики хотя бы раз заполнены ответом сервера. Это и есть разрешение
	// сохранять: без него PUT ушёл бы с инициализаторами и затёр живые настройки.
	const [draftsSeeded, setDraftsSeeded] = useState(false);
	const [statusUnknown, setStatusUnknown] = useState(false);
	const [saveState, setSaveState] = useState<SaveState>("idle");
	const [saveError, setSaveError] = useState<string | null>(null);

	const [botIdDraft, setBotIdDraft] = useState("");
	const [apiTokenDraft, setApiTokenDraft] = useState("");
	const [webhookUrlDraft, setWebhookUrlDraft] = useState("");
	const [isActiveDraft, setIsActiveDraft] = useState(false);
	const [staffRoutingDraft, setStaffRoutingDraft] =
		useState<MaxStaffRouting>(emptyMaxStaffRouting);

	const load = useCallback(async () => {
		setLoading(true);
		setLoadState({ phase: "loading" });
		try {
			const res = await fetch("/api/max/settings", {
				headers: denteAdminSecretRequestHeaders(),
			});
			// Тело читается строкой один раз: у `res.json()` на пустом ответе и на
			// HTML от прокси исключение с английским текстом.
			const raw = await res.text();
			const outcome = parseMaxSettingsPayload(res.status, raw);
			if (!outcome.ok) {
				// Код состояния нужен разработчику, а не администратору: в консоль.
				console.error("[настройки MAX] не прочитаны, ответ", outcome.status);
				setLoadState({ phase: "failed", status: outcome.status });
				return;
			}
			const data = outcome.settings;
			setSettings(data);
			setBotIdDraft(data?.botId ?? "");
			setWebhookUrlDraft(data?.webhookUrl ?? "");
			setIsActiveDraft(data?.isActive ?? false);
			setStaffRoutingDraft(data?.staffRouting ?? emptyMaxStaffRouting());
			setDraftsSeeded(true);
			setLoadState({ phase: "ready", configured: data !== null });
		} catch (err) {
			// До сервера не дошли вовсе: status = null, текст об этом так и скажет.
			console.error("[настройки MAX] запрос не дошёл до сервера", err);
			setLoadState({ phase: "failed", status: null });
		} finally {
			setLoading(false);
		}
	}, []);

	const checkStatus = useCallback(async () => {
		try {
			const res = await fetch("/api/max/status", {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (res.ok) {
				setStatus((await res.json()) as MaxConnectionStatus);
				setStatusUnknown(false);
				return;
			}
			// Отказ проверки состояния — это НЕ «не подключён»: состояние неизвестно.
			console.error("[состояние MAX] не прочитано, ответ", res.status);
			setStatusUnknown(true);
		} catch (err) {
			console.error("[состояние MAX] запрос не дошёл до сервера", err);
			setStatusUnknown(true);
		}
	}, []);

	useEffect(() => {
		void load();
		void checkStatus();
	}, [load, checkStatus]);

	// Пока настройки не прочитаны, черновики — не «то, что в клинике», а
	// инициализаторы, и отправлять их нельзя.
	const canSave =
		maxSaveGuardVerdict({ loading, draftsSeeded }).allowed &&
		saveState !== "saving";

	const save = useCallback(async () => {
		// ЗАПРЕТ СОХРАНЕНИЯ НЕПРОЧИТАННЫХ НАСТРОЕК. Проверка стоит до fetch
		// намеренно: панель может разблокировать кнопку по своему признаку
		// изменений, а цена ошибки здесь — стёртый webhookUrl и стёртый роутинг.
		const verdict = maxSaveGuardVerdict({ loading, draftsSeeded });
		if (!verdict.allowed) {
			setSaveState("error");
			setSaveError(verdict.message);
			return;
		}
		setSaveState("saving");
		setSaveError(null);
		try {
			const body: Record<string, unknown> = {
				botId: botIdDraft.trim() || null,
				webhookUrl: webhookUrlDraft.trim() || null,
				isActive: isActiveDraft,
				staffRouting: staffRoutingDraft,
			};
			if (apiTokenDraft.trim()) {
				body.apiToken = apiTokenDraft.trim();
			}
			const res = await fetch("/api/max/settings", {
				method: "PUT",
				headers: {
					...denteAdminSecretRequestHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify(body),
			});
			if (res.ok) {
				setSaveState("saved");
				setApiTokenDraft("");
				await load();
				await checkStatus();
				setTimeout(() => setSaveState("idle"), 2000);
			} else {
				setSaveError(await maxSaveFailureMessage(res));
				setSaveState("error");
			}
		} catch (err) {
			// Текст исключения наружу не идёт ни при каких условиях: он английский.
			console.error("[настройки MAX] сохранение не дошло до сервера", err);
			setSaveError(actionFailureToast("Настройки MAX не сохранены", null));
			setSaveState("error");
		}
	}, [
		botIdDraft,
		apiTokenDraft,
		webhookUrlDraft,
		isActiveDraft,
		staffRoutingDraft,
		loading,
		draftsSeeded,
		load,
		checkStatus,
	]);

	return {
		settings,
		status,
		/** Проверка состояния не удалась: это не «не подключён», а «неизвестно». */
		statusUnknown,
		loading,
		/** Загрузка / прочитано / отказ. Пустота и отказ не сливаются. */
		loadState,
		/** Ярлык для <PanelLoadFailure status={…}>: код отказа либо null. */
		loadFailureStatus: loadState.phase === "failed" ? loadState.status : null,
		/** Настройки прочитаны и сохранять безопасно. */
		canSave,
		saveState,
		saveError,
		botIdDraft,
		setBotIdDraft,
		apiTokenDraft,
		setApiTokenDraft,
		webhookUrlDraft,
		setWebhookUrlDraft,
		isActiveDraft,
		setIsActiveDraft,
		staffRoutingDraft,
		setStaffRoutingDraft,
		save,
		reload: load,
	};
}
