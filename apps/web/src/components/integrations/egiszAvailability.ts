/**
 * ЕГИСЗ: РАЗДЕЛЕНИЕ ТРЁХ СОСТОЯНИЙ, КОТОРЫЕ ЭКРАН РАНЬШЕ СМЕШИВАЛ.
 *
 * Замер 2026-07-28, живые запросы к работающему серверу с подписанным токеном кабинета:
 *   GET  /api/clinical/egisz/integration-status     -> 200, configured:false,
 *        capabilities.remdTransmission:false, missingConfiguration:
 *        [EGISZ_N3_BASE_URL, EGISZ_N3_GUID, EGISZ_N3_LPU_ID, EGISZ_FRMO_ID]
 *   GET  /api/egisz/logs/<id>                       -> 404 {"error":"Not Found"}
 *   POST /api/egisz/send                            -> 404 {"error":"Not Found"}
 *   GET  /api/integrations/egisz-blank-permissions   -> 404 {"error":"Not Found"}
 * В apps/api/src нет ни одного setNotFoundHandler, поэтому тело 404 у Fastify
 * стабильно содержит английское "Not Found" в поле error.
 *
 * ЧТО БЫЛО СЛОМАНО
 *   1. EgiszMonitor.tsx:38 — `if (res.ok) {` без ветки else. Ответ 404 молча
 *      проглатывался, состояние оставалось начальным «Pending», и панель писала
 *      «Данные приема готовы к отправке» над несуществующим маршрутом, оставляя синюю
 *      кнопку «Отправить в ЕГИСЗ» живой. Клиника считала, что отчитывается в Минздрав
 *      нажатием кнопки. Клиника, уверенная, что отчиталась, — это юридический риск.
 *   2. EgiszMonitor.tsx:85 — `data.error || "Неизвестная ошибка"`. У ответа 404 поле
 *      error равно "Not Found", то есть непустое, поэтому русский запасной текст не
 *      подставлялся никогда, и врач читал «Ошибка: Not Found».
 *   3. EgiszBlankPermissionsWidget.tsx:20-22 — тело читалось без проверки res.ok,
 *      объект ошибки не проходил Array.isArray и превращался в пустой список, а пустой
 *      список печатал «Правила выгрузки бланков ЕГИСЗ не настроены». Администратора
 *      отправляли настраивать раздел, которого сервер не отдаёт вообще.
 *
 * ПРАВИЛА ЭТОГО МОДУЛЯ
 *   — «не настроено», «нет данных» и «раздел недоступен» — три разных состояния, и они
 *     не сливаются ни в одной ветке;
 *   — латиница на экран не попадает: серверный текст проходит только через
 *     russianServerText(), который пропускает строку лишь при наличии кириллицы и полном
 *     отсутствии латинских букв. «Ошибка: Not Found» невозможна по построению, а не
 *     маловероятна;
 *   — неизвестное значение не подменяется выдуманным умолчанием: тело, не отвечающее
 *     контракту, даёт отдельное состояние "unreadable", а не configured:false;
 *   — «Повторить» предлагается только там, где повтор физически может помочь. Кнопка
 *     «Повторить» рядом с «сервер не отдаёт этот раздел» — ложь в интерфейсе;
 *   — отправка разрешена только когда сервер сам подтвердил, что она возможна.
 *
 * ЧЕГО ЗДЕСЬ НЕТ И ПОЧЕМУ. Транспорта в РЭМД, подписи УКЭП, модели согласия пациента на
 * передачу данных и любых сроков отчётности. Ни одного из этих контрактов в проекте не
 * существует, а сроки, установленные законом, из репозитория не проверяются, поэтому они
 * не называются нигде.
 *
 * Тексты живут здесь, а не в общем словаре (workspaceUiLabels.ts): словарь не входит в
 * область правки этого пакета. Это осознанный долг, он записан в handoff.
 */

/** Тон состояния. Компонент превращает его в цвет и значок. */
export type EgiszTone = "neutral" | "info" | "warning" | "danger" | "success";

/**
 * Почему запрос не дал данных. Отдельный тип, чтобы ни одна ветка не могла
 * перепутать «сервер не отдаёт раздел» с «раздел пуст».
 */
export type EgiszEndpointProblem =
	| { readonly kind: "missing" }
	| { readonly kind: "unauthorized" }
	| { readonly kind: "server_error"; readonly httpStatus: number }
	| { readonly kind: "unreadable" }
	| { readonly kind: "network" };

export type EgiszEndpointOutcome<T> =
	| { readonly kind: "ok"; readonly data: T }
	| EgiszEndpointProblem;

/**
 * Ответ, который сервер уже отдаёт честно:
 * GET /api/clinical/egisz/integration-status (apps/api/src/routes/egisz.ts:79).
 */
export interface EgiszIntegrationStatus {
	readonly configured: boolean;
	readonly remdTransmission: boolean;
	readonly ukepSigning: boolean;
	readonly cdaGeneration: boolean;
	readonly missingConfiguration: readonly string[];
}

/** Состояние выгрузки конкретного приёма. Значения статуса — как в таблице egisz_logs. */
export interface EgiszVisitTransmission {
	readonly status: "Pending" | "Sent" | "Error" | "Accepted";
	readonly transactionId: string | null;
	readonly errorMessage: string | null;
	/**
	 * Предпросмотр сгенерированного CDA XML. Живёт в errorDetails журнала и
	 * сохранён здесь сознательно: прежняя панель его показывала, и выбросить
	 * этот путь означало бы удалить работающий элемент, а не починить ложь.
	 */
	readonly xmlPreview: string | null;
}

export type EgiszPanelStateKind =
	| "loading"
	| "unavailable"
	| "unauthorized"
	| "network"
	| "server_error"
	| "unreadable"
	| "not_configured"
	| "transmission_unavailable"
	| "empty"
	| "queued"
	| "sent"
	| "accepted"
	| "failed";

export interface EgiszPanelState {
	readonly kind: EgiszPanelStateKind;
	readonly tone: EgiszTone;
	/** Короткая правда о состоянии отчётности. Только кириллица. */
	readonly headline: string;
	/** Что это значит и что делать дальше. Только кириллица. */
	readonly detail: string;
	/**
	 * Имена переменных окружения, которых не хватает. Это технические
	 * идентификаторы, а не фраза: они показываются отдельным блоком и никогда не
	 * вставляются внутрь русского предложения.
	 */
	readonly missingConfiguration: readonly string[];
	/** Можно ли нажимать «Отправить в ЕГИСЗ». */
	readonly canTransmit: boolean;
	/** Видимая рядом с кнопкой причина запрета. Пусто, когда отправка разрешена. */
	readonly transmitBlockedReason: string;
	/** Имеет ли смысл предлагать повторную проверку. */
	readonly canRetryLoad: boolean;
	/** Идентификатор транзакции — тоже технический, отдельным полем. */
	readonly transactionId: string | null;
	/**
	 * Предпросмотр CDA XML. Технические данные, а не сообщение пользователю:
	 * латиница внутри XML — это разметка документа, и запрет на латиницу в
	 * headline/detail/transmitBlockedReason на него не распространяется.
	 */
	readonly xmlPreview: string | null;
}

/**
 * Пропускает серверный текст на экран только если он действительно русский.
 * Требуется кириллица И отсутствие латинских букв: строка вида «Ошибка Not Found»
 * содержит кириллицу, но всё равно вынесла бы английское слово в интерфейс.
 */
export function russianServerText(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	if (trimmed.length === 0) return null;
	if (!/[А-Яа-яЁё]/.test(trimmed)) return null;
	if (/[A-Za-z]/.test(trimmed)) return null;
	return trimmed;
}

/**
 * Классификация неуспешного ответа по коду. Тело при этом не читается — именно
 * чтение тела до проверки res.ok и вынесло «Not Found» на экран.
 *
 * 404, 405 и 501 значат одно и то же для пользователя: этого раздела на сервере нет.
 */
export function classifyFailedHttpStatus(httpStatus: number): EgiszEndpointProblem {
	if (httpStatus === 404 || httpStatus === 405 || httpStatus === 501) {
		return { kind: "missing" };
	}
	if (httpStatus === 401 || httpStatus === 403) {
		return { kind: "unauthorized" };
	}
	return { kind: "server_error", httpStatus };
}

/**
 * Разбор тела /integration-status. Отсутствующее поле — это "unreadable",
 * а не configured:false: подставить здесь false значило бы соврать про настройку.
 */
export function readIntegrationStatus(
	raw: unknown,
): EgiszEndpointOutcome<EgiszIntegrationStatus> {
	if (!raw || typeof raw !== "object") return { kind: "unreadable" };
	const body = raw as Record<string, unknown>;
	const capabilities = body.capabilities;
	if (typeof body.configured !== "boolean") return { kind: "unreadable" };
	if (!capabilities || typeof capabilities !== "object") return { kind: "unreadable" };
	const caps = capabilities as Record<string, unknown>;
	if (
		typeof caps.remdTransmission !== "boolean" ||
		typeof caps.ukepSigning !== "boolean" ||
		typeof caps.cdaGeneration !== "boolean"
	) {
		return { kind: "unreadable" };
	}
	const missingRaw = body.missingConfiguration;
	const missing = Array.isArray(missingRaw)
		? missingRaw.filter((item): item is string => typeof item === "string")
		: [];
	return {
		kind: "ok",
		data: {
			configured: body.configured,
			remdTransmission: caps.remdTransmission,
			ukepSigning: caps.ukepSigning,
			cdaGeneration: caps.cdaGeneration,
			missingConfiguration: missing,
		},
	};
}

const TRANSMISSION_STATUSES = ["Pending", "Sent", "Error", "Accepted"] as const;

/**
 * Разбор журнала выгрузок по приёму. Отсутствие записи — это законное `null`
 * («нет данных»), а вот тело неизвестной формы — "unreadable".
 */
export function readVisitTransmission(
	raw: unknown,
	visitId: string,
): EgiszEndpointOutcome<EgiszVisitTransmission | null> {
	if (!raw || typeof raw !== "object") return { kind: "unreadable" };
	const logs = (raw as Record<string, unknown>).logs;
	if (!Array.isArray(logs)) return { kind: "unreadable" };
	const match = logs.find(
		(item) =>
			item &&
			typeof item === "object" &&
			(item as Record<string, unknown>).visitId === visitId,
	);
	if (!match) return { kind: "ok", data: null };
	const row = match as Record<string, unknown>;
	const status = TRANSMISSION_STATUSES.find((known) => known === row.status);
	if (!status) return { kind: "unreadable" };
	const details = row.errorDetails;
	const detailsObject =
		details && typeof details === "object" ? (details as Record<string, unknown>) : null;
	const errorMessage =
		typeof details === "string"
			? details
			: typeof detailsObject?.message === "string"
				? detailsObject.message
				: null;
	const xmlPreview =
		typeof detailsObject?.xmlPreview === "string" && detailsObject.xmlPreview.length > 0
			? detailsObject.xmlPreview
			: null;
	return {
		kind: "ok",
		data: {
			status,
			transactionId:
				typeof row.transactionId === "string" && row.transactionId.length > 0
					? row.transactionId
					: null,
			errorMessage,
			xmlPreview,
		},
	};
}

/**
 * Старшинство неудач. «Сервера не отдаёт раздел» стоит первым сознательно: это
 * единственный факт, который нельзя показывать как исправимый пользователем.
 */
const PROBLEM_SEVERITY: readonly EgiszEndpointProblem["kind"][] = [
	"missing",
	"unauthorized",
	"network",
	"server_error",
	"unreadable",
];

function worstProblem(
	outcomes: readonly EgiszEndpointOutcome<unknown>[],
): EgiszEndpointProblem | null {
	let worst: EgiszEndpointProblem | null = null;
	let worstRank = PROBLEM_SEVERITY.length;
	for (const outcome of outcomes) {
		if (outcome.kind === "ok") continue;
		const rank = PROBLEM_SEVERITY.indexOf(outcome.kind);
		if (rank >= 0 && rank < worstRank) {
			worstRank = rank;
			worst = outcome;
		}
	}
	return worst;
}

export interface EgiszPanelInput {
	/** null означает «ещё грузится», а не «пусто». */
	readonly statusOutcome: EgiszEndpointOutcome<EgiszIntegrationStatus> | null;
	readonly journalOutcome: EgiszEndpointOutcome<EgiszVisitTransmission | null> | null;
}

/**
 * Единственное место, где решается, что показать и можно ли отправлять.
 * Компонент не имеет права принимать это решение сам.
 */
export function resolveEgiszPanelState(input: EgiszPanelInput): EgiszPanelState {
	const base = {
		missingConfiguration: [] as readonly string[],
		transactionId: null as string | null,
		xmlPreview: null as string | null,
	};

	if (input.statusOutcome === null || input.journalOutcome === null) {
		return {
			...base,
			kind: "loading",
			tone: "neutral",
			headline: "Проверяем состояние отчётности в ЕГИСЗ",
			detail: "Читаем настройки подключения и журнал выгрузок по этому приёму.",
			canTransmit: false,
			transmitBlockedReason: "Подождите, идёт проверка",
			canRetryLoad: false,
		};
	}

	const problem = worstProblem([input.statusOutcome, input.journalOutcome]);
	if (problem) return problemState(problem, base);

	const status = input.statusOutcome.kind === "ok" ? input.statusOutcome.data : null;
	const journal = input.journalOutcome.kind === "ok" ? input.journalOutcome.data : null;
	if (!status) {
		// Недостижимо: worstProblem уже вернул бы неудачу. Оставлено как явный
		// отказ вместо молчаливого «готово к отправке».
		return problemState({ kind: "unreadable" }, base);
	}

	if (!status.configured) {
		return {
			...base,
			kind: "not_configured",
			tone: "warning",
			headline: "Отчёт в ЕГИСЗ не отправлен: подключение не настроено",
			detail:
				"Программа не подключена к государственной системе, поэтому ни один документ " +
				"по этому приёму в Минздрав не уходил. Чтобы подключение появилось, тому, кто " +
				"настраивал программу, нужно заполнить перечисленные ниже настройки сервера.",
			missingConfiguration: status.missingConfiguration,
			canTransmit: false,
			transmitBlockedReason: "Отправка невозможна: подключение к ЕГИСЗ не настроено",
			canRetryLoad: true,
		};
	}

	if (!status.remdTransmission) {
		return {
			...base,
			kind: "transmission_unavailable",
			tone: "warning",
			headline: "Подключение задано, но передача документов ещё не работает",
			detail:
				"Настройки шлюза заполнены, однако сама передача документов и подпись " +
				"усиленной квалифицированной подписью в программе пока не реализованы. " +
				"Документ по приёму не отправлен и не уйдёт, пока это не появится.",
			canTransmit: false,
			transmitBlockedReason: "Отправка невозможна: передача в РЭМД не реализована",
			canRetryLoad: false,
		};
	}

	if (!journal) {
		return {
			...base,
			kind: "empty",
			tone: "info",
			headline: "Выгрузок по этому приёму ещё не было",
			detail:
				"Подключение к ЕГИСЗ настроено и отвечает. По этому приёму документ пока не " +
				"отправляли — нажмите «Отправить в ЕГИСЗ», когда приём заполнен.",
			canTransmit: true,
			transmitBlockedReason: "",
			canRetryLoad: true,
		};
	}

	if (journal.status === "Accepted") {
		return {
			...base,
			kind: "accepted",
			tone: "success",
			headline: "Документ принят в ЕГИСЗ",
			detail:
				"Выгрузка по этому приёму подтверждена государственной системой. " +
				"Отправлять повторно не нужно.",
			transactionId: journal.transactionId,
			xmlPreview: journal.xmlPreview,
			canTransmit: false,
			transmitBlockedReason: "Отправка не нужна: документ уже принят",
			canRetryLoad: true,
		};
	}

	if (journal.status === "Sent") {
		return {
			...base,
			kind: "sent",
			tone: "info",
			headline: "Документ отправлен, ответ ещё не пришёл",
			detail:
				"Отправка прошла, но подтверждение из ЕГИСЗ пока не получено. Пока ответа нет, " +
				"документ не считается принятым. Нажмите «Проверить снова», чтобы перечитать " +
				"состояние.",
			transactionId: journal.transactionId,
			xmlPreview: journal.xmlPreview,
			canTransmit: false,
			transmitBlockedReason: "Повторная отправка заблокирована: документ уже ушёл",
			canRetryLoad: true,
		};
	}

	if (journal.status === "Pending") {
		return {
			...base,
			kind: "queued",
			tone: "info",
			headline: "Документ ждёт отправки",
			detail:
				"Документ по этому приёму поставлен в очередь и ещё не ушёл в Минздрав. " +
				"Нажмите «Проверить снова», чтобы узнать, изменилось ли состояние.",
			transactionId: journal.transactionId,
			xmlPreview: journal.xmlPreview,
			canTransmit: false,
			transmitBlockedReason: "Отправка невозможна: документ уже в очереди",
			canRetryLoad: true,
		};
	}

	return {
		...base,
		kind: "failed",
		tone: "danger",
		headline: "ЕГИСЗ отклонил документ",
		detail:
			russianServerText(journal.errorMessage) ??
			"Причину сервер не сообщил. Проверьте, что в приёме заполнены диагноз и данные " +
				"пациента, и отправьте документ заново.",
		transactionId: journal.transactionId,
		xmlPreview: journal.xmlPreview,
		canTransmit: true,
		transmitBlockedReason: "",
		canRetryLoad: true,
	};
}

function problemState(
	problem: EgiszEndpointProblem,
	base: {
		missingConfiguration: readonly string[];
		transactionId: string | null;
		xmlPreview: string | null;
	},
): EgiszPanelState {
	switch (problem.kind) {
		case "missing":
			return {
				...base,
				kind: "unavailable",
				tone: "neutral",
				headline: "Раздел ЕГИСЗ на этом сервере недоступен",
				detail:
					"Сервер программы ответил, что такого раздела у него нет. Это не ошибка " +
					"настройки: отправлять пока просто некуда, и ни один документ по этому приёму " +
					"в Минздрав не уходил. Настраивать здесь нечего — раздел должен появиться в " +
					"самой программе.",
				canTransmit: false,
				transmitBlockedReason: "Отправка невозможна: сервер не отдаёт этот раздел",
				canRetryLoad: false,
			};
		case "unauthorized":
			return {
				...base,
				kind: "unauthorized",
				tone: "warning",
				headline: "Нужен вход в рабочий кабинет клиники",
				detail:
					"Программа не смогла подтвердить права на чтение этого раздела, поэтому " +
					"состояние отчётности неизвестно. Войдите в кабинет клиники заново и " +
					"откройте приём снова.",
				canTransmit: false,
				transmitBlockedReason: "Отправка невозможна: права не подтверждены",
				canRetryLoad: false,
			};
		case "network":
			return {
				...base,
				kind: "network",
				tone: "danger",
				headline: "Нет связи с сервером программы",
				detail:
					"Запрос не дошёл до сервера, поэтому состояние отчётности неизвестно. " +
					"Проверьте, что сервер программы запущен и сеть на месте, затем нажмите " +
					"«Проверить снова».",
				canTransmit: false,
				transmitBlockedReason: "Отправка невозможна: сервер недоступен",
				canRetryLoad: true,
			};
		case "server_error":
			return {
				...base,
				kind: "server_error",
				tone: "danger",
				headline: "Сервер программы ответил ошибкой",
				detail:
					"Раздел на сервере есть, но отдать его не удалось, поэтому состояние " +
					"отчётности неизвестно. Нажмите «Проверить снова» через минуту. Если ошибка " +
					"повторяется, покажите это сообщение тому, кто настраивал программу.",
				canTransmit: false,
				transmitBlockedReason: "Отправка невозможна: сервер ответил ошибкой",
				canRetryLoad: true,
			};
		case "unreadable":
			return {
				...base,
				kind: "unreadable",
				tone: "warning",
				headline: "Ответ сервера не разобран",
				detail:
					"Сервер ответил успешно, но в незнакомом виде: похоже, версии сервера и " +
					"программы не совпадают. Состояние отчётности в ЕГИСЗ неизвестно, поэтому " +
					"отправка заблокирована. Покажите это сообщение тому, кто обновлял программу.",
				canTransmit: false,
				transmitBlockedReason: "Отправка невозможна: состояние неизвестно",
				canRetryLoad: false,
			};
	}
}

/* ─── Справочник правил выгрузки бланков ─────────────────────────────────────── */

export type EgiszCatalogStateKind =
	| "loading"
	| "unavailable"
	| "unauthorized"
	| "network"
	| "server_error"
	| "unreadable"
	| "empty"
	| "ready";

export interface EgiszCatalogState {
	readonly kind: EgiszCatalogStateKind;
	readonly tone: EgiszTone;
	readonly headline: string;
	readonly detail: string;
	readonly canRetryLoad: boolean;
}

/**
 * Состояние справочника правил выгрузки бланков.
 *
 * Здесь и находился самый вредный вариант лжи: пустой список и отсутствующий раздел
 * выглядели одинаково, и администратору предлагали «настроить» то, чего сервер не
 * отдаёт. Теперь «Правила пока не заданы» появляется только после настоящего 200.
 */
export function resolveEgiszCatalogState(
	outcome: EgiszEndpointOutcome<readonly unknown[]> | null,
): EgiszCatalogState {
	if (outcome === null) {
		return {
			kind: "loading",
			tone: "neutral",
			headline: "Загружаем правила выгрузки бланков",
			detail: "Читаем справочник с сервера программы.",
			canRetryLoad: false,
		};
	}

	switch (outcome.kind) {
		case "ok":
			return outcome.data.length === 0
				? {
						kind: "empty",
						tone: "info",
						headline: "Правила выгрузки бланков пока не заданы",
						detail:
							"Раздел работает, но ни одного правила ещё не создано. Пока правил нет, " +
							"поля бланков в ЕГИСЗ не выгружаются.",
						canRetryLoad: true,
					}
				: {
						kind: "ready",
						tone: "success",
						headline: "Правила выгрузки бланков заданы",
						detail:
							"Ниже перечислены поля бланков и текущее разрешение на выгрузку каждого " +
							"из них в ЕГИСЗ.",
						canRetryLoad: true,
					};
		case "missing":
			return {
				kind: "unavailable",
				tone: "neutral",
				headline: "Раздел правил выгрузки на этом сервере недоступен",
				detail:
					"Сервер программы ответил, что такого раздела у него нет. Настраивать нечего: " +
					"эта версия программы правила выгрузки бланков не хранит, и ни одно поле " +
					"бланка в ЕГИСЗ не уходило.",
				canRetryLoad: false,
			};
		case "unauthorized":
			return {
				kind: "unauthorized",
				tone: "warning",
				headline: "Нужен вход в рабочий кабинет клиники",
				detail:
					"Программа не смогла подтвердить права на чтение справочника. Войдите в " +
					"кабинет клиники заново и откройте настройки снова.",
				canRetryLoad: false,
			};
		case "network":
			return {
				kind: "network",
				tone: "danger",
				headline: "Нет связи с сервером программы",
				detail:
					"Запрос не дошёл до сервера, поэтому правила прочитать не удалось. Проверьте, " +
					"что сервер программы запущен, затем нажмите «Проверить снова».",
				canRetryLoad: true,
			};
		case "server_error":
			return {
				kind: "server_error",
				tone: "danger",
				headline: "Сервер программы ответил ошибкой",
				detail:
					"Раздел на сервере есть, но отдать справочник не удалось. Нажмите «Проверить " +
					"снова» через минуту. Если ошибка повторяется, покажите это сообщение тому, " +
					"кто настраивал программу.",
				canRetryLoad: true,
			};
		case "unreadable":
			return {
				kind: "unreadable",
				tone: "warning",
				headline: "Ответ сервера не разобран",
				detail:
					"Сервер ответил успешно, но прислал не список правил. Похоже, версии сервера " +
					"и программы не совпадают — покажите это сообщение тому, кто обновлял " +
					"программу.",
				canRetryLoad: false,
			};
	}
}
