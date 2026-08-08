import { showToast } from "../components/GlobalToast";
import { logger } from "../utils/logger";
/**
 * Настройки WhatsApp Business: чтение с сервера, черновики полей и сохранение.
 *
 * ЧТО БЫЛО СЛОМАНО — ЭТО ПОТЕРЯ ДАННЫХ, А НЕ КОСМЕТИКА.
 *
 * 1. Провал чтения не выходил за пределы хука. `GET /api/whatsapp/settings`
 *    отвечает 401/403, когда у смены нет прав, и 500 при сбое базы; запрос может
 *    и вовсе не дойти до сервера. Всё это уходило только в logger.error, а
 *    наружу хук отдавал `settings: null` и пустые черновики — ровно то же, что
 *    при честном 404 «канал ещё не настроен». Панель показывала пустые поля,
 *    выключенный тумблер и бейдж «Не подключён»: НЕПРОЧИТАННОЕ выглядело как
 *    «WhatsApp не подключён».
 *
 * 2. Следом сохранение затирало живые настройки клиники. Администратор, решив,
 *    что канал не настроен, делал одно изменение — включал тумблер, отмечал
 *    любую функцию — и признак `dirty` в панели разблокировал кнопку. PUT
 *    отправляет ВСЕ поля сразу, а серверный обработчик пишет каждое
 *    присутствующее (routes/whatsapp.ts: `if (input.phoneNumberId !== undefined)
 *    ...`). За одно нажатие обнулялись phoneNumberId, webhookVerifyToken,
 *    список включённых функций и роутинг входящих сообщений.
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
 * ЧЕГО ЗДЕСЬ НЕТ (долг панели). WhatsappSettingsPanel.tsx пока не рисует отказ
 * чтения. `loadState`, `loadFailureStatus` и `WHATSAPP_SETTINGS_PANEL_SUBJECT`
 * отдаются готовыми для <PanelLoadFailure>, но подключает их владелец панели.
 * До этого администратор увидит запрет сохранения в уже существующем
 * <p role="alert"> под кнопкой, но не причину отказа.
 */

import { useCallback, useEffect, useState } from "react";

import { denteAdminSecretRequestHeaders } from "../AppHelpers";
import { actionFailureToast, type PanelSubject } from "../lib/panelStateText";

export interface WhatsappStaffRoutingRule {
	intent: string;
	assignToUserId: string | null;
}

export interface WhatsappStaffRouting {
	defaultUserId: string | null;
	rules: WhatsappStaffRoutingRule[];
}

export interface WhatsappSettings {
	id: string;
	organizationId: string;
	phoneNumberId: string | null;
	hasToken: boolean;
	webhookVerifyToken: string | null;
	enabledFeatures: string[];
	staffRouting: WhatsappStaffRouting;
	isActive: boolean;
	updatedAt: string;
}

export interface WhatsappConnectionStatus {
	channel: "whatsapp";
	connected: boolean;
	detail: string | null;
}

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Состояние чтения настроек. Ровно одно из трёх, без промежуточных комбинаций.
 * `configured: false` — сервер ответил 404: канал ещё не настраивали, и это
 * честная пустота, при которой сохранение (создание) разрешено.
 */
export type WhatsappSettingsLoadState =
	| { readonly phase: "loading" }
	| { readonly phase: "ready"; readonly configured: boolean }
	/** `status` — код ответа; null означает, что до сервера не дошли вовсе. */
	| { readonly phase: "failed"; readonly status: number | null };

/**
 * Как называется содержимое панели WhatsApp — для <PanelLoadFailure> и любого
 * другого места, где нужен текст трёх состояний. Лежит рядом с загрузкой, а не
 * в разметке: именно решение «что показать при отказе» и ошибалось.
 */
export const WHATSAPP_SETTINGS_PANEL_SUBJECT: PanelSubject = {
	// Целая согласованная строка: слова «не загружены» больше не дописывает общий
	// модуль, поэтому число и род называет тот, кто знает существительное.
	notLoadedTitle: "Настройки WhatsApp не загружены",
	accusative: "настройки WhatsApp",
	emptyTitle: "WhatsApp ещё не подключён",
	emptyHint:
		"Возьмите Phone Number ID и токен в Meta Business Console, заполните поля и нажмите «Сохранить».",
	failureConsequence:
		"Не считайте, что канал не настроен: настройки не прочитаны. Сохранение выключено, чтобы не затереть то, что уже сохранено в клинике.",
};

/**
 * Почему сохранение запрещено. Текст отвечает на три вопроса: что случилось,
 * почему и что делать — и попадает в то же поле `saveError`, которое панель уже
 * печатает под кнопкой.
 */
export const WHATSAPP_SETTINGS_SAVE_BLOCKED_MESSAGE =
	"Настройки не сохранены: текущие настройки WhatsApp не прочитаны, а сохранение затёрло бы их пустыми значениями. Нажмите «Обновить» слева от кнопки сохранения и повторите.";

export const WHATSAPP_SETTINGS_SAVE_WHILE_LOADING_MESSAGE =
	"Настройки не сохранены: настройки WhatsApp ещё читаются с сервера. Дождитесь загрузки — иначе ваши правки перезапишутся тем, что придёт с сервера.";

/** Решение «можно ли сохранять» и человеческий текст запрета. */
export type WhatsappSaveGuardVerdict =
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
export function whatsappSaveGuardVerdict(input: {
	readonly loading: boolean;
	readonly draftsSeeded: boolean;
}): WhatsappSaveGuardVerdict {
	if (input.loading) {
		return {
			allowed: false,
			message: WHATSAPP_SETTINGS_SAVE_WHILE_LOADING_MESSAGE,
		};
	}
	if (!input.draftsSeeded) {
		return { allowed: false, message: WHATSAPP_SETTINGS_SAVE_BLOCKED_MESSAGE };
	}
	return { allowed: true };
}

/** Итог чтения без React и fetch: разбирается и проверяется отдельно от них. */
export type WhatsappSettingsLoadOutcome =
	| { readonly ok: true; readonly settings: WhatsappSettings | null }
	| { readonly ok: false; readonly status: number | null };

/* --------------------------------------------------------------------- */
/*  Безопасное чтение полей ответа                                        */
/*                                                                        */
/*  Разбор намеренно повторён в useMaxSettings.ts: общего модуля настроек  */
/*  мессенджеров пока нет, а тянуть в настройки список-разборщик виджетов  */
/*  аналитики — хуже, чем два коротких набора помощников.                  */
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
function emptyWhatsappStaffRouting(): WhatsappStaffRouting {
	return { defaultUserId: null, rules: [] };
}

/**
 * Роутинг из ответа сервера.
 *
 * Сервер собирает это поле через parseJsonSafe (routes/whatsapp.ts), и на
 * испорченной строке в БД оттуда законно приходит `null`. Панель передаёт
 * значение как есть в MessengerRoutingRules, где `routing.rules.map(...)` роняет
 * весь раздел настроек. Поэтому объект восстанавливается здесь, а не проверяется
 * в разметке.
 */
export function normalizeWhatsappStaffRouting(
	value: unknown,
): WhatsappStaffRouting {
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
 * Разбор ответа `GET /api/whatsapp/settings` из УЖЕ прочитанного тела.
 *
 * Чистая функция: ни fetch, ни DOM. 404 отделён от отказа намеренно — это
 * единственный код, при котором пустые черновики законны.
 */
export function parseWhatsappSettingsPayload(
	status: number,
	rawBody: string,
): WhatsappSettingsLoadOutcome {
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
			phoneNumberId: textOrNull(record.phoneNumberId),
			hasToken: record.hasToken === true,
			webhookVerifyToken: textOrNull(record.webhookVerifyToken),
			enabledFeatures: stringList(record.enabledFeatures),
			staffRouting: normalizeWhatsappStaffRouting(record.staffRouting),
			isActive: record.isActive === true,
			updatedAt: textOr(record.updatedAt, ""),
		},
	};
}

/**
 * Человеческий текст отказа сохранения.
 *
 * Сервер WhatsApp отвечает на отказ телом {error,message} по-русски — его и
 * показываем. Но 502 от прокси и пустое тело роняли `res.json()`, и в поле
 * ошибки уходило английское исключение; поэтому тело читается строкой, а
 * запасная формулировка берётся из общего lib/panelStateText.ts.
 */
async function whatsappSaveFailureMessage(res: Response): Promise<string> {
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
		actionFailureToast("Настройки WhatsApp не сохранены", res.status)
	);
}

export function useWhatsappSettings() {
	const [settings, setSettings] = useState<WhatsappSettings | null>(null);
	const [status, setStatus] = useState<WhatsappConnectionStatus | null>(null);
	// Первый запрос назначен эффектом ниже, поэтому «загрузка» истинна с первого
	// рендера: иначе кнопка «Обновить» доступна в момент, когда запрос уже идёт.
	const [loading, setLoading] = useState(true);
	const [loadState, setLoadState] = useState<WhatsappSettingsLoadState>({
		phase: "loading",
	});
	// Черновики хотя бы раз заполнены ответом сервера. Это и есть разрешение
	// сохранять: без него PUT ушёл бы с инициализаторами и затёр живые настройки.
	const [draftsSeeded, setDraftsSeeded] = useState(false);
	const [statusUnknown, setStatusUnknown] = useState(false);
	const [saveState, setSaveState] = useState<SaveState>("idle");
	const [saveError, setSaveError] = useState<string | null>(null);

	const [phoneNumberIdDraft, setPhoneNumberIdDraft] = useState("");
	const [accessTokenDraft, setAccessTokenDraft] = useState("");
	const [webhookVerifyTokenDraft, setWebhookVerifyTokenDraft] = useState("");
	const [isActiveDraft, setIsActiveDraft] = useState(false);
	const [enabledFeaturesDraft, setEnabledFeaturesDraft] = useState<string[]>(
		[],
	);
	const [staffRoutingDraft, setStaffRoutingDraft] =
		useState<WhatsappStaffRouting>(emptyWhatsappStaffRouting);

	const load = useCallback(async () => {
		setLoading(true);
		setLoadState({ phase: "loading" });
		try {
			const res = await fetch("/api/whatsapp/settings", {
				headers: denteAdminSecretRequestHeaders(),
			});
			// Тело читается строкой один раз: у `res.json()` на пустом ответе и на
			// HTML от прокси исключение с английским текстом.
			const raw = await res.text();
			const outcome = parseWhatsappSettingsPayload(res.status, raw);
			if (!outcome.ok) {
				// Код состояния нужен разработчику, а не администратору: в консоль.
				logger.error(
					"[настройки WhatsApp] не прочитаны, ответ",
					outcome.status,
				);
				setLoadState({ phase: "failed", status: outcome.status });
				return;
			}
			const data = outcome.settings;
			setSettings(data);
			setPhoneNumberIdDraft(data?.phoneNumberId ?? "");
			setWebhookVerifyTokenDraft(data?.webhookVerifyToken ?? "");
			setIsActiveDraft(data?.isActive ?? false);
			setEnabledFeaturesDraft(data?.enabledFeatures ?? []);
			setStaffRoutingDraft(data?.staffRouting ?? emptyWhatsappStaffRouting());
			setDraftsSeeded(true);
			setLoadState({ phase: "ready", configured: data !== null });
		} catch (err) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(err as { status?: number })?.status ?? null,
				),
				"error",
			);
			// До сервера не дошли вовсе: status = null, текст об этом так и скажет.
			logger.error("[настройки WhatsApp] запрос не дошёл до сервера", err);
			setLoadState({ phase: "failed", status: null });
		} finally {
			setLoading(false);
		}
	}, []);

	const checkStatus = useCallback(async () => {
		try {
			const res = await fetch("/api/whatsapp/status", {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (res.ok) {
				setStatus((await res.json()) as WhatsappConnectionStatus);
				setStatusUnknown(false);
				return;
			}
			// Отказ проверки состояния — это НЕ «не подключён»: состояние неизвестно.
			logger.error("[состояние WhatsApp] не прочитано, ответ", res.status);
			setStatusUnknown(true);
		} catch (err) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(err as { status?: number })?.status ?? null,
				),
				"error",
			);
			logger.error("[состояние WhatsApp] запрос не дошёл до сервера", err);
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
		whatsappSaveGuardVerdict({ loading, draftsSeeded }).allowed &&
		saveState !== "saving";

	const save = useCallback(async () => {
		// ЗАПРЕТ СОХРАНЕНИЯ НЕПРОЧИТАННЫХ НАСТРОЕК. Проверка стоит до fetch
		// намеренно: панель разблокирует кнопку по своему признаку изменений, а
		// цена ошибки здесь — стёртые Phone Number ID, verify-токен, список
		// функций и роутинг.
		const verdict = whatsappSaveGuardVerdict({ loading, draftsSeeded });
		if (!verdict.allowed) {
			setSaveState("error");
			setSaveError(verdict.message);
			return;
		}
		setSaveState("saving");
		setSaveError(null);
		try {
			const body: Record<string, unknown> = {
				phoneNumberId: phoneNumberIdDraft.trim() || null,
				webhookVerifyToken: webhookVerifyTokenDraft.trim() || null,
				isActive: isActiveDraft,
				enabledFeatures: enabledFeaturesDraft,
				staffRouting: staffRoutingDraft,
			};
			if (accessTokenDraft.trim()) {
				body.accessToken = accessTokenDraft.trim();
			}
			const res = await fetch("/api/whatsapp/settings", {
				method: "PUT",
				headers: {
					...denteAdminSecretRequestHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify(body),
			});
			if (res.ok) {
				setSaveState("saved");
				setAccessTokenDraft("");
				await load();
				await checkStatus();
				setTimeout(() => setSaveState("idle"), 2000);
			} else {
				setSaveError(await whatsappSaveFailureMessage(res));
				setSaveState("error");
			}
		} catch (err) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(err as { status?: number })?.status ?? null,
				),
				"error",
			);
			// Текст исключения наружу не идёт ни при каких условиях: он английский.
			logger.error("[настройки WhatsApp] сохранение не дошло до сервера", err);
			setSaveError(actionFailureToast("Настройки WhatsApp не сохранены", null));
			setSaveState("error");
		}
	}, [
		phoneNumberIdDraft,
		accessTokenDraft,
		webhookVerifyTokenDraft,
		isActiveDraft,
		enabledFeaturesDraft,
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
		phoneNumberIdDraft,
		setPhoneNumberIdDraft,
		accessTokenDraft,
		setAccessTokenDraft,
		webhookVerifyTokenDraft,
		setWebhookVerifyTokenDraft,
		isActiveDraft,
		setIsActiveDraft,
		enabledFeaturesDraft,
		setEnabledFeaturesDraft,
		staffRoutingDraft,
		setStaffRoutingDraft,
		save,
		reload: load,
	};
}
